import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol, Square } from '../core/types';
import type { Theme } from '../themes/theme';
import { BoardView, squareToWorld } from './board';
import { Effects } from './effects';
import { loadModelPieces } from './modelPieces';
import { classicPieces, createPieceMaterials, PieceView, type PieceBuilder, type PieceMaterials } from './pieces';
import { ease, Tweener } from './tweens';

export const TABLE_Y = -0.31;

/** Número estável a partir de um texto (para variar detalhes das peças). */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Cena 3D: tabuleiro, peças, câmera e todas as animações. */
export class GameView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  readonly controls: OrbitControls;
  board!: BoardView;
  readonly tweens = new Tweener();
  readonly effects: Effects;
  /** 1 = normal; menor que 1 = câmera lenta. */
  timeScale = 1;
  /** Ganchos para quem quiser reagir (som, frases...) sem a cena saber disso. */
  hooks: {
    onHop?: () => void;
    onLand?: () => void;
    onImpact?: (victim: PieceView, at: THREE.Vector3) => void;
    /** Modelos de um tema terminaram (ou falharam) de carregar. */
    onModelsLoaded?: (theme: Theme, error?: unknown) => void;
  } = {};

  private theme!: Theme;
  private builder: PieceBuilder = classicPieces;
  private lastChess: Chess | null = null;
  /** Os modelos chegaram: refaz as peças assim que nenhuma animação estiver rodando. */
  private needsResync = false;
  private mats!: PieceMaterials;
  private table: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  private decor = new THREE.Group();
  private graveCounter = 0;
  private pieces = new Map<Square, PieceView>();
  private graveyard: Record<Color, PieceView[]> = { w: [], b: [] };
  private raycaster = new THREE.Raycaster();
  private clock = new THREE.Clock();
  private shake = 0;
  private cameraAnimating = false;

  constructor(
    private container: HTMLElement,
    theme: Theme,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 9.5, 9);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 22;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);

    this.addLights();
    this.effects = new Effects(this.scene);

    this.table = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    );
    this.table.rotation.x = -Math.PI / 2;
    this.table.position.y = TABLE_Y;
    this.table.receiveShadow = true;
    this.scene.add(this.table, this.decor);

    this.applyTheme(theme);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Troca cores, tabuleiro, materiais e decoração. As peças são refeitas no próximo `syncFrom`. */
  private applyTheme(theme: Theme): void {
    this.theme = theme;
    const c = theme.colors;
    this.scene.background = new THREE.Color(c.background);
    this.scene.fog = new THREE.Fog(c.background, 18, 40);
    this.table.material.color.set(c.table);

    if (this.board) this.scene.remove(this.board.group);
    this.board = new BoardView(theme);
    this.scene.add(this.board.group);

    this.mats = createPieceMaterials(c.whitePiece, c.blackPiece);

    // Temas com modelos 3D: enquanto o arquivo carrega, usa as peças clássicas.
    this.builder = theme.pieces ?? classicPieces;
    if (theme.models) {
      loadModelPieces(theme.models).then(
        (builder) => {
          if (this.theme !== theme) return; // o jogador já trocou de tema
          this.builder = builder;
          this.needsResync = true;
          this.hooks.onModelsLoaded?.(theme);
        },
        (err) => this.hooks.onModelsLoaded?.(theme, err),
      );
    }

    this.decor.clear();
    theme.decorate?.(this.decor, TABLE_Y);
    this.decor.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
    });
  }

  /** Troca o tema no meio da partida, mantendo a posição. */
  setTheme(theme: Theme, chess: Chess): void {
    this.applyTheme(theme);
    this.syncFrom(chess);
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight('#fff4e0', '#3a2f55', 1.1));
    const sun = new THREE.DirectionalLight('#ffffff', 2.2);
    sun.position.set(5, 12, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera;
    s.left = s.bottom = -8;
    s.right = s.top = 8;
    s.near = 1;
    s.far = 30;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
  }

  private resize(): void {
    const { clientWidth: w, clientHeight: h } = this.container;
    if (w === 0 || h === 0) return; // aba oculta: espera ter tamanho de verdade
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    // Em telas estreitas (celular em pé), afasta a câmera para caber o tabuleiro.
    this.camera.fov = w / h < 0.8 ? 62 : 42;
    this.camera.updateProjectionMatrix();
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 1 / 20) * this.timeScale;
    this.tweens.tick(dt);
    if (this.needsResync && !this.tweens.busy && this.lastChess) this.syncFrom(this.lastChess);
    if (!this.cameraAnimating) this.controls.update();

    for (const p of this.allPieces()) p.update(dt, this.camera);
    this.effects.update(dt);

    // Tremidinha de câmera nas capturas.
    let offset: THREE.Vector3 | null = null;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.12;
      offset = new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, 0);
      this.camera.position.add(offset);
    }
    this.renderer.render(this.scene, this.camera);
    if (offset) this.camera.position.sub(offset);
  }

  private *allPieces(): Iterable<PieceView> {
    yield* this.pieces.values();
    yield* this.graveyard.w;
    yield* this.graveyard.b;
  }

  private spawn(type: PieceSymbol, color: Color, square: Square | null): PieceView {
    const seed = square ? hash(square + type) : hash(`grave${this.graveCounter++}${type}`);
    const watches = this.theme.facesCamera?.includes(type) ?? false;
    const view = new PieceView(type, color, square, this.mats, this.builder, seed, watches);
    // Já nasce olhando para a câmera, sem girar na frente de todo mundo.
    if (watches && square) {
      const p = squareToWorld(square);
      view.root.rotation.y = Math.atan2(this.camera.position.x - p.x, this.camera.position.z - p.z);
    }
    if (square) squareToWorld(square, view.root.position);
    this.scene.add(view.root);
    return view;
  }

  // ------------------------------------------------------------------ estado

  /** Reconstrói tudo a partir do estado do jogo (novo jogo, desfazer...). */
  syncFrom(chess: Chess): void {
    this.lastChess = chess;
    this.needsResync = false;
    for (const p of this.allPieces()) this.scene.remove(p.root);
    this.pieces.clear();
    this.graveyard = { w: [], b: [] };
    this.effects.clear();
    this.timeScale = 1;

    for (const row of chess.board()) {
      for (const cell of row) {
        if (cell) this.pieces.set(cell.square, this.spawn(cell.type, cell.color, cell.square));
      }
    }
    for (const m of chess.history({ verbose: true })) {
      if (!m.captured) continue;
      const victimColor: Color = m.color === 'w' ? 'b' : 'w';
      const view = this.spawn(m.captured, victimColor, null);
      this.placeInGraveyard(view, this.graveyardSlot(victimColor), true);
    }
  }

  pieceAt(square: Square): PieceView | undefined {
    return this.pieces.get(square);
  }

  setSelected(square: Square | null): void {
    for (const [sq, p] of this.pieces) p.selected = sq === square;
  }

  // --------------------------------------------------------------- animações

  async animateMove(move: Move, opts: { slowMo?: boolean } = {}): Promise<void> {
    const mover = this.pieces.get(move.from);
    if (!mover) return;
    mover.selected = false;
    this.pieces.delete(move.from);
    this.hooks.onHop?.();
    if (opts.slowMo) this.timeScale = 0.3;

    // Quem vai ser capturado? (no en passant não é a casa de destino)
    let victimSquare: Square | null = null;
    if (move.captured) {
      victimSquare = move.isEnPassant() ? (`${move.to[0]}${move.from[1]}` as Square) : move.to;
    }
    const victim = victimSquare ? this.pieces.get(victimSquare) : undefined;
    if (victimSquare) this.pieces.delete(victimSquare);

    const jobs: Promise<void>[] = [];
    const hop = move.piece === 'n' ? 1.3 : 0.6;
    jobs.push(
      this.hop(mover, move.to, hop, 0.5, (t) => {
        if (victim && t > 0.8 && victim.alive) this.launch(victim);
      }),
    );

    // Roque: a torre pula por cima do rei.
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      const rank = move.from[1];
      const [rFrom, rTo] = move.isKingsideCastle() ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`];
      const rook = this.pieces.get(rFrom as Square);
      if (rook) {
        this.pieces.delete(rFrom as Square);
        this.pieces.set(rTo as Square, rook);
        rook.square = rTo as Square;
        jobs.push(this.tweens.wait(0.15).then(() => this.hop(rook, rTo as Square, 1.1, 0.5)));
      }
    }

    this.pieces.set(move.to, mover);
    mover.square = move.to;
    await Promise.all(jobs);
    if (victim && victim.alive) this.launch(victim);
    this.hooks.onLand?.();
    if (opts.slowMo) {
      await this.tweens.wait(0.25);
      this.timeScale = 1;
    }

    if (move.promotion) await this.promote(mover, move.promotion);
  }

  private hop(p: PieceView, to: Square, height: number, duration: number, onT?: (t: number) => void) {
    const from = p.root.position.clone();
    const dest = squareToWorld(to);
    const dist = from.distanceTo(dest);
    const dur = duration + dist * 0.04;
    return this.tweens.add(dur, (t) => {
      const e = ease.inOutCubic(t);
      p.root.position.lerpVectors(from, dest, e);
      p.root.position.y = Math.sin(Math.PI * t) * (height + dist * 0.05);
      onT?.(t);
    });
  }

  /** A vítima sai rodopiando e cai deitada ao lado do tabuleiro. */
  private launch(victim: PieceView): void {
    victim.alive = false;
    victim.selected = false;
    victim.square = null;
    this.shake = 1;
    this.hooks.onImpact?.(victim, victim.root.position.clone());
    const slot = this.graveyardSlot(victim.color);
    this.graveyard[victim.color].push(victim);
    this.placeInGraveyard(victim, slot, false);
  }

  private graveyardSlot(color: Color): number {
    return this.graveyard[color].length;
  }

  private graveyardPosition(color: Color, slot: number): THREE.Vector3 {
    // Peças brancas capturadas ficam à direita das Brancas; pretas, à esquerda.
    const side = color === 'w' ? 1 : -1;
    const col = slot % 2;
    const row = Math.floor(slot / 2);
    return new THREE.Vector3(side * (5.1 + col * 0.8), TABLE_Y + 0.17, side * (3.3 - row * 0.95));
  }

  private placeInGraveyard(p: PieceView, slot: number, instant: boolean): void {
    p.alive = false;
    const dest = this.graveyardPosition(p.color, slot);
    const finalRot = new THREE.Euler(Math.PI / 2, Math.random() * Math.PI * 2, 0, 'YXZ');
    if (!this.graveyard[p.color].includes(p)) this.graveyard[p.color].push(p);

    if (instant) {
      p.root.position.copy(dest);
      p.root.rotation.copy(finalRot);
      p.root.scale.setScalar(0.85);
      return;
    }

    const from = p.root.position.clone();
    const fromRot = p.root.rotation.clone();
    const spinsX = 2 + Math.floor(Math.random() * 3);
    const spinsZ = Math.floor(Math.random() * 3) - 1;
    const peak = 3 + Math.random() * 1.5;
    void this.tweens.add(1.2, (t) => {
      p.root.position.lerpVectors(from, dest, t);
      p.root.position.y = THREE.MathUtils.lerp(from.y, dest.y, t) + Math.sin(Math.PI * t) * peak;
      p.root.rotation.set(
        THREE.MathUtils.lerp(fromRot.x, finalRot.x + spinsX * Math.PI * 2, t),
        THREE.MathUtils.lerp(fromRot.y, finalRot.y, t),
        THREE.MathUtils.lerp(fromRot.z, spinsZ * Math.PI * 2, t),
        'YXZ',
      );
      p.root.scale.setScalar(THREE.MathUtils.lerp(1, 0.85, t));
    });
  }

  private async promote(pawn: PieceView, to: PieceSymbol): Promise<void> {
    const square = pawn.square!;
    await this.tweens.add(0.35, (t) => {
      pawn.root.scale.setScalar(1 - ease.inQuad(t));
      pawn.root.rotation.y += 0.4;
    });
    this.scene.remove(pawn.root);
    const fresh = this.spawn(to, pawn.color, square);
    this.pieces.set(square, fresh);
    await this.tweens.add(0.45, (t) => fresh.root.scale.setScalar(Math.max(0.001, ease.outBack(t))));
  }

  /** Gira a câmera para o lado de quem joga. */
  async faceSide(color: Color): Promise<void> {
    const target = this.controls.target;
    const offset = this.camera.position.clone().sub(target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    const goal = color === 'w' ? 0 : Math.PI;
    let diff = goal - sph.theta;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    if (Math.abs(diff) < 0.01) return;
    const start = sph.theta;
    this.cameraAnimating = true;
    await this.tweens.add(1.0, (t) => {
      sph.theta = start + diff * ease.inOutCubic(t);
      this.camera.position.copy(target).add(new THREE.Vector3().setFromSpherical(sph));
      this.camera.lookAt(target);
    });
    this.cameraAnimating = false;
  }

  // --------------------------------------------------------------- reações

  private piecesOf(color: Color): PieceView[] {
    return [...this.pieces.values()].filter((p) => p.color === color);
  }

  /** A "torcida": um lado comemora, o outro leva susto. */
  crowdReact(color: Color, kind: 'cheer' | 'shock' | 'bigCheer'): void {
    for (const p of this.piecesOf(color)) {
      const delay = Math.random() * 0.25;
      if (kind === 'shock') {
        p.shiver(0.6);
      } else {
        p.jump(kind === 'bigCheer' ? 4.5 : 2.8, delay);
      }
    }
  }

  /** O rei da cor indicada treme enquanto estiver em xeque. */
  setTrembling(kingColor: Color | null): void {
    for (const p of this.pieces.values()) p.trembling = p.type === 'k' && p.color === kingColor;
  }

  /** Fim de jogo: vencedores pulam sem parar, o rei perdedor desmaia. */
  async celebrate(winner: Color): Promise<void> {
    this.setTrembling(null);
    for (const p of this.piecesOf(winner)) p.party = true;
    this.effects.burstConfetti();
    const loserKing = this.piecesOf(winner === 'w' ? 'b' : 'w').find((p) => p.type === 'k');
    if (!loserKing) return;
    loserKing.alive = false;
    const startX = loserKing.root.rotation.x;
    await this.tweens.add(0.9, (t) => {
      loserKing.root.rotation.x = startX + (Math.PI / 2) * ease.outBack(t) * 0.98;
      loserKing.root.position.y = 0.12 * Math.min(1, t * 2);
    });
  }

  /** Posição na cena logo acima de uma casa (para textos flutuantes). */
  above(square: Square, height = 1.4): THREE.Vector3 {
    return squareToWorld(square).setY(height);
  }

  // ---------------------------------------------------------------- picking

  /** Qual casa está sob o ponteiro? Clicar numa peça conta como clicar na casa dela. */
  pick(clientX: number, clientY: number): Square | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const roots = [...this.pieces.values()].map((p) => p.root);
    const hits = this.raycaster.intersectObjects([...roots, ...this.board.squareMeshes], true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o) {
        if (o.userData.square) return o.userData.square as Square;
        const piece = o.userData.piece as PieceView | undefined;
        if (piece?.square) return piece.square;
        o = o.parent;
      }
    }
    return null;
  }
}

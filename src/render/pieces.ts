import * as THREE from 'three';
import type { Color, PieceSymbol, Square } from '../core/types';

export interface PieceMaterials {
  w: THREE.Material;
  b: THREE.Material;
}

export function createPieceMaterials(white: string, black: string): PieceMaterials {
  return {
    w: new THREE.MeshStandardMaterial({ color: white, roughness: 0.35, metalness: 0.05 }),
    b: new THREE.MeshStandardMaterial({ color: black, roughness: 0.35, metalness: 0.1 }),
  };
}

/**
 * Fábrica de peças de um tema: devolve o modelo 3D de uma peça.
 * Convenções: a base fica em y = 0, cabe num círculo de raio ~0.38,
 * e a "frente" da peça aponta para +Z (o jogo vira para o adversário).
 * `seed` é um número estável por peça, útil para variar detalhes (cor de pele, cabelo...).
 */
export type PieceBuilder = (type: PieceSymbol, color: Color, mats: PieceMaterials, seed: number) => THREE.Object3D;

// ------------------------------------------------------------------ clássico

/** Perfil (raio, altura) girado em torno do eixo Y, como num torno. */
type Profile = Array<[r: number, y: number]>;

const base = (r: number): Profile => [
  [0, 0],
  [r, 0],
  [r, 0.05],
  [r * 0.92, 0.08],
  [r * 0.78, 0.1],
];

const PROFILES: Record<Exclude<PieceSymbol, 'n'>, Profile> = {
  p: [...base(0.3), [0.22, 0.14], [0.16, 0.22], [0.12, 0.36], [0.11, 0.44], [0.18, 0.47], [0.18, 0.5], [0.1, 0.52], [0, 0.52]],
  r: [...base(0.36), [0.26, 0.14], [0.22, 0.22], [0.2, 0.6], [0.25, 0.64], [0.25, 0.72], [0, 0.72]],
  b: [...base(0.33), [0.22, 0.14], [0.15, 0.25], [0.11, 0.55], [0.18, 0.6], [0.18, 0.64], [0.1, 0.66], [0, 0.66]],
  q: [...base(0.36), [0.24, 0.14], [0.16, 0.28], [0.11, 0.7], [0.2, 0.76], [0.2, 0.8], [0.13, 0.83], [0.17, 0.98], [0, 0.95]],
  k: [...base(0.37), [0.25, 0.14], [0.17, 0.28], [0.12, 0.74], [0.21, 0.8], [0.21, 0.84], [0.13, 0.87], [0.18, 1.02], [0, 1.0]],
};

const KNIGHT_BASE: Profile = [...base(0.34), [0.24, 0.14], [0.2, 0.24], [0.18, 0.32], [0, 0.32]];

const lathe = (profile: Profile) =>
  new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(r, y)),
    32,
  );

/** Peças de xadrez tradicionais, torneadas. */
export const classicPieces: PieceBuilder = (type, color, mats) => {
  const mat = mats[color];
  const group = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  if (type === 'n') {
    add(lathe(KNIGHT_BASE));
    add(new THREE.CylinderGeometry(0.13, 0.19, 0.48, 20), 0, 0.52).rotation.x = 0.2;
    add(new THREE.BoxGeometry(0.06, 0.42, 0.1), 0, 0.62, -0.13).rotation.x = 0.2;
    const head = new THREE.Group();
    head.position.set(0, 0.8, 0.06);
    head.rotation.x = 0.45;
    group.add(head);
    add(new THREE.BoxGeometry(0.21, 0.2, 0.42), 0, 0, 0.1, head);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.19, 16), 0, -0.03, 0.29, head).rotation.z = Math.PI / 2;
    for (const side of [-1, 1]) add(new THREE.ConeGeometry(0.04, 0.12, 10), side * 0.06, 0.14, -0.06, head);
    return group;
  }

  add(lathe(PROFILES[type]));
  if (type === 'p') add(new THREE.SphereGeometry(0.15, 24, 16), 0, 0.63);
  if (type === 'r') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add(new THREE.BoxGeometry(0.1, 0.1, 0.08), Math.sin(a) * 0.2, 0.77, Math.cos(a) * 0.2).rotation.y = a;
    }
  }
  if (type === 'b') {
    add(new THREE.SphereGeometry(0.16, 24, 16), 0, 0.84).scale.y = 1.35;
    add(new THREE.SphereGeometry(0.045, 12, 8), 0, 1.07);
  }
  if (type === 'q') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.04, 10, 8), Math.sin(a) * 0.17, 0.99, Math.cos(a) * 0.17);
    }
    add(new THREE.SphereGeometry(0.06, 14, 10), 0, 1.06);
  }
  if (type === 'k') {
    add(new THREE.BoxGeometry(0.06, 0.22, 0.06), 0, 1.13);
    add(new THREE.BoxGeometry(0.17, 0.06, 0.06), 0, 1.15);
  }
  return group;
};

// ------------------------------------------------------------------- PieceView

/**
 * Representação 3D de uma peça.
 *  root  -> posição no tabuleiro e direção (yaw)
 *  lift  -> sobe/balança quando selecionada
 *         (o modelo da peça fica dentro de `lift`)
 */
export class PieceView {
  readonly root = new THREE.Group();
  readonly lift = new THREE.Group();
  square: Square | null;
  selected = false;
  /** Quando false (voando, no cemitério), ninguém mexe na rotação. */
  alive = true;
  /** Tremendo de medo (rei em xeque). */
  trembling = false;
  /** Comemorando (pulinhos sem parar). */
  party = false;
  private time = Math.random() * 10;
  private selLift = 0;
  private jumpY = 0;
  private jumpV = 0;
  private jumpDelay = 0;
  private pendingJump = 0;
  private shiverTime = 0;

  constructor(
    readonly type: PieceSymbol,
    readonly color: Color,
    square: Square | null,
    mats: PieceMaterials,
    build: PieceBuilder,
    seed: number,
    /** Vira o rosto para a câmera (bom para bonequinhos); senão encara o adversário. */
    readonly watchesCamera = false,
  ) {
    this.square = square;
    this.root.add(this.lift);
    this.root.userData.piece = this;
    this.lift.add(build(type, color, mats, seed));

    this.root.rotation.y = color === 'w' ? Math.PI : 0;
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = true;
    });
  }

  /** Pulinho (com atraso opcional, para reações em "ola"). */
  jump(speed = 3, delay = 0): void {
    if (this.jumpY > 0.01 && delay === 0) return;
    this.jumpDelay = delay;
    this.pendingJump = speed;
  }

  /** Tremedeira curta (susto ao ver um colega ser capturado). */
  shiver(seconds: number): void {
    this.shiverTime = Math.max(this.shiverTime, seconds);
  }

  update(dt: number, camera: THREE.Camera): void {
    this.time += dt;
    if (!this.alive) return;

    if (this.watchesCamera) {
      const target = Math.atan2(camera.position.x - this.root.position.x, camera.position.z - this.root.position.z);
      const diff = Math.atan2(Math.sin(target - this.root.rotation.y), Math.cos(target - this.root.rotation.y));
      this.root.rotation.y += diff * Math.min(1, dt * 4);
    }

    // Pulos: física simples com gravidade.
    if (this.pendingJump > 0) {
      this.jumpDelay -= dt;
      if (this.jumpDelay <= 0) {
        this.jumpV = this.pendingJump;
        this.pendingJump = 0;
      }
    }
    if (this.jumpV !== 0 || this.jumpY > 0) {
      this.jumpV -= 22 * dt;
      this.jumpY += this.jumpV * dt;
      if (this.jumpY <= 0) {
        this.jumpY = 0;
        this.jumpV = 0;
      }
    }
    if (this.party && this.jumpY === 0 && this.jumpV === 0 && !this.pendingJump) {
      this.jump(2.5 + Math.random() * 2, Math.random() * 0.3);
    }

    // Seleção: sobe e rebola.
    const targetY = this.selected ? 0.28 + Math.sin(this.time * 6) * 0.04 : 0;
    this.selLift += (targetY - this.selLift) * Math.min(1, dt * 12);
    this.lift.position.y = this.selLift + this.jumpY;
    this.lift.rotation.z = this.selected ? Math.sin(this.time * 9) * 0.12 : this.lift.rotation.z * 0.85;

    // Medo: treme inteirinho.
    this.shiverTime = Math.max(0, this.shiverTime - dt);
    if (this.trembling || this.shiverTime > 0) {
      this.lift.position.x = (Math.random() - 0.5) * 0.05;
      this.lift.position.z = (Math.random() - 0.5) * 0.05;
    } else {
      this.lift.position.x = this.lift.position.z = 0;
    }
  }
}

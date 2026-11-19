import { Emitter } from '../core/emitter';
import type { ChessGame } from '../core/game';
import type { MoveTransport } from '../core/transport';
import { other, type Color, type MoveIntent } from '../core/types';
import { openChannel, type RoomChannel } from './channel';
import { newClientId, type NetMessage } from './protocol';

export interface OnlineStatus {
  room: string;
  mode: RoomChannel['kind'];
  /** Minha conexão com a sala. */
  connected: boolean;
  myColor: Color | null;
  /** Entrou numa sala que já tinha dois jogadores: só assiste. */
  spectator: boolean;
  peerName: string | null;
  peerOnline: boolean;
}

type OnlineEvents = {
  move: MoveIntent;
  status: OnlineStatus;
  /** Recado para mostrar ao jogador ("Zé entrou na sala"). */
  notice: string;
};

interface Peer {
  id: string;
  name: string;
  color: Color | null;
  lastSeen: number;
}

interface SavedRoom {
  id: string;
  color: Color | null;
  history: MoveIntent[];
}

const PING_MS = 4000;
const OFFLINE_AFTER_MS = 11000;
// Por aba (sessionStorage): recarregar a página retoma a partida; duas abas são dois jogadores.
const storageKey = (room: string) => `xadrez-2:sala:${room}`;

const sameMove = (a: MoveIntent, b: MoveIntent) => a.from === b.from && a.to === b.to && (a.promotion ?? '') === (b.promotion ?? '');
const isPrefix = (short: MoveIntent[], long: MoveIntent[]) => short.length <= long.length && short.every((m, i) => sameMove(m, long[i]));

function loadSaved(room: string): SavedRoom | null {
  try {
    const raw = sessionStorage.getItem(storageKey(room));
    return raw ? (JSON.parse(raw) as SavedRoom) : null;
  } catch {
    return null;
  }
}

/**
 * Lances pela internet (ou entre abas, no modo de teste).
 * Quem cria a sala joga de Brancas; quem entra fica com a cor que sobrou;
 * se as duas já estiverem ocupadas, vira espectador.
 */
export class OnlineTransport extends Emitter<OnlineEvents> implements MoveTransport {
  readonly canUndo = false;
  readonly online = true;
  myColor: Color | null;
  private readonly id: string;
  private channel: RoomChannel | null = null;
  private peers = new Map<string, Peer>();
  private timers: number[] = [];
  private connected = false;
  private unsubscribe: Array<() => void> = [];
  private lastStatus = '';
  private disposed = false;

  constructor(
    private game: ChessGame,
    readonly room: string,
    private myName: string,
    /** 'w' ao criar a sala; null ao entrar (a cor é descoberta conversando). */
    color: Color | null,
  ) {
    super();
    const saved = loadSaved(room);
    this.id = saved?.id ?? newClientId();
    this.myColor = saved?.color ?? color;
    // Recarregou a página no meio da partida? Retoma de onde estava.
    if (saved && saved.history.length > game.ply) game.loadHistory(saved.history);
  }

  async connect(): Promise<void> {
    const channel = await openChannel(this.room);
    if (this.disposed) return channel.close();
    this.channel = channel;
    channel.onMessage((m) => this.handle(m));
    channel.onConnection((ok) => {
      this.connected = ok;
      if (ok) this.hello();
      this.emitStatus();
    });
    this.connected = true;
    this.hello();
    this.timers.push(
      window.setInterval(() => this.post({ t: 'ping', id: this.id, name: this.myName, color: this.myColor }), PING_MS),
      window.setInterval(() => this.emitStatus(), 1500),
    );
    this.unsubscribe.push(
      this.game.on('move', () => this.save()),
      this.game.on('reset', () => this.save()),
    );
    this.save();
    this.emitStatus();
  }

  // ------------------------------------------------------------- MoveTransport

  controls(color: Color): boolean {
    return color === this.myColor;
  }

  send(intent: MoveIntent): void {
    const ply = this.game.ply;
    this.emit('move', intent); // aplica aqui
    this.post({ t: 'move', id: this.id, ply, move: intent }); // e lá
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.timers.forEach((t) => clearInterval(t));
    this.unsubscribe.forEach((fn) => fn());
    // um respiro para a última mensagem (ex.: "saí da sala") sair antes de fechar
    const channel = this.channel;
    window.setTimeout(() => channel?.close(), 400);
  }

  // ------------------------------------------------------------------- ações

  /** Começa uma partida nova para os dois. */
  resetForAll(): void {
    this.post({ t: 'reset', id: this.id });
    this.game.newGame();
  }

  /** Sai da sala e esquece ela. */
  leave(): void {
    this.post({ t: 'bye', id: this.id });
    try {
      sessionStorage.removeItem(storageKey(this.room));
    } catch {
      // sem storage, nada para limpar
    }
    this.dispose();
  }

  setName(name: string): void {
    this.myName = name;
    this.hello();
  }

  get status(): OnlineStatus {
    const now = Date.now();
    const opponent =
      [...this.peers.values()].find((p) => p.color && p.color === (this.myColor ? other(this.myColor) : p.color)) ??
      [...this.peers.values()][0];
    return {
      room: this.room,
      mode: this.channel?.kind ?? 'local',
      connected: this.connected,
      myColor: this.myColor,
      spectator: this.myColor === null && this.colorsTaken().size === 2,
      peerName: opponent?.name ?? null,
      peerOnline: !!opponent && now - opponent.lastSeen < OFFLINE_AFTER_MS,
    };
  }

  /** Nome de quem joga com uma cor (eu ou o outro). */
  nameFor(color: Color): string | null {
    if (color === this.myColor) return this.myName;
    return [...this.peers.values()].find((p) => p.color === color)?.name ?? null;
  }

  // ----------------------------------------------------------------- interno

  private post(msg: NetMessage): void {
    this.channel?.send(msg);
  }

  private hello(): void {
    this.post({ t: 'hello', id: this.id, name: this.myName, color: this.myColor });
  }

  private handle(m: NetMessage): void {
    if (m.id === this.id || this.disposed) return;

    if (m.t === 'hello' || m.t === 'state' || m.t === 'ping') {
      const known = this.peers.get(m.id);
      this.peers.set(m.id, { id: m.id, name: m.name, color: m.color, lastSeen: Date.now() });
      if (!known && m.t !== 'ping') this.emit('notice', `${m.name} entrou na sala.`);
      if (!known && m.t === 'ping') this.hello(); // conheci alguém pelo ping: me apresento
    } else {
      const peer = this.peers.get(m.id);
      if (peer) peer.lastSeen = Date.now();
    }

    switch (m.t) {
      case 'hello':
        // Responde com o meu estado: quem chegou descobre a cor dele e recebe a partida.
        this.post({ t: 'state', id: this.id, name: this.myName, color: this.myColor, history: this.game.historyIntents() });
        this.pickColor();
        break;
      case 'state':
        this.pickColor();
        this.adoptHistory(m.history, m.color);
        break;
      case 'move':
        if (m.ply === this.game.ply) this.emit('move', m.move);
        else if (m.ply > this.game.ply) this.hello(); // perdi algo: peço o estado de novo
        break;
      case 'reset':
        this.game.newGame();
        this.emit('notice', `${this.peers.get(m.id)?.name ?? 'O adversário'} começou uma partida nova.`);
        break;
      case 'bye': {
        const peer = this.peers.get(m.id);
        this.peers.delete(m.id);
        if (peer) this.emit('notice', `${peer.name} saiu da sala.`);
        break;
      }
    }
    this.emitStatus();
  }

  /** Cores de quem está na sala agora (quem sumiu há tempo não "segura" a cor). */
  private colorsTaken(): Set<Color> {
    const taken = new Set<Color>();
    const now = Date.now();
    for (const p of this.peers.values()) if (p.color && now - p.lastSeen < OFFLINE_AFTER_MS) taken.add(p.color);
    return taken;
  }

  /** Ainda sem cor? Pega a que sobrou (ou vira espectador). */
  private pickColor(): void {
    if (this.myColor) return;
    const taken = this.colorsTaken();
    if (taken.size === 0) return; // ninguém com cor ainda: espera o dono da sala
    if (taken.size === 2) return; // espectador
    this.myColor = taken.has('w') ? 'b' : 'w';
    this.save();
    this.hello(); // conta pra todo mundo que cor eu peguei
  }

  /** Fica com a partida mais completa; se as duas divergirem, vale a de quem joga de Brancas. */
  private adoptHistory(theirs: MoveIntent[], theirColor: Color | null): void {
    const mine = this.game.historyIntents();
    if (theirs.length > mine.length && isPrefix(mine, theirs)) {
      this.game.loadHistory(theirs);
    } else if (!isPrefix(mine, theirs) && !isPrefix(theirs, mine) && theirColor === 'w') {
      this.game.loadHistory(theirs);
      this.emit('notice', 'As partidas estavam diferentes; fiquei com a das Brancas.');
    }
  }

  private save(): void {
    try {
      const data: SavedRoom = { id: this.id, color: this.myColor, history: this.game.historyIntents() };
      sessionStorage.setItem(storageKey(this.room), JSON.stringify(data));
    } catch {
      // modo privado: segue sem salvar
    }
  }

  private emitStatus(): void {
    const s = this.status;
    const key = JSON.stringify(s);
    if (key === this.lastStatus) return;
    this.lastStatus = key;
    this.emit('status', s);
  }
}

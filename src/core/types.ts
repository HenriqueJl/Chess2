import type { Color, Move, PieceSymbol, Square } from 'chess.js';

export type { Color, Move, PieceSymbol, Square };

/** O que um jogador (ou a rede, ou uma IA) quer fazer. */
export interface MoveIntent {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
}

/**
 * Eventos "narráveis" detectados depois de cada lance.
 * Todo evento tem `by`: a cor de quem PROVOCOU o evento (normalmente quem jogou).
 */
export type GameEvent = { by: Color } & (
  | { type: 'capture'; attacker: PieceSymbol; victim: PieceSymbol; enPassant: boolean }
  /** Capturou uma peça que estava desprotegida (presente do adversário). */
  | { type: 'gift'; victim: PieceSymbol }
  /** Primeira captura da partida. */
  | { type: 'firstBlood' }
  /** Capturou de volta na mesma casa. `even` = troca de valores iguais. */
  | { type: 'recapture'; even: boolean }
  /** A peça que acabou de mover ficou atacada e mal defendida. */
  | { type: 'hanging'; piece: PieceSymbol }
  /** A peça que moveu ataca duas ou mais peças valiosas ao mesmo tempo. */
  | { type: 'fork'; attacker: PieceSymbol; targets: PieceSymbol[] }
  | { type: 'check' }
  | { type: 'discoveredCheck' }
  | { type: 'doubleCheck' }
  /** 3º (ou mais) xeque seguido do mesmo lado. */
  | { type: 'checkSpree'; count: number }
  /** Capturou em 3 (ou mais) lances seguidos. */
  | { type: 'captureSpree'; count: number }
  | { type: 'checkmate'; moveNumber: number; matingPiece: PieceSymbol; loserHadMoreMaterial: boolean }
  | { type: 'stalemate' }
  | { type: 'draw'; reason: 'repetition' | 'insufficient' | 'fifty' | 'other' }
  | { type: 'castle'; side: 'king' | 'queen' }
  | { type: 'promotion'; to: PieceSymbol }
  | { type: 'opening'; id: string; name: string }
  /** Mudança grande no placar de material. */
  | { type: 'materialSwing'; kind: 'virada' | 'massacre'; lead: number }
  /** O rei saiu passeando no meio do jogo (sem ser roque). */
  | { type: 'kingWalk' }
  /** A dama saiu cedo demais. */
  | { type: 'earlyQueen'; moveNumber: number }
  /** A peça voltou para onde estava no lance anterior. */
  | { type: 'indecision'; piece: PieceSymbol }
  /** Muitos lances sem nenhuma captura. */
  | { type: 'boring'; plies: number }
  /** Demorou muito para jogar. */
  | { type: 'slowMove'; seconds: number }
  /** Jogador da vez está parado há muito tempo (gerado pela interface, não por um lance). */
  | { type: 'idle'; seconds: number }
);

export type GameEventType = GameEvent['type'];
export type EventOf<T extends GameEventType> = Extract<GameEvent, { type: T }>;

export interface MoveResult {
  move: Move;
  events: GameEvent[];
}

export const PIECE_VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');

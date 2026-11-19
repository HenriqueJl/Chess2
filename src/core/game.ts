import { Chess } from 'chess.js';
import { Emitter } from './emitter';
import { detectEvents } from './events';
import type { Color, Move, MoveIntent, MoveResult, Square } from './types';

type GameEvents = {
  move: MoveResult;
  /** Estado mudou de forma "não animável" (novo jogo, desfazer, carregar). */
  reset: void;
};

/**
 * Fonte da verdade das regras. Não sabe nada de 3D, nem de rede:
 * recebe intenções de lance, valida e emite resultados.
 */
export class ChessGame extends Emitter<GameEvents> {
  readonly chess = new Chess();

  turn(): Color {
    return this.chess.turn();
  }

  legalMovesFrom(square: Square): Move[] {
    return this.chess.moves({ square, verbose: true });
  }

  isGameOver(): boolean {
    return this.chess.isGameOver();
  }

  apply(intent: MoveIntent): MoveResult | null {
    let move: Move;
    try {
      move = this.chess.move(intent);
    } catch {
      return null; // lance ilegal: ignora
    }
    const now = performance.now();
    const result = { move, events: detectEvents(this.chess, move, { thinkMs: now - this.turnStartedAt }) };
    this.turnStartedAt = now;
    this.emit('move', result);
    return result;
  }

  /** Zera o relógio do jogador da vez (ex.: ao voltar de um menu). */
  resetClock(): void {
    this.turnStartedAt = performance.now();
  }

  /** Há quanto tempo o jogador da vez está pensando. */
  thinkingMs(): number {
    return performance.now() - this.turnStartedAt;
  }

  undo(): boolean {
    const undone = this.chess.undo();
    this.turnStartedAt = performance.now();
    if (undone) this.emit('reset', undefined);
    return undone !== null;
  }

  /** A partida como lista de lances (para mandar pela rede ou salvar). */
  historyIntents(): MoveIntent[] {
    return this.chess.history({ verbose: true }).map((m) => ({ from: m.from, to: m.to, promotion: m.promotion }));
  }

  get ply(): number {
    return this.chess.history().length;
  }

  /** Troca a partida inteira por outra (sincronização). Retorna false se algum lance for inválido. */
  loadHistory(moves: MoveIntent[]): boolean {
    const fresh = new Chess();
    try {
      for (const m of moves) fresh.move(m);
    } catch {
      return false;
    }
    this.chess.reset();
    for (const m of moves) this.chess.move(m);
    this.turnStartedAt = performance.now();
    this.emit('reset', undefined);
    return true;
  }

  newGame(): void {
    this.chess.reset();
    this.turnStartedAt = performance.now();
    this.emit('reset', undefined);
  }

  private turnStartedAt = performance.now();
}

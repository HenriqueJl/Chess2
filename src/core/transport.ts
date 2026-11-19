import { Emitter } from './emitter';
import type { Color, MoveIntent } from './types';

type TransportEvents = {
  /** Um lance que deve ser aplicado ao jogo (venha de onde vier). */
  move: MoveIntent;
};

/**
 * Camada que entrega lances ao jogo. O jogo e a interface não sabem
 * se o lance veio de um clique local, da internet ou de uma IA.
 */
export interface MoveTransport extends Emitter<TransportEvents> {
  /** Quais cores podem ser controladas por quem está neste dispositivo. */
  controls(color: Color): boolean;
  /** Envia um lance feito neste dispositivo. */
  send(intent: MoveIntent): void;
  /** Desfazer só faz sentido quando não há outra pessoa do outro lado. */
  readonly canUndo: boolean;
  /** Joga contra alguém em outro dispositivo? */
  readonly online: boolean;
  /** Para de escutar/mandar lances (ao trocar de modo). */
  dispose(): void;
}

/** Dois jogadores no mesmo dispositivo. */
export class LocalTransport extends Emitter<TransportEvents> implements MoveTransport {
  readonly canUndo = true;
  readonly online = false;

  controls(): boolean {
    return true;
  }

  send(intent: MoveIntent): void {
    this.emit('move', intent);
  }

  dispose(): void {}
}

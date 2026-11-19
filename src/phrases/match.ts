import type { EventOf, GameEvent, GameEventType } from '../core/types';

/** Casa com eventos de um tipo (e, opcionalmente, uma condição extra). */
export const is =
  <T extends GameEventType>(type: T, extra?: (e: EventOf<T>, all: GameEvent[]) => boolean) =>
  (e: GameEvent, all: GameEvent[]): boolean =>
    e.type === type && (!extra || extra(e as EventOf<T>, all));

/** Algum evento do lance é deste tipo? */
export const has = (all: GameEvent[], type: GameEventType) => all.some((e) => e.type === type);

/** Emissor de eventos tipado e minúsculo. */
export class Emitter<Events extends Record<string, unknown>> {
  private listeners: { [K in keyof Events]?: Array<(payload: Events[K]) => void> } = {};

  on<K extends keyof Events>(name: K, fn: (payload: Events[K]) => void): () => void {
    (this.listeners[name] ??= []).push(fn);
    return () => {
      this.listeners[name] = this.listeners[name]?.filter((f) => f !== fn);
    };
  }

  emit<K extends keyof Events>(name: K, payload: Events[K]): void {
    for (const fn of this.listeners[name] ?? []) fn(payload);
  }
}

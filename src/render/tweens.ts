interface Tween {
  elapsed: number;
  duration: number;
  update: (t: number) => void;
  resolve: () => void;
}

/** Animações baseadas em Promise, avançadas pelo loop de renderização. */
export class Tweener {
  private tweens: Tween[] = [];

  /** `update` recebe t de 0 a 1. Resolve quando termina. */
  add(durationSec: number, update: (t: number) => void): Promise<void> {
    return new Promise((resolve) => {
      update(0);
      this.tweens.push({ elapsed: 0, duration: Math.max(durationSec, 1e-4), update, resolve });
    });
  }

  wait(durationSec: number): Promise<void> {
    return this.add(durationSec, () => {});
  }

  get busy(): boolean {
    return this.tweens.length > 0;
  }

  tick(dt: number): void {
    const done: Tween[] = [];
    for (const tw of this.tweens) {
      tw.elapsed += dt;
      const t = Math.min(tw.elapsed / tw.duration, 1);
      tw.update(t);
      if (t >= 1) done.push(tw);
    }
    if (done.length) {
      this.tweens = this.tweens.filter((tw) => !done.includes(tw));
      done.forEach((tw) => tw.resolve());
    }
  }
}

export const ease = {
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inQuad: (t: number) => t * t,
};

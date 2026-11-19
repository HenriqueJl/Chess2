import * as THREE from 'three';

interface FloatingText {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  rise: number;
}

interface Confetto {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  rot: THREE.Euler;
  spin: THREE.Vector3;
  age: number;
}

const CONFETTI_COLORS = ['#ff4d6d', '#ffd34d', '#4dd6ff', '#9be15d', '#c77dff', '#ff9f43'];
const MAX_CONFETTI = 400;

/** Efeitos "de videogame": números de dano flutuando e chuva de confete. */
export class Effects {
  private texts: FloatingText[] = [];
  private confetti: Confetto[] = [];
  private confettiMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();

  constructor(private scene: THREE.Scene) {
    this.confettiMesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(0.09, 0.16),
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
      MAX_CONFETTI,
    );
    this.confettiMesh.count = 0;
    this.confettiMesh.frustumCulled = false;
    const color = new THREE.Color();
    for (let i = 0; i < MAX_CONFETTI; i++) {
      this.confettiMesh.setColorAt(i, color.set(CONFETTI_COLORS[i % CONFETTI_COLORS.length]));
    }
    scene.add(this.confettiMesh);
  }

  /** Texto flutuante tipo "-9 CRÍTICO!". */
  floatText(position: THREE.Vector3, text: string, color: string, size = 1): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '900 84px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#2a2340';
    ctx.strokeText(text, 256, 68);
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 68);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.renderOrder = 10;
    sprite.scale.set(2.4 * size, 0.6 * size, 1);
    sprite.position.copy(position);
    sprite.userData.size = size;
    this.scene.add(sprite);
    this.texts.push({ sprite, age: 0, life: 1.6, rise: 1.4 });
  }

  burstConfetti(center = new THREE.Vector3(0, 0, 0), amount = 220): void {
    for (let i = 0; i < amount && this.confetti.length < MAX_CONFETTI; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.confetti.push({
        pos: center.clone().add(new THREE.Vector3(0, 0.5, 0)),
        vel: new THREE.Vector3(Math.cos(a) * speed, 6 + Math.random() * 6, Math.sin(a) * speed),
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        spin: new THREE.Vector3(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5),
        age: 0,
      });
    }
  }

  clear(): void {
    this.texts.forEach((t) => this.scene.remove(t.sprite));
    this.texts = [];
    this.confetti = [];
    this.confettiMesh.count = 0;
  }

  update(dt: number): void {
    for (const t of this.texts) {
      t.age += dt;
      const k = t.age / t.life;
      t.sprite.position.y += t.rise * dt * (1 - k);
      const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.55 : 1.15 - Math.min(0.15, (k - 0.12) * 0.5);
      t.sprite.scale.set(2.4 * pop * (t.sprite.userData.size ?? 1), 0.6 * pop * (t.sprite.userData.size ?? 1), 1);
      t.sprite.material.opacity = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    }
    const dead = this.texts.filter((t) => t.age >= t.life);
    if (dead.length) {
      dead.forEach((t) => {
        this.scene.remove(t.sprite);
        t.sprite.material.map?.dispose();
        t.sprite.material.dispose();
      });
      this.texts = this.texts.filter((t) => t.age < t.life);
    }

    // Confete: gravidade + resistência do ar + rodopio.
    this.confetti = this.confetti.filter((c) => c.age < 7);
    let i = 0;
    for (const c of this.confetti) {
      c.age += dt;
      // Pousa no tabuleiro (ou na mesa) e fica lá, bagunçado.
      const onBoard = Math.abs(c.pos.x) < 4.5 && Math.abs(c.pos.z) < 4.5;
      const floor = onBoard ? 0.01 : -0.3;
      if (c.pos.y <= floor && c.vel.y <= 0) {
        c.pos.y = floor;
        c.vel.set(0, 0, 0);
        c.spin.set(0, 0, 0);
        c.rot.x = -Math.PI / 2;
        c.rot.y = 0;
        this.dummy.position.copy(c.pos);
        this.dummy.rotation.copy(c.rot);
        this.dummy.updateMatrix();
        this.confettiMesh.setMatrixAt(i++, this.dummy.matrix);
        continue;
      }
      c.vel.y -= 9 * dt;
      c.vel.multiplyScalar(Math.exp(-1.8 * dt));
      if (c.vel.y < -1.5) c.vel.y = -1.5; // cai planando
      c.pos.addScaledVector(c.vel, dt);
      c.rot.x += c.spin.x * dt;
      c.rot.y += c.spin.y * dt;
      c.rot.z += c.spin.z * dt;
      this.dummy.position.copy(c.pos);
      this.dummy.rotation.copy(c.rot);
      this.dummy.updateMatrix();
      this.confettiMesh.setMatrixAt(i++, this.dummy.matrix);
    }
    this.confettiMesh.count = i;
    this.confettiMesh.instanceMatrix.needsUpdate = true;
  }
}

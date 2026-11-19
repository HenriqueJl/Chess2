import * as THREE from 'three';
import type { Square } from '../core/types';
import type { Theme } from '../themes/theme';

export const FILES = 'abcdefgh';

/** a1 fica perto das Brancas (Z positivo), h8 perto das Pretas. */
export function squareToWorld(square: Square, target = new THREE.Vector3()): THREE.Vector3 {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]) - 1;
  return target.set(file - 3.5, 0, 3.5 - rank);
}

export const ALL_SQUARES: Square[] = [...FILES].flatMap((f) =>
  [1, 2, 3, 4, 5, 6, 7, 8].map((r) => `${f}${r}` as Square),
);

type HighlightKind = 'selected' | 'lastMove' | 'check';

export class BoardView {
  readonly group = new THREE.Group();
  readonly squareMeshes: THREE.Mesh[] = [];
  private highlights = new Map<Square, THREE.Mesh>();
  private markers: THREE.Object3D[] = [];
  private highlightMats: Record<HighlightKind, THREE.Material>;
  private markerMat: THREE.Material;

  constructor(theme: Theme) {
    const c = theme.colors;
    const light = new THREE.MeshStandardMaterial({ color: c.lightSquare, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: c.darkSquare, roughness: 0.6 });
    const squareGeo = new THREE.BoxGeometry(1, 0.1, 1);

    for (const sq of ALL_SQUARES) {
      const isLight = (FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 1;
      const m = new THREE.Mesh(squareGeo, isLight ? light : dark);
      squareToWorld(sq, m.position).y = -0.05;
      m.receiveShadow = true;
      m.userData.square = sq;
      this.group.add(m);
      this.squareMeshes.push(m);
    }

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.3, 9),
      new THREE.MeshStandardMaterial({ color: c.frame, roughness: 0.5 }),
    );
    frame.position.y = -0.16;
    frame.receiveShadow = true;
    frame.castShadow = true;
    this.group.add(frame);
    this.addCoordinates(c.lightSquare);

    const hl = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    this.highlightMats = {
      selected: hl(c.highlight, 0.55),
      lastMove: hl(c.lastMove, 0.35),
      check: hl(c.check, 0.6),
    };
    this.markerMat = new THREE.MeshBasicMaterial({ color: c.highlight, transparent: true, opacity: 0.8 });
  }

  private addCoordinates(color: string): void {
    const label = (text: string, x: number, z: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = color;
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 32, 34);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.32),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, -0.005, z);
      this.group.add(m);
      return m;
    };
    for (let i = 0; i < 8; i++) {
      label(FILES[i], i - 3.5, 4.25);
      label(FILES[i], i - 3.5, -4.25).rotation.z = Math.PI;
      label(String(i + 1), -4.25, 3.5 - i);
      label(String(i + 1), 4.25, 3.5 - i).rotation.z = Math.PI;
    }
  }

  setHighlights(entries: Array<[Square, HighlightKind]>): void {
    this.highlights.forEach((m) => this.group.remove(m));
    this.highlights.clear();
    const geo = new THREE.PlaneGeometry(1, 1);
    for (const [sq, kind] of entries) {
      const m = new THREE.Mesh(geo, this.highlightMats[kind]);
      m.rotation.x = -Math.PI / 2;
      squareToWorld(sq, m.position).y = 0.003 + (kind === 'check' ? 0.002 : 0);
      this.group.add(m);
      this.highlights.set(sq, m);
    }
  }

  /** Pontinhos para lances normais, anéis para capturas. */
  setMoveMarkers(targets: Array<{ square: Square; capture: boolean }>): void {
    this.markers.forEach((m) => this.group.remove(m));
    this.markers = [];
    for (const t of targets) {
      const geo = t.capture
        ? new THREE.RingGeometry(0.38, 0.46, 32)
        : new THREE.CircleGeometry(0.13, 24);
      const m = new THREE.Mesh(geo, this.markerMat);
      m.rotation.x = -Math.PI / 2;
      squareToWorld(t.square, m.position).y = 0.008;
      this.group.add(m);
      this.markers.push(m);
    }
  }
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PieceBuilder } from './pieces';

export interface ModelSource {
  /** Arquivo .glb gerado por tools/import-3mf.mjs (em public/models/). */
  url: string;
  /** Ângulo (graus) acima do qual uma aresta fica "quina" em vez de suave. */
  creaseAngle?: number;
}

const cache = new Map<string, Promise<PieceBuilder>>();

/**
 * Carrega um conjunto de peças de um .glb. Os nós se chamam "k", "q"... (mesmo modelo
 * para os dois times) ou "w_k", "b_k"... (modelo por time). A geometria é compartilhada
 * entre todas as peças iguais; o jogo só troca o material (cor do time).
 */
export function loadModelPieces(source: ModelSource): Promise<PieceBuilder> {
  const key = `${source.url}|${source.creaseAngle ?? 40}`;
  let promise = cache.get(key);
  if (!promise) {
    promise = new GLTFLoader().loadAsync(source.url).then((gltf) => {
      const geometries = new Map<string, THREE.BufferGeometry>();
      gltf.scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        const geo = toCreasedNormals(o.geometry, ((source.creaseAngle ?? 40) * Math.PI) / 180);
        geo.computeBoundingSphere();
        geometries.set(o.name, geo);
      });
      const builder: PieceBuilder = (type, color, mats) => {
        const geo = geometries.get(`${color}_${type}`) ?? geometries.get(type);
        const group = new THREE.Group();
        if (geo) group.add(new THREE.Mesh(geo, mats[color]));
        return group;
      };
      return builder;
    });
    promise.catch(() => cache.delete(key));
    cache.set(key, promise);
  }
  return promise;
}

// Converte um projeto .3mf (de impressão 3D) num tema de peças para o jogo.
//
// Uso:
//   node tools/import-3mf.mjs <id-do-conjunto> <arquivo.3mf | pasta-descompactada>
//
// O mapeamento objeto → peça fica em tools/model-sets.mjs.
// Saída: public/models/<id>.glb (malhas simplificadas, Y para cima, 1 unidade = 1 casa).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';
import { writeGlb } from './glb.mjs';
import { load3mf } from './lib3mf.mjs';
import { MODEL_SETS, TARGET, TRIANGLE_BUDGET } from './model-sets.mjs';

const [setId, source] = process.argv.slice(2);
const set = MODEL_SETS[setId];
if (!set || !source) {
  console.error(`Uso: node tools/import-3mf.mjs <${Object.keys(MODEL_SETS).join('|')}> <arquivo.3mf | pasta>`);
  process.exit(1);
}

/** .3mf é um zip. No Windows, o tar.exe do sistema (bsdtar) sabe abrir zip. */
function extract(file) {
  const dir = mkdtempSync(join(tmpdir(), 'xadrez2-3mf-'));
  const tar = process.platform === 'win32' ? 'C:\\Windows\\System32\\tar.exe' : 'tar';
  execFileSync(tar, ['-xf', file, '-C', dir]);
  return dir;
}

const isDir = statSync(source).isDirectory();
const dir = isDir ? source : extract(source);

await MeshoptSimplifier.ready;
console.log(`Lendo ${source} ...`);
const objects = new Map(load3mf(dir).map((o) => [o.id, o]));

/** Z para cima (impressora) → Y para cima (jogo), girando `yaw` graus. */
function toYUp(src, yawDeg = 0) {
  const out = new Float32Array(src.length);
  const a = (yawDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  for (let i = 0; i < src.length; i += 3) {
    const x = src[i];
    const y = src[i + 2];
    const z = -src[i + 1];
    out[i] = x * c + z * s;
    out[i + 1] = y;
    out[i + 2] = -x * s + z * c;
  }
  return out;
}

function simplify(positions, indices, targetTris) {
  // solda vértices duplicados (partes diferentes, costuras do STL)
  const remap = MeshoptSimplifier.generatePositionRemap(positions, 3);
  let idx = Uint32Array.from(indices, (i) => remap[i]);
  const target = Math.min(idx.length, targetTris * 3);
  if (idx.length > target) {
    let [out] = MeshoptSimplifier.simplify(idx, positions, 3, target, 0.02, ['Permissive']);
    if (out.length > target * 1.4) [out] = MeshoptSimplifier.simplifySloppy(idx, positions, 3, null, target, 0.02);
    idx = out;
  }
  // compacta: só os vértices usados
  const map = new Map();
  const pos = [];
  const finalIdx = new Uint32Array(idx.length);
  for (let i = 0; i < idx.length; i++) {
    let n = map.get(idx[i]);
    if (n === undefined) {
      n = map.size;
      map.set(idx[i], n);
      const v = idx[i] * 3;
      pos.push(positions[v], positions[v + 1], positions[v + 2]);
    }
    finalIdx[i] = n;
  }
  return { positions: Float32Array.from(pos), indices: finalIdx };
}

/** Altura, centro e largura da base (fatia de baixo da peça). */
function measure(positions) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 1; i < positions.length; i += 3) {
    minY = Math.min(minY, positions[i]);
    maxY = Math.max(maxY, positions[i]);
  }
  const height = maxY - minY;
  const sliceTop = minY + height * 0.06;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    if (positions[i + 1] > sliceTop) continue;
    x0 = Math.min(x0, positions[i]);
    x1 = Math.max(x1, positions[i]);
    z0 = Math.min(z0, positions[i + 2]);
    z1 = Math.max(z1, positions[i + 2]);
  }
  return { minY, height, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2, baseWidth: Math.max(x1 - x0, z1 - z0) };
}

// ---- monta a lista de peças
const jobs = [];
for (const [team, pieces] of Object.entries(set.pieces)) {
  for (const [type, cfg] of Object.entries(pieces)) {
    const obj = objects.get(cfg.object);
    if (!obj) throw new Error(`Objeto ${cfg.object} (${team}/${type}) não existe nesse arquivo.`);
    jobs.push({ team, type, cfg, obj });
  }
}

const processed = jobs.map(({ team, type, cfg, obj }) => {
  const before = obj.mesh.indices.length / 3;
  const yUp = toYUp(obj.mesh.positions, cfg.yaw ?? 0);
  const mesh = simplify(yUp, obj.mesh.indices, TRIANGLE_BUDGET[type]);
  const m = measure(mesh.positions);
  m.extra = cfg.scale ?? 1;
  console.log(
    `  ${team}/${type}  #${obj.id} "${obj.name}"  ${before} → ${mesh.indices.length / 3} triângulos` +
      `  (altura ${m.height.toFixed(1)}mm, base ${m.baseWidth.toFixed(1)}mm)`,
  );
  return { team, type, mesh, m };
});

// ---- escala única para o conjunto todo (mantém as proporções entre as peças)
const maxBase = Math.max(...processed.map((p) => p.m.baseWidth * p.m.extra));
const maxHeight = Math.max(...processed.map((p) => p.m.height * p.m.extra));
const scale = Math.min(TARGET.maxBaseWidth / maxBase, TARGET.maxHeight / maxHeight);

const meshes = processed.map(({ team, type, mesh, m }) => {
  const p = mesh.positions;
  const s = scale * m.extra;
  for (let i = 0; i < p.length; i += 3) {
    p[i] = (p[i] - m.cx) * s;
    p[i + 1] = (p[i + 1] - m.minY) * s;
    p[i + 2] = (p[i + 2] - m.cz) * s;
  }
  return { name: team === 'both' ? type : `${team}_${type}`, positions: p, indices: mesh.indices, extras: { team, type } };
});

const outDir = join(process.cwd(), 'public', 'models');
mkdirSync(outDir, { recursive: true });
const out = join(outDir, `${setId}.glb`);
const glb = writeGlb(meshes);
writeFileSync(out, glb);
if (!isDir) rmSync(dir, { recursive: true, force: true });
console.log(`OK: ${out} (${(glb.length / 1024).toFixed(0)} KB, escala ${scale.toFixed(4)})`);

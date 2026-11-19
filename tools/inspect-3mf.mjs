// Lista os objetos de um projeto .3mf descompactado.
// Uso: node tools/inspect-3mf.mjs <pasta-descompactada>
import { bounds, load3mf } from './lib3mf.mjs';

const dir = process.argv[2];
if (!dir) {
  console.error('Uso: node tools/inspect-3mf.mjs <pasta-descompactada>');
  process.exit(1);
}
for (const obj of load3mf(dir)) {
  const b = bounds(obj.mesh.positions);
  const tris = obj.mesh.indices.length / 3;
  const parts = obj.parts.map((p) => `${p.name ?? '?'}[${p.subtype === 'normal_part' ? '' : p.subtype + ' '}${p.triangles}]`).join(', ');
  console.log(
    `#${obj.id.padEnd(4)} ${obj.name.padEnd(26)} tris=${String(tris).padStart(8)}  ` +
      `size=${b.size.map((v) => v.toFixed(1)).join(' x ')}  parts: ${parts}`,
  );
}

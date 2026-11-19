// Escritor mínimo de GLB (glTF binário): só posições + índices, um nó por malha.
// As normais são calculadas no jogo, na hora de carregar.

const pad4 = (n) => (n + 3) & ~3;

/**
 * @param {Array<{ name: string, positions: Float32Array, indices: Uint32Array, extras?: object }>} meshes
 * @returns {Buffer}
 */
export function writeGlb(meshes) {
  const chunks = [];
  let byteLength = 0;
  const bufferViews = [];
  const accessors = [];
  const gltfMeshes = [];
  const nodes = [];

  const addView = (data, target) => {
    const offset = byteLength;
    const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    chunks.push(bytes);
    byteLength += bytes.length;
    const padding = pad4(byteLength) - byteLength;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
      byteLength += padding;
    }
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, target });
    return bufferViews.length - 1;
  };

  for (const m of meshes) {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < m.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], m.positions[i + k]);
        max[k] = Math.max(max[k], m.positions[i + k]);
      }
    }
    const vertexCount = m.positions.length / 3;
    const posView = addView(m.positions, 34962);
    accessors.push({ bufferView: posView, componentType: 5126, count: vertexCount, type: 'VEC3', min, max });
    const posAcc = accessors.length - 1;

    const small = vertexCount < 65536;
    const idx = small ? Uint16Array.from(m.indices) : m.indices;
    const idxView = addView(idx, 34963);
    accessors.push({ bufferView: idxView, componentType: small ? 5123 : 5125, count: m.indices.length, type: 'SCALAR' });
    const idxAcc = accessors.length - 1;

    gltfMeshes.push({ name: m.name, primitives: [{ attributes: { POSITION: posAcc }, indices: idxAcc }] });
    nodes.push({ name: m.name, mesh: gltfMeshes.length - 1, ...(m.extras ? { extras: m.extras } : {}) });
  }

  const json = {
    asset: { version: '2.0', generator: 'xadrez-2 import-3mf' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    accessors,
    bufferViews,
    buffers: [{ byteLength }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = pad4(jsonBuf.length) - jsonBuf.length;
  if (jsonPad) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const bin = Buffer.concat(chunks);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + bin.length, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"
  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, bin]);
}

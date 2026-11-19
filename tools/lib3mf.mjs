// Leitura mínima de projetos .3mf (inclusive os do Bambu Studio / Orca Slicer),
// a partir de uma pasta já descompactada.
//
// Resultado: lista de "objetos" (o que aparece como peça no fatiador), cada um com
// nome, partes e a malha final (com as transformações aplicadas, em Z para cima).
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`));
  return m ? m[1] : undefined;
};

/** Matriz 3MF (12 números, convenção de vetor-linha) → função que transforma um ponto. */
function parseTransform(str) {
  if (!str) return null;
  const m = str.trim().split(/\s+/).map(Number);
  return m;
}
function applyTransform(m, x, y, z) {
  return [
    x * m[0] + y * m[3] + z * m[6] + m[9],
    x * m[1] + y * m[4] + z * m[7] + m[10],
    x * m[2] + y * m[5] + z * m[8] + m[11],
  ];
}
/** Composição: primeiro `a`, depois `b`. */
function compose(a, b) {
  if (!a) return b;
  if (!b) return a;
  // Matrizes 4x4 com última coluna (0,0,0,1); linha i de `a` = a[3i..3i+2] (+ 0 ou 1).
  const r = new Array(12);
  for (let i = 0; i < 4; i++) {
    const w = i === 3 ? 1 : 0;
    for (let j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j] + w * b[9 + j];
    }
  }
  return r;
}

/** Lê todos os <object> de um arquivo .model: malhas e componentes. */
function parseModelFile(xml) {
  const objects = new Map();
  const objRe = /<object\b([^>]*)>([\s\S]*?)<\/object>/g;
  let m;
  while ((m = objRe.exec(xml))) {
    const id = attr(m[1], 'id');
    const body = m[2];
    const obj = { id, mesh: null, components: [] };
    const meshStart = body.indexOf('<mesh');
    if (meshStart >= 0) {
      const verts = [];
      const vRe = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
      let v;
      while ((v = vRe.exec(body))) verts.push(+v[1], +v[2], +v[3]);
      const tris = [];
      const tRe = /<triangle\s+v1="(\d+)"\s+v2="(\d+)"\s+v3="(\d+)"/g;
      let t;
      while ((t = tRe.exec(body))) tris.push(+t[1], +t[2], +t[3]);
      obj.mesh = { positions: Float32Array.from(verts), indices: Uint32Array.from(tris) };
    }
    const cRe = /<component\b([^>]*)\/>/g;
    let c;
    while ((c = cRe.exec(body))) {
      obj.components.push({
        path: attr(c[1], 'p:path'),
        objectid: attr(c[1], 'objectid'),
        transform: parseTransform(attr(c[1], 'transform')),
      });
    }
    objects.set(id, obj);
  }
  return objects;
}

/** Nomes e tipos de parte (normal, modificador, negativa...) do model_settings.config. */
function parseSettings(dir) {
  const file = join(dir, 'Metadata', 'model_settings.config');
  const info = new Map();
  if (!existsSync(file)) return info;
  const xml = readFileSync(file, 'utf8');
  const objRe = /<object id="(\d+)">([\s\S]*?)<\/object>/g;
  let m;
  while ((m = objRe.exec(xml))) {
    const body = m[2];
    const name = body.match(/^\s*<metadata key="name" value="([^"]*)"/m)?.[1];
    const parts = new Map();
    const pRe = /<part id="(\d+)" subtype="([^"]+)">([\s\S]*?)<\/part>/g;
    let p;
    while ((p = pRe.exec(body))) {
      parts.set(p[1], { subtype: p[2], name: p[3].match(/key="name" value="([^"]*)"/)?.[1] });
    }
    info.set(m[1], { name, parts });
  }
  return info;
}

/**
 * Carrega um projeto 3MF descompactado.
 * Retorna [{ id, name, parts: [{name, subtype, triangles}], mesh: {positions, indices} }]
 */
export function load3mf(dir) {
  const rootXml = readFileSync(join(dir, '3D', '3dmodel.model'), 'utf8');
  const root = parseModelFile(rootXml);
  const settings = parseSettings(dir);
  const fileCache = new Map();
  const getFile = (path) => {
    if (!path) return root;
    if (!fileCache.has(path)) fileCache.set(path, parseModelFile(readFileSync(join(dir, path), 'utf8')));
    return fileCache.get(path);
  };

  const buildItems = [...rootXml.matchAll(/<item\b([^>]*)\/>/g)].map((m) => ({
    objectid: attr(m[1], 'objectid'),
    transform: parseTransform(attr(m[1], 'transform')),
  }));

  const result = [];
  for (const item of buildItems) {
    const top = root.get(item.objectid);
    if (!top) continue;
    const meta = settings.get(item.objectid) ?? { name: undefined, parts: new Map() };
    const positions = [];
    const indices = [];
    const parts = [];

    const addMesh = (mesh, transform) => {
      const base = positions.length / 3;
      for (let i = 0; i < mesh.positions.length; i += 3) {
        const p = transform
          ? applyTransform(transform, mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2])
          : [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
        positions.push(p[0], p[1], p[2]);
      }
      for (const idx of mesh.indices) indices.push(base + idx);
    };

    if (top.mesh) {
      addMesh(top.mesh, item.transform);
      parts.push({ name: meta.name, subtype: 'normal_part', triangles: top.mesh.indices.length / 3 });
    }
    for (const comp of top.components) {
      const part = meta.parts.get(comp.objectid) ?? { subtype: 'normal_part', name: undefined };
      const sub = getFile(comp.path).get(comp.objectid);
      const triangles = sub?.mesh ? sub.mesh.indices.length / 3 : 0;
      parts.push({ name: part.name, subtype: part.subtype, triangles });
      // modificadores e volumes negativos não são parte da peça
      if (!sub?.mesh || part.subtype !== 'normal_part') continue;
      addMesh(sub.mesh, compose(comp.transform, item.transform));
    }
    result.push({
      id: item.objectid,
      name: meta.name ?? `objeto ${item.objectid}`,
      parts,
      mesh: { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) },
    });
  }
  return result;
}

export function bounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max, size: max.map((v, k) => v - min[k]) };
}

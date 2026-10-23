// Geometría de hexágonos "pointy-top" en coordenadas axiales (q, r).
// Vértices y aristas viven en una red entera: centro del hex X = 2q + r, Y = 3r.
// Esquinas relativas: N(0,-2) NE(1,-1) SE(1,1) S(0,2) SW(-1,1) NW(-1,-1).
// En píxeles: x = X * (√3/2) * R, y = Y * R / 2 (R = radio del hexágono).

export interface GHex {
  id: string;
  q: number;
  r: number;
  X: number;
  Y: number;
  vertices: string[]; // N, NE, SE, S, SW, NW
  edges: string[]; // NE, E, SE, SW, W, NW (lados)
  neighbors: (string | null)[]; // a través de cada lado
}
export interface GVertex { id: string; X: number; Y: number; hexes: string[]; edges: string[]; neighbors: string[] }
export interface GEdge { id: string; a: string; b: string; hexes: string[]; X: number; Y: number }
export interface Graph {
  hexes: Record<string, GHex>;
  vertices: Record<string, GVertex>;
  edges: Record<string, GEdge>;
}

export const CORNERS: readonly [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
export const SIDES: readonly [number, number][] = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

export const hexId = (q: number, r: number) => `h${q},${r}`;
export const vertexId = (X: number, Y: number) => `v${X},${Y}`;
export const edgeId = (Xa: number, Ya: number, Xb: number, Yb: number) => `e${Xa + Xb},${Ya + Yb}`;

export function parseHex(id: string): [number, number] {
  const [q, r] = id.slice(1).split(',').map(Number);
  return [q, r];
}

export function hexNeighbors(q: number, r: number): [number, number][] {
  return SIDES.map(([dq, dr]) => [q + dq, r + dr]);
}

export function hexDistance(a: [number, number], b: [number, number]): number {
  const dq = a[0] - b[0];
  const dr = a[1] - b[1];
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const cache = new Map<string, Graph>();

export function buildGraph(coords: [number, number][]): Graph {
  const key = coords.map(([q, r]) => `${q},${r}`).sort().join(';');
  const hit = cache.get(key);
  if (hit) return hit;
  const present = new Set(coords.map(([q, r]) => hexId(q, r)));
  const g: Graph = { hexes: {}, vertices: {}, edges: {} };
  for (const [q, r] of coords) {
    const X = 2 * q + r;
    const Y = 3 * r;
    const id = hexId(q, r);
    const vs = CORNERS.map(([dx, dy]) => vertexId(X + dx, Y + dy));
    const es: string[] = [];
    for (let i = 0; i < 6; i++) {
      const [ax, ay] = CORNERS[i];
      const [bx, by] = CORNERS[(i + 1) % 6];
      const eid = edgeId(X + ax, Y + ay, X + bx, Y + by);
      es.push(eid);
      let e = g.edges[eid];
      if (!e) {
        e = { id: eid, a: vs[i], b: vs[(i + 1) % 6], hexes: [], X: (2 * X + ax + bx) / 2, Y: (2 * Y + ay + by) / 2 };
        g.edges[eid] = e;
      }
      e.hexes.push(id);
    }
    for (let i = 0; i < 6; i++) {
      const [dx, dy] = CORNERS[i];
      let v = g.vertices[vs[i]];
      if (!v) {
        v = { id: vs[i], X: X + dx, Y: Y + dy, hexes: [], edges: [], neighbors: [] };
        g.vertices[vs[i]] = v;
      }
      v.hexes.push(id);
    }
    const neighbors = SIDES.map(([dq, dr]) => {
      const nid = hexId(q + dq, r + dr);
      return present.has(nid) ? nid : null;
    });
    g.hexes[id] = { id, q, r, X, Y, vertices: vs, edges: es, neighbors };
  }
  for (const e of Object.values(g.edges)) {
    const va = g.vertices[e.a];
    const vb = g.vertices[e.b];
    va.edges.push(e.id);
    vb.edges.push(e.id);
    va.neighbors.push(vb.id);
    vb.neighbors.push(va.id);
  }
  if (cache.size > 32) cache.clear();
  cache.set(key, g);
  return g;
}

const byObject = new WeakMap<object, Graph>();

export function graphOf(hexes: Record<string, { q: number; r: number }>): Graph {
  let g = byObject.get(hexes);
  if (!g) {
    g = buildGraph(Object.values(hexes).map((h) => [h.q, h.r]));
    byObject.set(hexes, g);
  }
  return g;
}

/** Vértice compartido por dos aristas, o null. */
export function sharedVertex(g: Graph, e1: string, e2: string): string | null {
  const a = g.edges[e1];
  const b = g.edges[e2];
  if (a.a === b.a || a.a === b.b) return a.a;
  if (a.b === b.a || a.b === b.b) return a.b;
  return null;
}

export function otherEnd(g: Graph, edge: string, vertex: string): string {
  const e = g.edges[edge];
  return e.a === vertex ? e.b : e.a;
}

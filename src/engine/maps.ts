// Generadores de mapas propios (no se usan mapas fijos de ninguna edición oficial).
import { Rng } from './rng';
import { buildGraph, hexId, hexNeighbors, parseHex } from './geometry';
import type { Harbor, HexTile, Resource, SeaScenario, Terrain } from './types';

type Cell = string;
type Kind = Resource | 'any';

export interface MapResult {
  hexes: Record<string, HexTile>;
  fog: Record<string, { terrain: Terrain; number: number | null }>;
  harbors: Harbor[];
  robber: string | null;
  homeRegions: number[] | null;
  regionBonus: number;
  regionNames: Record<number, 'main' | 'island' | 'far'>;
  vpTarget: number;
}

const NUMBERS_34 = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const NUMBERS_56 = [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12];
// orden intercalado para subconjuntos balanceados
const NUMBER_CYCLE = [6, 8, 5, 9, 4, 10, 3, 11, 2, 12, 5, 9, 4, 10, 3, 11, 6, 8];

const hot = (n: number | undefined | null) => n === 6 || n === 8;

function neighbors(c: Cell): Cell[] {
  const [q, r] = parseHex(c);
  return hexNeighbors(q, r).map(([a, b]) => hexId(a, b));
}

export function numberPool(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(NUMBER_CYCLE[i % NUMBER_CYCLE.length]);
  return out;
}

/** Reparte números evitando 6/8 adyacentes y números iguales vecinos. */
export function assignNumbers(
  rng: Rng,
  cells: Cell[],
  numbers: number[],
  forbid?: (c: Cell, n: number) => boolean,
): Map<Cell, number> {
  const cellSet = new Set(cells);
  let best = new Map<Cell, number>();
  let bestScore = Infinity;
  for (let attempt = 0; attempt < 400 && bestScore > 0; attempt++) {
    const order = rng.shuffle([...cells]);
    const nums = rng.shuffle([...numbers]);
    const hots = nums.filter(hot);
    const rest = nums.filter((n) => !hot(n));
    const assign = new Map<Cell, number>();
    const free = [...order];
    for (const h of hots) {
      let idx = free.findIndex((c) => !forbid?.(c, h) && !neighbors(c).some((nb) => hot(assign.get(nb))));
      if (idx < 0) idx = 0;
      assign.set(free[idx], h);
      free.splice(idx, 1);
    }
    for (const n of rest) {
      let idx = free.findIndex((c) => !forbid?.(c, n) && !neighbors(c).some((nb) => assign.get(nb) === n));
      if (idx < 0) idx = 0;
      assign.set(free[idx], n);
      free.splice(idx, 1);
    }
    let score = 0;
    for (const [c, n] of assign) {
      if (forbid?.(c, n)) score += 50;
      for (const nb of neighbors(c)) {
        if (!cellSet.has(nb)) continue;
        const m = assign.get(nb);
        if (hot(n) && hot(m)) score += 10;
        else if (m === n) score += 1;
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = assign;
    }
  }
  return best;
}

function rowsLayout(lengths: number[], xc: number): [number, number][] {
  const out: [number, number][] = [];
  const half = Math.floor(lengths.length / 2);
  lengths.forEach((L, i) => {
    const r = i - half;
    const q0 = (xc - r - (L - 1)) / 2;
    for (let k = 0; k < L; k++) out.push([q0 + k, r]);
  });
  return out;
}

function ringAround(land: Set<Cell>): Cell[] {
  const ring = new Set<Cell>();
  for (const c of land) for (const n of neighbors(c)) if (!land.has(n)) ring.add(n);
  return [...ring];
}

function angleOf(c: Cell, cx: number, cy: number): number {
  const [q, r] = parseHex(c);
  return Math.atan2(1.5 * r - cy, Math.sqrt(3) * (q + r / 2) - cx);
}

// ---------- mapa estándar (3-4 y 5-6) ----------

export function standardMap(rng: Rng, big: boolean): MapResult {
  const coords = big ? rowsLayout([3, 4, 5, 6, 5, 4, 3], -1) : rowsLayout([3, 4, 5, 4, 3], 0);
  const land = coords.map(([q, r]) => hexId(q, r));
  const landSet = new Set(land);
  const terrains: Terrain[] = big
    ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 6), ...rep<Terrain>('fields', 6), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5), ...rep<Terrain>('desert', 2)]
    : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3), 'desert'];
  rng.shuffle(terrains);
  const hexes: Record<string, HexTile> = {};
  land.forEach((id, i) => {
    const [q, r] = parseHex(id);
    hexes[id] = { id, q, r, terrain: terrains[i], number: null, region: 0 };
  });
  const producing = land.filter((id) => hexes[id].terrain !== 'desert');
  const nums = assignNumbers(rng, producing, big ? NUMBERS_56 : NUMBERS_34);
  for (const [c, n] of nums) hexes[c].number = n;
  const ring = ringAround(landSet);
  for (const id of ring) {
    const [q, r] = parseHex(id);
    hexes[id] = { id, q, r, terrain: 'sea', number: null };
  }
  // puertos: uno cada dos hexágonos del anillo, en orden angular
  const cx = big ? -Math.sqrt(3) / 2 : 0;
  const ordered = ring.sort((a, b) => angleOf(a, cx, 0) - angleOf(b, cx, 0));
  const kinds: Kind[] = big
    ? ['any', 'any', 'any', 'any', 'any', 'lumber', 'brick', 'wool', 'wool', 'grain', 'ore']
    : ['any', 'any', 'any', 'any', 'lumber', 'brick', 'wool', 'grain', 'ore'];
  rng.shuffle(kinds);
  const g = buildGraph(Object.values(hexes).map((h) => [h.q, h.r]));
  const used = new Set<string>();
  const harbors: Harbor[] = [];
  const offset = rng.int(2);
  for (let i = offset; i < ordered.length && harbors.length < kinds.length; i += 2) {
    const sea = g.hexes[ordered[i]];
    const options: string[] = [];
    sea.neighbors.forEach((nb, side) => {
      if (nb && landSet.has(nb)) options.push(sea.edges[side]);
    });
    rng.shuffle(options);
    const pick = options.find((e) => !used.has(g.edges[e].a) && !used.has(g.edges[e].b));
    if (!pick) continue;
    used.add(g.edges[pick].a);
    used.add(g.edges[pick].b);
    harbors.push({ edge: pick, hex: sea.id, kind: kinds[harbors.length] });
  }
  const deserts = land.filter((id) => hexes[id].terrain === 'desert');
  return {
    hexes, fog: {}, harbors, robber: deserts[0] ?? null,
    homeRegions: null, regionBonus: 0, regionNames: { 0: 'main' }, vpTarget: 10,
  };
}

function rep<T>(x: T, n: number): T[] {
  return Array.from({ length: n }, () => x);
}

// ---------- mapas de Mar Abierto ----------

interface Gen {
  rng: Rng;
  frame: Set<Cell>;
  border: Set<Cell>;
  land: Map<Cell, number>;
  W: number;
  H: number;
  col: (c: Cell) => number;
  row: (c: Cell) => number;
}

function rectGen(rng: Rng, W: number, H: number): Gen {
  const frame = new Set<Cell>();
  const border = new Set<Cell>();
  const colOf = new Map<Cell, number>();
  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const id = hexId(col - Math.floor(row / 2), row);
      frame.add(id);
      colOf.set(id, col);
      if (row === 0 || row === H - 1 || col === 0 || col === W - 1) border.add(id);
    }
  }
  return {
    rng, frame, border, land: new Map(), W, H,
    col: (c) => colOf.get(c) ?? -1,
    row: (c) => parseHex(c)[1],
  };
}

function canUse(g: Gen, c: Cell, region: number, area: (c: Cell) => boolean, allowBorder: boolean): boolean {
  if (!g.frame.has(c) || g.land.has(c) || !area(c)) return false;
  if (!allowBorder && g.border.has(c)) return false;
  return neighbors(c).every((n) => !g.land.has(n) || g.land.get(n) === region);
}

function grow(g: Gen, region: number, size: number, area: (c: Cell) => boolean, allowBorder = false, seed?: Cell): Cell[] | null {
  let start = seed;
  if (!start || !canUse(g, start, region, area, allowBorder)) {
    const seeds = [...g.frame].filter((c) => canUse(g, c, region, area, allowBorder));
    if (!seeds.length) return null;
    start = g.rng.pick(seeds);
  }
  const cells = [start];
  g.land.set(start, region);
  while (cells.length < size) {
    const weights = new Map<Cell, number>();
    for (const c of cells) {
      for (const n of neighbors(c)) {
        if (!canUse(g, n, region, area, allowBorder)) continue;
        const k = neighbors(n).filter((x) => g.land.get(x) === region).length;
        weights.set(n, k * k + 0.4);
      }
    }
    if (!weights.size) {
      for (const c of cells) g.land.delete(c);
      return null;
    }
    const entries = [...weights];
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let x = g.rng.float() * total;
    let chosen = entries[entries.length - 1][0];
    for (const [c, w] of entries) {
      x -= w;
      if (x <= 0) {
        chosen = c;
        break;
      }
    }
    cells.push(chosen);
    g.land.set(chosen, region);
  }
  return cells;
}

function terrainPool(n: number, gold: number, desert: number): Terrain[] {
  const cycle: Terrain[] = ['forest', 'pasture', 'fields', 'hills', 'mountains', 'forest', 'pasture', 'fields', 'mountains', 'hills'];
  const out: Terrain[] = [...rep<Terrain>('gold', gold), ...rep<Terrain>('desert', desert)];
  let i = 0;
  while (out.length < n) out.push(cycle[i++ % cycle.length]);
  return out.slice(0, n);
}

interface SeaPlan {
  vp: number;
  bonus: number;
  home: number[] | null;
  names: Record<number, 'main' | 'island' | 'far'>;
  terrain: Map<Cell, Terrain>;
  fogCells: Set<Cell>;
  harborPlan: { region: number | null; kind: Kind }[];
  noHotOnGold?: boolean;
}

function finishSea(g: Gen, plan: SeaPlan): MapResult {
  const { rng } = g;
  const hexes: Record<string, HexTile> = {};
  const fog: MapResult['fog'] = {};
  const producing = [...plan.terrain].filter(([, t]) => t !== 'desert').map(([c]) => c);
  const nums = assignNumbers(rng, producing, numberPool(producing.length), plan.noHotOnGold ? (c, n) => hot(n) && plan.terrain.get(c) === 'gold' : undefined);
  for (const c of g.frame) {
    const [q, r] = parseHex(c);
    const t = plan.terrain.get(c) ?? 'sea';
    const n = nums.get(c) ?? null;
    if (plan.fogCells.has(c)) {
      hexes[c] = { id: c, q, r, terrain: 'fog', number: null, region: g.land.get(c) };
      fog[c] = { terrain: t, number: n };
    } else {
      hexes[c] = { id: c, q, r, terrain: t, number: n, region: g.land.get(c) };
    }
  }
  // puertos en costas visibles
  const gr = buildGraph([...g.frame].map((c) => parseHex(c)));
  const used = new Set<string>();
  const harbors: Harbor[] = [];
  const near = (v: string) => used.has(v) || gr.vertices[v].neighbors.some((x) => used.has(x));
  for (const item of plan.harborPlan) {
    const cand: { edge: string; sea: string }[] = [];
    for (const [c, region] of g.land) {
      if (plan.fogCells.has(c) || plan.terrain.get(c) === 'desert') continue;
      if (item.region !== null && region !== item.region) continue;
      const h = gr.hexes[c];
      h.neighbors.forEach((nb, side) => {
        if (!nb || g.land.has(nb) || plan.fogCells.has(nb)) return;
        const e = gr.edges[h.edges[side]];
        if (near(e.a) || near(e.b)) return;
        cand.push({ edge: e.id, sea: nb });
      });
    }
    if (!cand.length) continue;
    const pick = rng.pick(cand);
    used.add(gr.edges[pick.edge].a);
    used.add(gr.edges[pick.edge].b);
    harbors.push({ edge: pick.edge, hex: pick.sea, kind: item.kind });
  }
  const deserts = [...plan.terrain].filter(([c, t]) => t === 'desert' && !plan.fogCells.has(c)).map(([c]) => c);
  return {
    hexes, fog, harbors,
    robber: deserts.length ? rng.pick(deserts) : null,
    homeRegions: plan.home,
    regionBonus: plan.bonus,
    regionNames: plan.names,
    vpTarget: plan.vp,
  };
}

function kindsFor(n: number): Kind[] {
  const specific: Kind[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
  const out: Kind[] = [];
  for (let i = 0; i < n; i++) out.push(i < 5 ? specific[i] : 'any');
  return out;
}

export function seaMap(rng: Rng, scenario: SeaScenario, big: boolean): MapResult {
  for (let attempt = 0; attempt < 200; attempt++) {
    const res = trySea(rng, scenario, big);
    if (res) return res;
  }
  throw new Error('no se pudo generar el mapa');
}

function trySea(rng: Rng, scenario: SeaScenario, big: boolean): MapResult | null {
  const W = big ? 11 : 9;
  const H = big ? 8 : 7;
  const g = rectGen(rng, W, H);
  const terrain = new Map<Cell, Terrain>();
  const names: SeaPlan['names'] = { 0: 'main' };
  const fogCells = new Set<Cell>();
  const any = () => true;
  const setTerrain = (cells: Cell[], pool: Terrain[]) => {
    rng.shuffle(pool);
    cells.forEach((c, i) => terrain.set(c, pool[i]));
  };

  if (scenario === 'islands') {
    const mainSize = big ? 28 : 19;
    const main = grow(g, 0, mainSize, (c) => g.col(c) <= (big ? 6 : 5));
    if (!main) return null;
    setTerrain(main, big
      ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 6), ...rep<Terrain>('fields', 5), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5), 'desert']
      : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3), 'desert']);
    const sizes = big ? [4, 3, 3, 3, 2, 2] : [3, 3, 3, 2];
    const smallCells: Cell[] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i + 1, sizes[i], any, true);
      if (!isl) return null;
      names[i + 1] = 'island';
      smallCells.push(...isl);
    }
    setTerrain(smallCells, terrainPool(smallCells.length, 2, 0));
    const hp: SeaPlan['harborPlan'] = kindsFor(big ? 9 : 7).map((kind, i) => ({ region: i < (big ? 6 : 5) ? 0 : null, kind }));
    return finishSea(g, { vp: 13, bonus: 2, home: [0], names, terrain, fogCells, harborPlan: hp });
  }

  if (scenario === 'archipelago') {
    const sizes = big ? [7, 7, 7, 7, 6, 6] : [8, 8, 7, 7];
    const all: Cell[][] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i, sizes[i], any, true);
      if (!isl) return null;
      names[i] = 'island';
      all.push(isl);
    }
    // repartir terrenos en ronda para que cada isla tenga variedad
    const total = all.reduce((s, a) => s + a.length, 0);
    const pool = terrainPool(total, 1, 1);
    rng.shuffle(pool);
    const order = all.map((a) => rng.shuffle([...a]));
    let k = 0;
    for (let round = 0; k < pool.length; round++) {
      for (const isl of order) if (round < isl.length) terrain.set(isl[round], pool[k++]);
    }
    const hp = kindsFor(big ? 10 : 8).map((kind) => ({ region: null, kind }));
    return finishSea(g, { vp: 12, bonus: 2, home: null, names, terrain, fogCells, harborPlan: hp });
  }

  if (scenario === 'fog') {
    const main = grow(g, 0, big ? 22 : 15, (c) => g.col(c) <= (big ? 4 : 3) || g.row(c) >= H - 2);
    if (!main) return null;
    setTerrain(main, terrainPool(main.length, 0, 1));
    const visible = new Set<Cell>(main);
    for (const c of main) for (const n of neighbors(c)) if (g.frame.has(n)) visible.add(n);
    const hiddenArea = (c: Cell) => !visible.has(c) && !neighbors(c).some((n) => visible.has(n) && g.land.has(n));
    const sizes = big ? [5, 4, 4, 3, 3, 2] : [4, 4, 3, 2, 2];
    const hiddenLand: Cell[] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i + 1, sizes[i], hiddenArea, true);
      if (!isl) return null;
      names[i + 1] = 'island';
      hiddenLand.push(...isl);
    }
    setTerrain(hiddenLand, terrainPool(hiddenLand.length, 2, 0));
    for (const c of g.frame) if (!visible.has(c)) fogCells.add(c);
    const hp = kindsFor(big ? 6 : 5).map((kind) => ({ region: 0, kind }));
    return finishSea(g, { vp: 12, bonus: 0, home: [0], names, terrain, fogCells, harborPlan: hp });
  }

  if (scenario === 'desert') {
    const home = grow(g, 0, big ? 20 : 14, (c) => g.col(c) <= (big ? 5 : 4));
    if (!home) return null;
    // franja de desierto pegada a la región de inicio, hacia el este
    const stripSize = big ? 4 : 3;
    const strip: Cell[] = [];
    const DESERT = 90;
    const stripArea = (c: Cell) => g.col(c) >= 2;
    for (let i = 0; i < stripSize; i++) {
      const cand = [...g.frame].filter((c) => !g.land.has(c) && !g.border.has(c) && stripArea(c)
        && neighbors(c).some((n) => g.land.get(n) === 0 || strip.includes(n))
        && (i === 0 ? neighbors(c).some((n) => g.land.get(n) === 0) : neighbors(c).some((n) => strip.includes(n))));
      if (!cand.length) return null;
      cand.sort((a, b) => g.col(b) - g.col(a));
      const c = rng.pick(cand.slice(0, 3));
      strip.push(c);
      g.land.set(c, DESERT);
    }
    // región lejana: pegada a la franja pero nunca a la región de inicio
    const farArea = (c: Cell) => !neighbors(c).some((n) => g.land.get(n) === 0);
    const farSeed = [...g.frame].filter((c) => !g.land.has(c) && farArea(c) && neighbors(c).some((n) => strip.includes(n)) && !g.border.has(c));
    if (!farSeed.length) return null;
    // grow() exige que los vecinos sean de la misma región: tratar la franja como compatible
    for (const c of strip) g.land.set(c, 1);
    const far = grow(g, 1, big ? 9 : 6, farArea, true, rng.pick(farSeed));
    for (const c of strip) g.land.set(c, DESERT);
    if (!far) return null;
    names[1] = 'far';
    const sizes = big ? [3, 2, 2] : [2, 2];
    const isles: Cell[] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i + 2, sizes[i], any, true);
      if (!isl) return null;
      names[i + 2] = 'island';
      isles.push(...isl);
    }
    setTerrain(home, terrainPool(home.length, 0, 0));
    for (const c of strip) terrain.set(c, 'desert');
    setTerrain([...far, ...isles], terrainPool(far.length + isles.length, 2, 0));
    const hp = kindsFor(big ? 8 : 6).map((kind, i) => ({ region: i < 4 ? 0 : null, kind }));
    return finishSea(g, { vp: 12, bonus: 2, home: [0], names, terrain, fogCells, harborPlan: hp, noHotOnGold: true });
  }

  // newWorld: islas al azar
  const target = big ? 40 : 30;
  const count = big ? 4 + rng.int(3) : 3 + rng.int(3);
  const sizes: number[] = [];
  let left = target;
  for (let i = 0; i < count; i++) {
    const remaining = count - i;
    const s = i === count - 1 ? left : Math.max(3, Math.min(left - 3 * (remaining - 1), Math.round(left / remaining + (rng.float() - 0.5) * 4)));
    sizes.push(s);
    left -= s;
  }
  sizes.sort((a, b) => b - a);
  const cells: Cell[] = [];
  for (let i = 0; i < sizes.length; i++) {
    const isl = grow(g, i, sizes[i], any, true);
    if (!isl) return null;
    names[i] = 'island';
    cells.push(...isl);
  }
  setTerrain(cells, terrainPool(cells.length, 2, 1));
  const hp = kindsFor(big ? 10 : 8).map((kind) => ({ region: null, kind }));
  return finishSea(g, { vp: 12, bonus: 2, home: null, names, terrain, fogCells, harborPlan: hp });
}

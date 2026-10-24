// Generadores de mapas propios (no se usan mapas fijos de ninguna edición oficial).
import { Rng } from './rng';
import { buildGraph, hexId, hexNeighbors, parseHex } from './geometry';
import { BARREN, type Harbor, type HexTile, type Resource, type SeaScenario, type Terrain } from './types';

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
  /** datos de escenario: islitas especiales, peñón, circuito de la flota, estrecho */
  marks?: { isles?: string[]; rock?: string[]; loop?: string[]; strait?: string; home?: string[] };
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

export const NUMBERS = { small: NUMBERS_34, big: NUMBERS_56 };

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

export interface StandardOpts {
  /** terrenos a repartir (por defecto, los del juego base) */
  terrains?: Terrain[];
  /** terreno fijo en la casilla más central (lago, oasis, castillo) */
  center?: Terrain;
  /** fichas de número a repartir (por defecto, las del juego base) */
  numbers?: number[];
}

export function standardMap(rng: Rng, big: boolean, opts: StandardOpts = {}): MapResult {
  const coords = big ? rowsLayout([3, 4, 5, 6, 5, 4, 3], -1) : rowsLayout([3, 4, 5, 4, 3], 0);
  const land = coords.map(([q, r]) => hexId(q, r));
  const landSet = new Set(land);
  const terrains: Terrain[] = opts.terrains ? [...opts.terrains] : big
    ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 6), ...rep<Terrain>('fields', 6), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5), ...rep<Terrain>('desert', 2)]
    : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3), 'desert'];
  rng.shuffle(terrains);
  const hexes: Record<string, HexTile> = {};
  // la casilla más central (en el tablero grande hay dos empatadas: se elige una)
  const cx0 = big ? -Math.sqrt(3) / 2 : 0;
  const dist = (id: string) => { const [q, r] = parseHex(id); return Math.hypot(Math.sqrt(3) * (q + r / 2) - cx0, 1.5 * r); };
  const center = [...land].sort((a, b) => dist(a) - dist(b))[0];
  if (opts.center) {
    const i = terrains.indexOf(opts.center);
    if (i >= 0) terrains.splice(i, 1);
  }
  let k = 0;
  for (const id of land) {
    const [q, r] = parseHex(id);
    const terrain = opts.center && id === center ? opts.center : terrains[k++];
    hexes[id] = { id, q, r, terrain, number: null, region: 0 };
  }
  const producing = land.filter((id) => !(BARREN as readonly string[]).includes(hexes[id].terrain));
  const nums = assignNumbers(rng, producing, opts.numbers ?? (big ? NUMBERS_56 : NUMBERS_34));
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
  const barren = land.filter((id) => (BARREN as readonly string[]).includes(hexes[id].terrain));
  const robber = (opts.center && hexes[center].terrain === opts.center ? center : null) ?? barren.find((id) => hexes[id].terrain === 'desert') ?? barren[0] ?? null;
  return {
    hexes, fog: {}, harbors, robber,
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
  harborPlan: { region: number | number[] | null; kind: Kind }[];
  noHotOnGold?: boolean;
  /** casillas de tierra sin ficha de número (islitas especiales) */
  noNumbers?: Set<Cell>;
}

function finishSea(g: Gen, plan: SeaPlan): MapResult {
  const { rng } = g;
  const hexes: Record<string, HexTile> = {};
  const fog: MapResult['fog'] = {};
  const producing = [...plan.terrain].filter(([c, t]) => t !== 'desert' && !plan.noNumbers?.has(c)).map(([c]) => c);
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
      if (item.region !== null && (Array.isArray(item.region) ? !item.region.includes(region) : region !== item.region)) continue;
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
  for (let attempt = 0; attempt < 400; attempt++) {
    const res = scenario === 'bastions' ? tryBastions(rng, big) : trySea(rng, scenario, big);
    if (res) return res;
  }
  throw new Error('no se pudo generar el mapa');
}

/** Tamaño del marco (ancho y alto, para 3-4 y para 5-6) de los escenarios que necesitan más mar. */
const FRAMES: Partial<Record<SeaScenario, [number, number, number, number]>> = {
  tribe: [10, 8, 12, 9],
  looms: [12, 8, 14, 9],
  works: [10, 8, 12, 9],
};

function trySea(rng: Rng, scenario: SeaScenario, big: boolean): MapResult | null {
  const fr = FRAMES[scenario];
  const W = fr ? (big ? fr[2] : fr[0]) : big ? 11 : 9;
  const H = fr ? (big ? fr[3] : fr[1]) : big ? 8 : 7;
  const g = rectGen(rng, W, H);
  const middle = hexId(Math.floor(W / 2) - Math.floor(Math.floor(H / 2) / 2), Math.floor(H / 2));
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

  if (scenario === 'tribe') {
    // una isla grande para todos y, alrededor, las islitas del pueblo isleño: sin números y sin edificios
    const main = grow(g, 0, big ? 27 : 20, any, false, middle);
    if (!main) return null;
    setTerrain(main, big
      ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 5), ...rep<Terrain>('fields', 5), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5), 'desert']
      : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 4), ...rep<Terrain>('mountains', 3), 'desert']);
    const sizes = big ? [3, 3, 3, 2, 2, 2] : [3, 3, 2, 2];
    const isles: Cell[] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i + 1, sizes[i], any, false);
      if (!isl) return null;
      names[i + 1] = 'island';
      isles.push(...isl);
    }
    setTerrain(isles, terrainPool(isles.length, 0, 0));
    const res = finishSea(g, { vp: 13, bonus: 0, home: [0], names, terrain, fogCells, harborPlan: [], noNumbers: new Set(isles) });
    res.marks = { isles };
    return res;
  }

  if (scenario === 'looms') {
    // dos islas grandes a los lados y, entre ellas, islitas con dos aldeas tejedoras cada una
    const westArea = (c: Cell) => g.col(c) <= (big ? 4 : 3);
    const eastArea = (c: Cell) => g.col(c) >= W - (big ? 5 : 4);
    const midArea = (c: Cell) => !westArea(c) && !eastArea(c);
    const size = big ? 16 : 12;
    const west = grow(g, 0, size, westArea);
    const east = west && grow(g, 1, size, eastArea);
    if (!west || !east) return null;
    names[1] = 'main';
    const isles: Cell[] = [];
    for (let i = 0; i < (big ? 5 : 4); i++) {
      const isl = grow(g, i + 2, 2, midArea, false);
      if (!isl) return null;
      names[i + 2] = 'island';
      isles.push(...isl);
    }
    const pool: Terrain[] = big
      ? [...rep<Terrain>('forest', 7), ...rep<Terrain>('pasture', 7), ...rep<Terrain>('fields', 6), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5), 'desert', 'desert']
      : [...rep<Terrain>('forest', 5), ...rep<Terrain>('pasture', 5), ...rep<Terrain>('fields', 5), ...rep<Terrain>('hills', 4), ...rep<Terrain>('mountains', 4), 'desert'];
    rng.shuffle(pool);
    const order = [rng.shuffle([...west]), rng.shuffle([...east])];
    let k = 0;
    for (let round = 0; k < pool.length; round++) for (const isl of order) if (round < isl.length) terrain.set(isl[round], pool[k++]);
    setTerrain(isles, isles.map((_, i) => (i % 2 ? 'forest' : 'pasture')));
    const hp = kindsFor(big ? 11 : 9).map((kind) => ({ region: [0, 1], kind }));
    const res = finishSea(g, { vp: 14, bonus: 0, home: [0, 1], names, terrain, fogCells, harborPlan: hp, noNumbers: new Set(isles) });
    res.marks = { isles };
    return res;
  }

  if (scenario === 'works') {
    // isla grande con un páramo de tres desiertos; las islitas dan un punto; el estrecho separa una de ellas
    const main = grow(g, 0, big ? 30 : 21, any, false, middle);
    if (!main) return null;
    const inMain = new Set(main);
    const inner = (c: Cell) => neighbors(c).filter((n) => inMain.has(n)).length;
    const tris: Cell[][] = [];
    for (const a of main) for (const b of neighbors(a)) for (const c of neighbors(a)) {
      if (b >= c || a >= b || !inMain.has(b) || !inMain.has(c) || !neighbors(b).includes(c)) continue;
      tris.push([a, b, c]);
    }
    if (!tris.length) return null;
    tris.sort((x, y) => y.reduce((s, c) => s + inner(c), 0) - x.reduce((s, c) => s + inner(c), 0));
    const waste = rng.pick(tris.slice(0, 4));
    setTerrain(main.filter((c) => !waste.includes(c)), big
      ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 6), ...rep<Terrain>('fields', 5), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5)]
      : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3)]);
    for (const c of waste) terrain.set(c, 'desert');
    const sizes = big ? [3, 3, 2, 2] : [3, 2, 2];
    const isles: Cell[] = [];
    for (let i = 0; i < sizes.length; i++) {
      const isl = grow(g, i + 1, sizes[i], any, false);
      if (!isl) return null;
      names[i + 1] = 'island';
      isles.push(...isl);
    }
    setTerrain(isles, terrainPool(isles.length, big ? 2 : 1, 0));
    // estrecho: casilla de mar que toca la isla grande y una islita, con la mayor costa posible
    const straits = [...g.frame].filter((c) => !g.land.has(c) && !g.border.has(c)
      && neighbors(c).some((n) => g.land.get(n) === 0) && neighbors(c).some((n) => (g.land.get(n) ?? 0) > 0));
    if (!straits.length) return null;
    const landAround = (c: Cell) => neighbors(c).filter((n) => g.land.has(n)).length;
    straits.sort((a, b) => landAround(b) - landAround(a));
    const hp = kindsFor(big ? 11 : 9).map((kind) => ({ region: 0, kind }));
    const res = finishSea(g, { vp: 10, bonus: 1, home: [0], names, terrain, fogCells, harborPlan: hp, noHotOnGold: true });
    res.marks = { isles, strait: straits[0], rock: waste };
    return res;
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

// ---------- bastiones corsarios: plano propio con terrenos y números al azar ----------

// H: isla de inicio · P: islas corsarias · D: peñón (la flota da vueltas a su alrededor) · '.': mar
const BASTION_PLANS: Record<'small' | 'big', string[]> = {
  small: [
    '..........',
    '.PP...HH..',
    '.PPP..HHH.',
    '....D.HHH.',
    '....D.HHH.',
    '.PP...HHH.',
    '.PPP..HH..',
    '..........',
  ],
  big: [
    '...........',
    '.PP...HHH..',
    '.PPP..HHHH.',
    '....D.HHHH.',
    '.PP.D.HHHH.',
    '.PP.D.HHH..',
    '......HHHH.',
    '.PP...HHH..',
    '.PPP.......',
    '...........',
  ],
};

function tryBastions(rng: Rng, big: boolean): MapResult | null {
  const rows = BASTION_PLANS[big ? 'big' : 'small'];
  const H = rows.length;
  const W = rows[0].length;
  const g = rectGen(rng, W, H);
  const kind = new Map<Cell, string>();
  rows.forEach((row, r) => [...row].forEach((ch, col) => kind.set(hexId(col - Math.floor(r / 2), r), ch)));
  const of = (ch: string) => [...kind].filter(([, k]) => k === ch).map(([c]) => c);
  const home = of('H');
  const rock = of('D');
  const pirate = of('P');
  for (const c of home) g.land.set(c, 0);
  // cada isla corsaria es una región propia
  const names: SeaPlan['names'] = { 0: 'main' };
  let region = 1;
  for (const c of pirate) {
    if (g.land.has(c)) continue;
    const stack = [c];
    g.land.set(c, region);
    while (stack.length) {
      const x = stack.pop()!;
      for (const n of neighbors(x)) if (kind.get(n) === 'P' && !g.land.has(n)) { g.land.set(n, region); stack.push(n); }
    }
    names[region] = 'island';
    region++;
  }
  for (const c of rock) g.land.set(c, 90);
  const terrain = new Map<Cell, Terrain>();
  const setTerrain = (cells: Cell[], pool: Terrain[]) => {
    rng.shuffle(pool);
    cells.forEach((c, i) => terrain.set(c, pool[i]));
  };
  setTerrain(home, big
    ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 5), ...rep<Terrain>('fields', 5), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 4)]
    : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 3), ...rep<Terrain>('fields', 3), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3)]);
  setTerrain(pirate, big
    ? [...rep<Terrain>('forest', 3), ...rep<Terrain>('pasture', 3), ...rep<Terrain>('fields', 3), ...rep<Terrain>('hills', 2), ...rep<Terrain>('mountains', 3), 'gold']
    : [...rep<Terrain>('forest', 2), ...rep<Terrain>('pasture', 2), ...rep<Terrain>('fields', 3), ...rep<Terrain>('hills', 2), ...rep<Terrain>('mountains', 2), 'gold']);
  for (const c of rock) terrain.set(c, 'desert');
  // circuito: el mar que rodea al peñón, en sentido horario
  const loopSet = new Set<Cell>();
  for (const c of rock) for (const n of neighbors(c)) if (kind.get(n) === '.') loopSet.add(n);
  const pos = (c: Cell) => { const [q, r] = parseHex(c); return [Math.sqrt(3) * (q + r / 2), 1.5 * r]; };
  const cx = rock.reduce((a, c) => a + pos(c)[0], 0) / rock.length;
  const cy = rock.reduce((a, c) => a + pos(c)[1], 0) / rock.length;
  const loop = [...loopSet].sort((a, b) => Math.atan2(pos(a)[1] - cy, pos(a)[0] - cx) - Math.atan2(pos(b)[1] - cy, pos(b)[0] - cx));
  const hp = kindsFor(big ? 9 : 8).map((k) => ({ region: 0, kind: k }));
  const res = finishSea(g, { vp: 10, bonus: 0, home: [0], names, terrain, fogCells: new Set(), harborPlan: hp, noHotOnGold: true });
  res.robber = null;
  res.marks = { rock, loop, isles: pirate, home };
  return res;
}

// ---------- mapas de Comarcas (sobre la isla base) ----------

export function shireMap(rng: Rng, shire: string, big: boolean): MapResult {
  const base: Terrain[] = big
    ? [...rep<Terrain>('forest', 6), ...rep<Terrain>('pasture', 6), ...rep<Terrain>('fields', 6), ...rep<Terrain>('hills', 5), ...rep<Terrain>('mountains', 5)]
    : [...rep<Terrain>('forest', 4), ...rep<Terrain>('pasture', 4), ...rep<Terrain>('fields', 4), ...rep<Terrain>('hills', 3), ...rep<Terrain>('mountains', 3)];
  const nums = big ? NUMBERS_56 : NUMBERS_34;
  switch (shire) {
    case 'fishers':
      // el lago reemplaza al desierto, en el centro; con 5-6 queda además un desierto
      return standardMap(rng, big, { terrains: big ? [...base, 'lake', 'desert'] : [...base, 'lake'], center: 'lake' });
    case 'rivers': {
      // dos pantanos (tres con 5-6) en vez del desierto y de unos pastos; una ficha de número menos
      const terrains = [...base];
      terrains.splice(terrains.indexOf('pasture'), 1);
      if (big) terrains.splice(terrains.indexOf('pasture'), 1);
      terrains.push(...rep<Terrain>('swamp', big ? 3 : 2));
      while (terrains.length < (big ? 30 : 19)) terrains.push('forest');
      const numbers = [...nums];
      numbers.splice(numbers.lastIndexOf(12), 1);
      return standardMap(rng, big, { terrains, numbers });
    }
    case 'caravans':
      // el oasis (desierto) en el centro: de él salen las caravanas
      return standardMap(rng, big, { terrains: big ? [...base, 'desert', 'desert'] : [...base, 'desert'], center: 'desert' });
    default:
      return standardMap(rng, big);
  }
}

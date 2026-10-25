// Carretas y peajes: mercados en la costa (castillo, cantera y vidriería; dos de cada uno con 5-6). Cada jugador lleva
// una carreta que carga mercancías en un mercado y las entrega en otro: cada entrega vale un punto y oro. Por los
// caminos ajenos se paga peaje con oro, y los bárbaros de los caminos frenan a las carretas.
import type { Rng } from '../rng';
import * as C from '../core';
import { otherEnd } from '../geometry';
import { GameError, MARKETS, type GameState, type Goods, type Hand, type Market, type Step } from '../types';
import * as Gold from './gold';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

/** Qué sale de cada mercado y adónde va cada mercancía. */
export const STACKS: Record<Market, [Goods, Goods]> = { castle: ['tools', 'sand'], quarry: ['marble', 'sand'], glassworks: ['glass', 'tools'] };
export const DEST: Record<Goods, Market> = { marble: 'castle', glass: 'castle', tools: 'quarry', sand: 'glassworks' };
export const GOODS: readonly Goods[] = ['marble', 'glass', 'tools', 'sand'];
/** Fichas de cada mercancía en la pila de un mercado. */
export const PER_KIND = 6;

/** Niveles de la carreta: movimiento por turno, oro por entrega, dados que ahuyentan bárbaros y costo para llegar a ese nivel. */
export interface Level { mp: number; gold: number; drive: number[]; cost: Partial<Hand> }
export const LEVELS: readonly Level[] = [
  { mp: 4, gold: 1, drive: [], cost: {} },
  { mp: 5, gold: 2, drive: [6], cost: { lumber: 1, wool: 1, grain: 1 } },
  { mp: 6, gold: 2, drive: [5, 6], cost: { lumber: 1, brick: 1, ore: 1 } },
  { mp: 7, gold: 3, drive: [4, 5, 6], cost: { wool: 1, grain: 1, ore: 2 } },
  { mp: 7, gold: 4, drive: [3, 4, 5, 6], cost: { brick: 2, grain: 1, ore: 2 } },
];
export const MAX_LEVEL = LEVELS.length;
export const BOOST = 2;
export const START_GOLD = 5;

export const levelOf = (s: GameState, seat: number): Level => LEVELS[(s.traders?.wagons[seat].level ?? 1) - 1];
const mainTurn = (s: GameState, seat: number) => s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length;

export function setup(s: GameState, rng: Rng) {
  const g = C.G(s);
  const markets: Record<string, Market> = {};
  for (const h of Object.values(s.board.hexes)) if ((MARKETS as readonly string[]).includes(h.terrain)) markets[h.id] = h.terrain as Market;
  const goods: Record<string, Goods[]> = {};
  const next: Record<string, Goods | null> = {};
  const left: Record<string, number> = {};
  for (const [h, m] of Object.entries(markets)) {
    const [a, b] = STACKS[m];
    goods[h] = rng.shuffle([...Array<Goods>(PER_KIND).fill(a), ...Array<Goods>(PER_KIND).fill(b)]);
    next[h] = goods[h][0] ?? null;
    left[h] = goods[h].length;
  }
  // bárbaros: en lados entre dos casillas de tierra, lejos de los mercados y sin tocarse entre ellos
  const barbs: string[] = [];
  const want = s.players.length > 4 ? 4 : 3;
  const cands = rng.shuffle(Object.keys(g.edges).filter((e) => g.edges[e].hexes.length === 2 && g.edges[e].hexes.every((h) => C.hexIsLand(s, h) && !markets[h])));
  for (const e of cands) {
    if (barbs.length >= want) break;
    const ends = [g.edges[e].a, g.edges[e].b];
    if (barbs.some((x) => ends.includes(g.edges[x].a) || ends.includes(g.edges[x].b))) continue;
    barbs.push(e);
  }
  s.hidden.goods = goods;
  s.traders = {
    markets, next, left, barbs,
    wagons: s.players.map(() => ({ at: null, level: 1, cargo: null, mp: 0, boosted: false, stopped: false, tried: [] })),
    delivered: s.players.map(() => 0),
  };
  Gold.setup(s, START_GOLD);
}

/** La carreta empieza en la ciudad de la preparación; si la ciudad está junto a un mercado, ya sale cargada. */
export function placeWagon(s: GameState, seat: number, v: string) {
  const w = s.traders?.wagons[seat];
  if (!w) return;
  w.at = v;
  arrive(s, seat);
  w.stopped = false;
}

/** Al empezar cada turno las carretas recuperan su movimiento. */
export function newTurn(s: GameState) {
  for (const w of s.traders?.wagons ?? []) {
    w.mp = LEVELS[w.level - 1].mp;
    w.boosted = false;
    w.stopped = false;
    w.tried = [];
  }
}

/** El mercado (casilla) junto a un cruce, si lo hay. */
export function marketAt(s: GameState, v: string): string | null {
  const t = s.traders;
  if (!t) return null;
  for (const h of C.G(s).vertices[v].hexes) if (t.markets[h]) return h;
  return null;
}

/** Mercados adonde le sirve ir: con carga, los del destino; sin carga, los que todavía tienen mercancías. */
export function goalHexes(s: GameState, seat: number): string[] {
  const t = s.traders!;
  const w = t.wagons[seat];
  return Object.keys(t.markets).filter((h) => (w.cargo ? t.markets[h] === DEST[w.cargo] : t.left[h] > 0));
}

/** Costo de un lado para la carreta de `seat`: movimiento y, si el camino es ajeno, a quién se paga el peaje. */
export function edgeCost(s: GameState, seat: number, e: string): { mp: number; toll: number | null } {
  const r = s.roads[e];
  let mp = r ? 1 : 2;
  if (s.traders!.barbs.includes(e)) mp += 2;
  return { mp, toll: r && r.owner !== seat ? r.owner : null };
}

export interface Trip { mp: number; tolls: number[]; path: string[] }
const better = (a: Trip, b: Trip) => a.tolls.length < b.tolls.length || (a.tolls.length === b.tolls.length && a.mp < b.mp);

/**
 * Cruces adonde llega la carreta con el movimiento que le queda y el oro para los peajes. De cada cruce se guarda el
 * viaje con menos peajes y, entre esos, el más corto.
 */
export function trips(s: GameState, seat: number): Map<string, Trip> {
  const out = new Map<string, Trip>();
  const t = s.traders;
  if (!t) return out;
  const w = t.wagons[seat];
  if (!w.at || w.stopped || w.mp <= 0) return out;
  const g = C.G(s);
  const gold = s.gold?.[seat] ?? 0;
  const seen = new Map<string, number>([[`${w.at}|0`, 0]]);
  const queue: [string, Trip][] = [[w.at, { mp: 0, tolls: [], path: [] }]];
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (better(queue[i][1], queue[bi][1])) bi = i;
    const [v, trip] = queue.splice(bi, 1)[0];
    if (v !== w.at) {
      const cur = out.get(v);
      if (!cur || better(trip, cur)) out.set(v, trip);
    }
    for (const e of g.vertices[v].edges) {
      if (!C.edgeRoadable(s, e)) continue;
      const c = edgeCost(s, seat, e);
      const mp = trip.mp + c.mp;
      if (mp > w.mp) continue;
      const tolls = c.toll === null ? trip.tolls : [...trip.tolls, c.toll];
      if (tolls.length > gold) continue;
      const x = otherEnd(g, e, v);
      const k = `${x}|${mp}`;
      if ((seen.get(k) ?? Infinity) <= tolls.length) continue;
      seen.set(k, tolls.length);
      queue.push([x, { mp, tolls, path: [...trip.path, e] }]);
    }
  }
  return out;
}

export function move(s: GameState, seat: number, to: string) {
  need(mainTurn(s, seat), 'notYourTurn');
  const trip = trips(s, seat).get(to);
  need(trip, 'illegal');
  const w = s.traders!.wagons[seat];
  for (const owner of trip!.tolls) Gold.pay(s, seat, 1, owner);
  w.mp -= trip!.mp;
  w.at = to;
  C.log(s, 'wagon.move', { seat, n: trip!.tolls.length });
  arrive(s, seat);
}

/** Al llegar a un mercado que le sirve: entrega (punto y oro) y carga la siguiente mercancía. Ahí se detiene. */
function arrive(s: GameState, seat: number) {
  const t = s.traders!;
  const w = t.wagons[seat];
  const h = w.at ? marketAt(s, w.at) : null;
  if (!h || !goalHexes(s, seat).includes(h)) return;
  w.stopped = true;
  if (w.cargo) {
    t.delivered[seat]++;
    C.log(s, 'wagon.deliver', { seat, goods: w.cargo });
    Gold.gain(s, seat, LEVELS[w.level - 1].gold, 'deliver');
    w.cargo = null;
  }
  const stack = s.hidden.goods?.[h] ?? [];
  const load = stack.shift() ?? null;
  t.left[h] = stack.length;
  t.next[h] = stack[0] ?? null;
  if (load) {
    w.cargo = load;
    C.log(s, 'wagon.load', { seat, goods: load });
  }
}

// ---------- mejorar, acelerar y viajar de nuevo ----------

export function canUpgrade(s: GameState, seat: number): boolean {
  const w = s.traders?.wagons[seat];
  return !!w && mainTurn(s, seat) && w.level < MAX_LEVEL && C.hasCards(s.players[seat].hand, LEVELS[w.level].cost);
}

/** Subir de nivel: el movimiento nuevo rinde desde el turno siguiente; el oro por entrega y el dado, enseguida. */
export function upgrade(s: GameState, seat: number) {
  need(canUpgrade(s, seat), 'illegal');
  const w = s.traders!.wagons[seat];
  C.pay(s, seat, LEVELS[w.level].cost);
  w.level++;
  C.log(s, 'wagon.level', { seat, n: w.level });
}

export function canBoost(s: GameState, seat: number): boolean {
  const w = s.traders?.wagons[seat];
  return !!w && mainTurn(s, seat) && !w.boosted && !w.stopped && !!w.at && s.players[seat].hand.grain > 0;
}

export function boost(s: GameState, seat: number) {
  need(canBoost(s, seat), 'illegal');
  const w = s.traders!.wagons[seat];
  C.pay(s, seat, { grain: 1 });
  w.mp += BOOST;
  w.boosted = true;
  C.log(s, 'wagon.boost', { seat });
}

/** Carta de viaje rápido: la carreta vuelve a tener todo su movimiento, aunque ya haya entregado. */
export function haul(s: GameState, seat: number) {
  const w = s.traders?.wagons[seat];
  if (!w) return;
  w.mp = LEVELS[w.level - 1].mp;
  w.stopped = false;
  C.log(s, 'wagon.haul', { seat });
}

// ---------- bárbaros ----------

/** Bárbaros que la carreta puede intentar ahuyentar: en un lado de su cruce, una vez por bárbaro y por turno. */
export function drivable(s: GameState, seat: number): string[] {
  const t = s.traders;
  const w = t?.wagons[seat];
  if (!t || !w?.at || !LEVELS[w.level - 1].drive.length) return [];
  return C.G(s).vertices[w.at].edges.filter((e) => t.barbs.includes(e) && !w.tried.includes(e));
}

export function drive(s: GameState, seat: number, edge: string, rng: Rng) {
  need(mainTurn(s, seat) && drivable(s, seat).includes(edge), 'illegal');
  const w = s.traders!.wagons[seat];
  w.tried.push(edge);
  const die = rng.die();
  const ok = LEVELS[w.level - 1].drive.includes(die);
  C.log(s, ok ? 'wagon.driveOk' : 'wagon.driveFail', { seat, die });
  if (ok) s.steps.unshift({ k: 'barbMove', seat, from: edge, steal: false });
}

/** Lados que se pueden elegir en el paso de mover un bárbaro: primero cuál, después adónde. */
export function barbSpots(s: GameState, st: Extract<Step, { k: 'barbMove' }>): string[] {
  const t = s.traders!;
  if (st.from === null) return [...t.barbs];
  return Object.keys(C.G(s).edges).filter((e) => C.edgeRoadable(s, e) && !t.barbs.includes(e));
}

/** Mueve el bárbaro. Devuelve a quién se le roba (si cayó en un camino ajeno con el caballero o el 7), o null. */
export function placeBarb(s: GameState, st: Extract<Step, { k: 'barbMove' }>, edge: string): { done: boolean; victim: number | null } {
  const t = s.traders!;
  need(barbSpots(s, st).includes(edge), 'illegal');
  if (st.from === null) {
    st.from = edge;
    return { done: false, victim: null };
  }
  t.barbs[t.barbs.indexOf(st.from)] = edge;
  C.log(s, 'barb.move', { seat: st.seat });
  const r = s.roads[edge];
  const victim = st.steal && r && r.owner !== st.seat && C.resourcesIn(s.players[r.owner].hand) > 0 ? r.owner : null;
  return { done: true, victim };
}

/** Puntos: uno por entrega y uno por la carreta al máximo nivel. */
export const wagonPoints = (s: GameState, seat: number) => (s.traders?.wagons[seat].level === MAX_LEVEL ? 1 : 0);

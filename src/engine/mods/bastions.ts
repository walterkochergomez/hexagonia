// Bastiones corsarios: cada jugador tiene un bastión enemigo en las islas del oeste y una sola ruta de barcos,
// sin ramas y por el camino más corto, que pasa por su punto de desembarco y llega al bastión. Las cartas de
// soldado convierten barcos en barcos de guerra. Una flota corsaria da vueltas al peñón y ataca las costas.
// Gana quien toma su bastión y llega a la meta de puntos.
import type { Rng } from '../rng';
import * as C from '../core';
import { otherEnd } from '../geometry';
import { GameError, RESOURCES, type FleetResult, type Fort, type GameState } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const CHIPS = 3;

interface Marks { rock?: string[]; loop?: string[]; isles?: string[]; home?: string[] }

export function setup(s: GameState, rng: Rng, marks: Marks) {
  const g = C.G(s);
  const n = s.players.length;
  const home = new Set(marks.home ?? []);
  const isles = new Set(marks.isles ?? []);
  const px = (v: string) => [g.vertices[v].X * 0.866, g.vertices[v].Y * 0.5] as const;
  const coast = (cells: Set<string>) => [...new Set([...cells].flatMap((h) => g.hexes[h].vertices))]
    .filter((v) => g.vertices[v].edges.some((e) => C.edgeShippable(s, e)));
  const near = (a: string, b: string) => a === b || g.vertices[a].neighbors.includes(b);
  const isleOf = (v: string) => s.board.hexes[g.vertices[v].hexes.find((h) => isles.has(h)) ?? '']?.region ?? -1;
  const dists = new Map<string, Map<string, number>>();
  const D = (t: string) => {
    if (!dists.has(t)) dists.set(t, C.shipDistances(s, t, -1));
    return dists.get(t)!;
  };
  // puertos de salida posibles: la costa oeste de la isla de inicio
  const hcoast = coast(home);
  const minX = Math.min(...hcoast.map((v) => px(v)[0]));
  const starts = hcoast.filter((v) => px(v)[0] <= minX + 1.8);
  // desembarco y bastión en la misma isla corsaria, a 3-5 barcos uno del otro, el bastión más al oeste
  const pc = coast(isles);
  const pairs: { landing: string; fort: string; leg: number }[] = [];
  for (const l of pc) for (const f of pc) {
    if (near(l, f) || isleOf(l) !== isleOf(f) || px(f)[0] > px(l)[0]) continue;
    const leg = D(f).get(l);
    if (leg !== undefined && leg >= 3 && leg <= 5) pairs.push({ landing: l, fort: f, leg });
  }
  // búsqueda al azar de un reparto parejo: rutas del mismo largo, cortas, sin cruzarse y en islas distintas
  type Trip = { start: string; landing: string; fort: string }[];
  const found: { score: number; trip: Trip }[] = [];
  // a dos lados de distancia: dos cruces que comparten un vecino también cuentan como cerca
  const near2 = (a: string, b: string) => near(a, b) || g.vertices[a].neighbors.some((x) => g.vertices[x].neighbors.includes(b));
  for (let trial = 0; trial < 900; trial++) {
    // primero con lugares bien separados; si no alcanza, sólo sin tocarse
    const close = trial < 600 ? near2 : near;
    const goal = 9 + rng.int(4);
    const used: string[] = [];
    const trip: { start: string; landing: string; fort: string; len: number }[] = [];
    for (const st of rng.shuffle([...starts])) {
      if (trip.length >= n) break;
      if (used.some((u) => close(u, st))) continue;
      let pick: (typeof pairs)[number] | null = null;
      let gap = Infinity;
      for (const p of rng.shuffle([...pairs])) {
        if (near(p.landing, st) || used.some((u) => close(u, p.landing) || close(u, p.fort))) continue;
        const len = (D(p.landing).get(st) ?? 99) + p.leg;
        if (Math.abs(len - goal) < gap) { gap = Math.abs(len - goal); pick = p; }
      }
      if (!pick) continue;
      trip.push({ start: st, landing: pick.landing, fort: pick.fort, len: (D(pick.landing).get(st) ?? 99) + pick.leg });
      used.push(st, pick.landing, pick.fort);
    }
    if (trip.length < n) continue;
    const lens = trip.map((x) => x.len);
    const spread = Math.max(...lens) - Math.min(...lens);
    const mean = lens.reduce((a, b) => a + b, 0) / n;
    const byStart = [...trip].sort((a, b) => px(a.start)[1] - px(b.start)[1]);
    const byLand = [...trip].sort((a, b) => px(a.landing)[1] - px(b.landing)[1]);
    // rutas que se cruzan no pueden existir (las rutas no se tocan)
    if (byStart.some((x, i) => x !== byLand[i])) continue;
    const islands = new Set(trip.map((x) => isleOf(x.fort))).size;
    const score = spread * 6 + mean * 3 - islands + (close === near ? 20 : 0);
    found.push({ score, trip });
    if (found.length >= 300) break;
  }
  if (!found.length) throw new Error('bastiones: no hay reparto');
  found.sort((a, b) => a.score - b.score);
  // a cada color le toca un tramo al azar
  const seats = rng.shuffle(s.players.map((p) => p.seat));
  /**
   * Trazado de las rutas: cada una es un carril fijo desde el puerto, por su desembarco, hasta su bastión, por el
   * camino más corto que no toque los carriles ya trazados ni los puertos, desembarcos o bastiones de otros.
   * Así ninguna ruta puede quedar encerrada por otra durante la partida.
   */
  const lane = (from: string, to: string, banned: Set<string>): string[] | null => {
    const prev = new Map<string, string>([[from, '']]);
    const queue = [from];
    while (queue.length) {
      const x = queue.shift()!;
      if (x === to) break;
      if (x !== from && banned.has(x)) continue;
      for (const e of g.vertices[x].edges) {
        if (!C.edgeShippable(s, e)) continue;
        const w = otherEnd(g, e, x);
        if (prev.has(w) || (w !== to && banned.has(w))) continue;
        prev.set(w, e);
        queue.push(w);
      }
    }
    if (!prev.has(to)) return null;
    const out: string[] = [];
    for (let v = to; v !== from;) {
      const e = prev.get(v)!;
      out.unshift(e);
      v = otherEnd(g, e, v);
    }
    return out;
  };
  const plan = (trip: Trip): Fort[] | null => {
    const forts: Fort[] = trip.map((x, i) => ({ seat: seats[i], v: x.fort, landing: x.landing, start: x.start, chips: CHIPS, taken: false, plan: [] }));
    const spots = new Set(forts.flatMap((f) => [f.start, f.landing, f.v]));
    const taken = new Set<string>();
    // primero los trayectos más largos, que tienen menos alternativas
    const order = [...forts].sort((x, y) => (D(y.landing).get(y.start) ?? 0) - (D(x.landing).get(x.start) ?? 0));
    for (const f of order) {
      const mine = new Set([f.start, f.landing, f.v]);
      const banned = new Set([...taken, ...[...spots].filter((v) => !mine.has(v))]);
      const one = lane(f.start, f.landing, new Set([...banned, f.v]));
      if (!one) return null;
      const used = new Set<string>([f.start]);
      for (const e of one) { used.add(g.edges[e].a); used.add(g.edges[e].b); }
      used.delete(f.landing);
      const two = lane(f.landing, f.v, new Set([...banned, ...used]));
      if (!two) return null;
      f.plan = [...one, ...two];
      for (const e of f.plan) { taken.add(g.edges[e].a); taken.add(g.edges[e].b); }
    }
    return forts;
  };
  let forts: Fort[] | null = null;
  let bestScore = Infinity;
  for (const cand of found) {
    const fs = plan(cand.trip);
    if (!fs) continue;
    const lens = fs.map((f) => f.plan.length);
    // parejas y cortas: la diferencia pesa más que el largo
    const score = (Math.max(...lens) - Math.min(...lens)) * 4 + Math.max(...lens);
    if (score < bestScore) {
      bestScore = score;
      forts = fs;
    }
    if (Math.max(...lens) - Math.min(...lens) <= 1 && Math.max(...lens) <= (n > 4 ? 12 : 11)) break;
  }
  if (!forts) throw new Error('bastiones: no hay rutas');
  forts.sort((a, b) => a.seat - b.seat);
  s.bastions = { rock: [...(marks.rock ?? [])], loop: [...(marks.loop ?? [])], fleet: 0, forts, last: null };
  // cada uno empieza con un poblado en su puerto y el primer barco de su carril
  for (const f of forts) {
    s.buildings[f.start] = { owner: f.seat, kind: 'settlement' };
    s.ships[f.plan[0]] = { owner: f.seat };
  }
}

export const warships = (s: GameState, seat: number) => Object.values(s.ships).filter((x) => x.owner === seat && x.war).length;

/** Soldado: el barco normal más cercano al puerto de salida pasa a ser de guerra. */
export function canArm(s: GameState, seat: number): boolean {
  return C.bastionRoute(s, seat).edges.some((e) => !s.ships[e].war);
}

export function arm(s: GameState, seat: number) {
  const e = C.bastionRoute(s, seat).edges.find((x) => !s.ships[x].war);
  need(e, 'illegal');
  s.ships[e!] = { ...s.ships[e!], war: true };
  C.log(s, 'fort.arm', { seat, n: warships(s, seat) });
}

export function canAssault(s: GameState, seat: number): boolean {
  const f = C.fortOf(s, seat);
  if (!f || f.taken || s.turn.phase !== 'main' || s.turn.current !== seat || s.steps.length) return false;
  // el bastión tomado pasa a ser un poblado: hace falta tener uno en reserva
  return C.bastionRoute(s, seat).head === f.v && C.piecesLeft(s, seat).settlement > 0;
}

/** Ataque al bastión (termina el turno): más barcos de guerra que el dado, una muesca; menos, se pierden dos barcos; igual, uno. */
export function assault(s: GameState, seat: number, rng: Rng) {
  need(canAssault(s, seat), 'illegal');
  const f = C.fortOf(s, seat)!;
  const roll = rng.die();
  const w = warships(s, seat);
  if (w > roll) {
    f.chips--;
    C.log(s, 'fort.hit', { seat, roll, w, left: f.chips });
    if (f.chips <= 0) {
      f.taken = true;
      s.buildings[f.v] = { owner: seat, kind: 'settlement' };
      C.log(s, 'fort.taken', { seat });
      if (s.bastions!.forts.every((x) => x.taken)) {
        s.bastions!.fleet = null;
        C.log(s, 'fleet.gone');
      }
    }
    return;
  }
  const lose = w < roll ? 2 : 1;
  const r = C.bastionRoute(s, seat);
  for (const e of r.edges.slice(-lose)) delete s.ships[e];
  C.log(s, 'fort.repelled', { seat, roll, w, n: lose });
}

/** La flota avanza tantas casillas como el dado menor y ataca a quien tenga edificios junto a donde se detiene. */
export function sail(s: GameState, rng: Rng) {
  const b = s.bastions;
  if (!b || b.fleet === null || !s.turn.dice || !b.loop.length) return;
  const d = Math.min(s.turn.dice[0], s.turn.dice[1]);
  b.fleet = (b.fleet + d) % b.loop.length;
  const hex = b.loop[b.fleet];
  C.log(s, 'fleet.sail', { n: d });
  const g = C.G(s);
  const near = new Map<number, number>(); // asiento → ciudades junto a la flota
  for (const v of g.hexes[hex].vertices) {
    const bd = s.buildings[v];
    if (!bd || s.players[bd.owner].neutral) continue;
    near.set(bd.owner, (near.get(bd.owner) ?? 0) + (bd.kind === 'city' && !bd.damaged ? 1 : 0));
  }
  if (!near.size) return;
  const res: FleetResult = { n: s.turn.n, hex, strength: d, won: [], lost: [], tied: [] };
  const picks: Record<number, number> = {};
  for (const [seat, cities] of [...near].sort((a, b) => a[0] - b[0])) {
    const w = warships(s, seat);
    if (d > w) {
      let lost = 0;
      for (let i = 0; i < 1 + cities; i++) {
        const h = s.players[seat].hand;
        const card = C.randomCard({ ...h, paper: 0, cloth: 0, coin: 0 }, rng.float());
        if (!card) break;
        C.pay(s, seat, { [card]: 1 });
        lost++;
      }
      res.lost.push(seat);
      C.log(s, 'fleet.lost', { seat, n: lost, w });
    } else if (w > d) {
      if (RESOURCES.some((r) => s.bank[r] > 0)) picks[seat] = 1;
      res.won.push(seat);
      C.log(s, 'fleet.won', { seat, w });
    } else {
      res.tied.push(seat);
      C.log(s, 'fleet.tied', { seat, w });
    }
  }
  b.last = res;
  if (Object.keys(picks).length) s.steps.unshift({ k: 'pick', reason: 'fleet', waiting: picks });
}

/** ¿Tomó su bastión? (con eso y la meta de puntos, gana) */
export const taken = (s: GameState, seat: number) => !!C.fortOf(s, seat)?.taken;

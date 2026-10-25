// Invasión en la costa: cada vez que alguien funda o mejora un edificio desembarcan bárbaros en la costa. Tres bárbaros
// toman una casilla: no produce y los edificios rodeados de casillas tomadas dejan de valer. Los caballeros, que llegan
// con las cartas, se mueven por los lados y al final del turno echan a los bárbaros cuando son más que ellos.
import type { Rng } from '../rng';
import * as C from '../core';
import { GameError, type GameState, type RaidCard, type Step } from '../types';
import * as Gold from './gold';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const KNIGHTS = 6;
export const SUPPLY = 30;
export const MOVE = 3;
export const MOVE_FAR = 5;
export const DECK: [RaidCard, number][] = [['knighthood', 14], ['swift', 4], ['intrigue', 4], ['treason', 4]];

export function newDeck(rng: Rng): RaidCard[] {
  const out: RaidCard[] = [];
  for (const [c, n] of DECK) for (let i = 0; i < n; i++) out.push(c);
  return rng.shuffle(out);
}

export function setup(s: GameState, rng: Rng, castle: string, coast: string[]) {
  const barbs: Record<string, number> = {};
  let supply = SUPPLY;
  for (const n of [2, 12]) {
    const h = coast.find((x) => s.board.hexes[x].number === n);
    if (h) { barbs[h] = 1; supply--; }
  }
  s.raid = { castle, coast, barbs, supply: supply + (s.players.length > 4 ? 10 : 0), knights: {}, prisoners: s.players.map(() => 0), last: null };
  s.hidden.raidDeck = newDeck(rng);
  Gold.setup(s, 0);
}

export const barbsOn = (s: GameState, hex: string) => s.raid?.barbs[hex] ?? 0;
export const conquered = C.raidConquered;
export const fallen = C.raidFallen;

/** Tres tiradas distintas (sin 7): un bárbaro en la casilla de la costa con ese número. */
export function land(s: GameState, rng: Rng, seat: number) {
  const r = s.raid;
  if (!r || r.supply <= 0) return;
  const used: number[] = [];
  const landed: number[] = [];
  for (let k = 0; k < 3 && r.supply > 0; k++) {
    let n: number;
    do n = rng.die() + rng.die();
    while (n === 7 || used.includes(n));
    used.push(n);
    const spots = r.coast.filter((h) => s.board.hexes[h].number === n && !conquered(s, h)).sort((a, b) => barbsOn(s, a) - barbsOn(s, b));
    const h = spots[0];
    if (!h) continue;
    r.barbs[h] = barbsOn(s, h) + 1;
    r.supply--;
    landed.push(n);
    if (conquered(s, h)) C.log(s, 'raid.conquer', { n });
  }
  C.log(s, 'raid.land', { seat, rolls: used.join(', '), n: landed.length });
}

// ---------- cartas: se resuelven al comprarlas ----------

export function draw(s: GameState, seat: number, rng: Rng) {
  const deck = s.hidden.raidDeck ?? [];
  if (!deck.length) s.hidden.raidDeck = newDeck(rng);
  const card = s.hidden.raidDeck!.shift()!;
  C.log(s, 'raid.card', { seat, card });
  const r = s.raid!;
  switch (card) {
    case 'knighthood':
    case 'swift': {
      const anywhere = card === 'swift';
      if (knightsLeft(s, seat) > 0 && knightSpots(s, anywhere).length) s.steps.unshift({ k: 'raidKnight', seat, anywhere });
      break;
    }
    case 'intrigue':
      // si no hay bárbaros en la costa, se roba otra
      if (!r.coast.some((h) => barbsOn(s, h) > 0)) { draw(s, seat, rng); return; }
      s.steps.unshift({ k: 'raidTake', seat });
      break;
    case 'treason':
      Gold.gain(s, seat, 2, 'treason');
      s.steps.unshift({ k: 'raidShift', seat, left: 2, from: null, used: [] });
      break;
  }
}

export const knightsOf = (s: GameState, seat: number) => Object.entries(s.raid?.knights ?? {}).filter(([, k]) => k.owner === seat).map(([e]) => e);
export const knightsLeft = (s: GameState, seat: number) => KNIGHTS - knightsOf(s, seat).length;
export const castleEdges = (s: GameState) => (s.raid ? C.G(s).hexes[s.raid.castle].edges : []);

/** Lados libres para un caballero nuevo: junto al castillo, o en cualquier lado de tierra. */
export function knightSpots(s: GameState, anywhere: boolean): string[] {
  const ks = s.raid?.knights ?? {};
  const pool = anywhere ? Object.keys(C.G(s).edges).filter((e) => C.edgeRoadable(s, e)) : castleEdges(s);
  return pool.filter((e) => !ks[e]);
}

export function placeKnight(s: GameState, st: Extract<Step, { k: 'raidKnight' }>, edge: string) {
  need(knightSpots(s, st.anywhere).includes(edge) && knightsLeft(s, st.seat) > 0, 'illegal');
  s.raid!.knights[edge] = { owner: st.seat, moved: false };
  C.log(s, 'raid.knight', { seat: st.seat });
}

/** Intriga: un bárbaro de la costa pasa a ser prisionero. */
export function take(s: GameState, seat: number, hex: string) {
  need(s.raid!.coast.includes(hex) && barbsOn(s, hex) > 0, 'illegal');
  s.raid!.barbs[hex]--;
  s.raid!.prisoners[seat]++;
  C.log(s, 'raid.intrigue', { seat, n: s.board.hexes[hex].number ?? 0 });
}

/** Casillas que valen como origen y destino de la traición. */
export function shiftSources(s: GameState, st: Extract<Step, { k: 'raidShift' }>): string[] {
  return s.raid!.coast.filter((h) => barbsOn(s, h) > 0 && !st.used.includes(h));
}
export function shiftTargets(s: GameState, st: Extract<Step, { k: 'raidShift' }>): string[] {
  return s.raid!.coast.filter((h) => h !== st.from && barbsOn(s, h) < 3);
}

/** La traición termina cuando ya movió dos, o cuando no queda qué mover o adónde. */
export function shiftDone(s: GameState, st: Extract<Step, { k: 'raidShift' }>): boolean {
  if (st.left <= 0) return true;
  if (!shiftTargets(s, st).length) return true;
  return st.from === null && !shiftSources(s, st).length && s.raid!.supply <= 0;
}

export function shift(s: GameState, st: Extract<Step, { k: 'raidShift' }>, hex: string): boolean {
  const r = s.raid!;
  if (st.from === null) {
    const sources = shiftSources(s, st);
    if (sources.length) {
      need(sources.includes(hex), 'illegal');
      st.from = hex;
      st.used.push(hex);
      return false;
    }
    // no quedan bárbaros en la costa: sale de la reserva
    need(r.supply > 0, 'illegal');
    st.from = 'supply';
  }
  need(shiftTargets(s, st).includes(hex), 'illegal');
  if (st.from === 'supply') r.supply--;
  else r.barbs[st.from]--;
  r.barbs[hex] = barbsOn(s, hex) + 1;
  C.log(s, 'raid.shift', { seat: st.seat, n: s.board.hexes[hex].number ?? 0 });
  st.from = null;
  st.left--;
  return st.left <= 0;
}

// ---------- caballeros: movimiento ----------

/** Lados a los que llega un caballero (hasta 3 lados, o 5 pagando trigo), sin terminar en uno ocupado ni junto al castillo. */
export function reach(s: GameState, from: string, far: boolean): string[] {
  const g = C.G(s);
  const max = far ? MOVE_FAR : MOVE;
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const e = queue.shift()!;
    const d = dist.get(e)!;
    if (d >= max) continue;
    for (const v of [g.edges[e].a, g.edges[e].b]) {
      for (const x of g.vertices[v].edges) {
        if (dist.has(x) || !C.edgeRoadable(s, x)) continue;
        dist.set(x, d + 1);
        queue.push(x);
      }
    }
  }
  const castle = new Set(castleEdges(s));
  const ks = s.raid!.knights;
  return [...dist.keys()].filter((e) => e !== from && !ks[e] && !castle.has(e));
}

export function move(s: GameState, seat: number, from: string, to: string, far: boolean) {
  const r = s.raid!;
  const k = r.knights[from];
  need(k && k.owner === seat && !k.moved, 'illegal');
  need(reach(s, from, far).includes(to), 'illegal');
  if (far) C.pay(s, seat, { grain: 1 });
  delete r.knights[from];
  r.knights[to] = { owner: seat, moved: true };
  C.log(s, 'raid.move', { seat });
}

/** Al terminar el turno no puede quedar un caballero propio junto al castillo. */
export const stuckAtCastle = (s: GameState, seat: number) => castleEdges(s).filter((e) => {
  const k = s.raid?.knights[e];
  return k && k.owner === seat && !k.moved && reach(s, e, false).length > 0;
});

// ---------- batallas al final del turno ----------

export function battles(s: GameState, rng: Rng) {
  const r = s.raid;
  if (!r) return;
  const g = C.G(s);
  for (const hex of r.coast) {
    const b = barbsOn(s, hex);
    if (!b) continue;
    const sides = g.hexes[hex].edges;
    const here = sides.map((e, i) => ({ e, i, k: r.knights[e] })).filter((x) => x.k);
    if (here.length <= b) continue;
    // victoria: los bárbaros son prisioneros
    const count = new Map<number, number>();
    for (const x of here) count.set(x.k!.owner, (count.get(x.k!.owner) ?? 0) + 1);
    const tie = new Map([...count.keys()].map((p) => [p, rng.float()]));
    const order = [...count.keys()].sort((a, b2) => count.get(b2)! - count.get(a)! || tie.get(b2)! - tie.get(a)!);
    r.barbs[hex] = 0;
    const got = new Map<number, number>();
    if (b < order.length) {
      order.forEach((p, i) => {
        if (i < b) got.set(p, 1);
        else Gold.gain(s, p, 3, 'battle');
      });
    } else {
      for (const p of order) got.set(p, 1);
      got.set(order[0], got.get(order[0])! + b - order.length);
    }
    for (const [p, n] of got) r.prisoners[p] += n;
    // pérdidas: un dado elige un par de lados opuestos
    const d = rng.die();
    const lost: number[] = [];
    for (const x of here) {
      if (x.i % 3 !== (d - 1) % 3) continue;
      delete r.knights[x.e];
      Gold.gain(s, x.k!.owner, 3, 'knight');
      lost.push(x.k!.owner);
    }
    r.last = { n: s.turn.n, hex, barbs: b, knights: here.length, prisoners: Object.fromEntries(got), die: d, lost };
    C.log(s, 'raid.battle', { n: s.board.hexes[hex].number ?? 0, b, k: here.length, die: d });
  }
  for (const k of Object.values(r.knights)) k.moved = false;
}

export const prisonerPoints = (s: GameState, seat: number) => Math.floor((s.raid?.prisoners[seat] ?? 0) / 2);

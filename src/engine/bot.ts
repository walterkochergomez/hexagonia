// Bot simple que sólo elige acciones legales. Sirve para simulaciones masivas y para completar mesa.
import type { Rng } from './rng';
import * as C from './core';
import * as Guild from './guilds';
import * as Duel from './mods/duel';
import * as Fish from './mods/fish';
import * as River from './mods/river';
import * as Caravan from './mods/caravan';
import * as Tribe from './mods/tribe';
import * as Bastions from './mods/bastions';
import * as Works from './mods/works';
import * as Raid from './mods/raid';
import * as Traders from './mods/traders';
import * as X from './mods/expedition';
import * as Gold from './mods/gold';
import { otherEnd } from './geometry';
import {
  CARDS, COMMODITIES, COST, RESOURCES, TRACKS, TRACK_COMMODITY, WONDERS, WONDER_COST, emptyHand, handTotal,
  type Action, type Card, type GameState, type Hand, type Resource,
  type XShip,
} from './types';

/** Asiento que debe actuar ahora (paso pendiente, respuesta a oferta o jugador activo). */
export function whoActs(s: GameState): number | null {
  if (s.winner !== null) return null;
  const st = s.steps[0];
  if (st && st.k !== 'produce') return C.waitingSeats(st)[0] ?? null;
  if (s.trade) {
    const pending = s.trade.to.find((x) => !s.trade!.replies[x]);
    if (pending !== undefined) return pending;
  }
  return C.actorOf(s);
}

function randomCards(rng: Rng, h: Hand, n: number, only?: readonly Card[]): Partial<Hand> {
  const pool: Card[] = [];
  for (const c of only ?? CARDS) for (let i = 0; i < h[c]; i++) pool.push(c);
  rng.shuffle(pool);
  const out: Partial<Hand> = {};
  for (const c of pool.slice(0, n)) out[c] = (out[c] ?? 0) + 1;
  return out;
}

function pickFromBank(rng: Rng, s: GameState, n: number): Partial<Hand> {
  const avail = RESOURCES.reduce((a, r) => a + s.bank[r], 0);
  const k = Math.min(n, avail);
  const out: Partial<Hand> = {};
  const left = { ...s.bank };
  for (let i = 0; i < k; i++) {
    const opts = RESOURCES.filter((r) => left[r] > 0);
    const r = rng.pick(opts);
    left[r]--;
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

const pips = (n: number | null) => (n ? 6 - Math.abs(7 - n) : 0);

function vertexScore(s: GameState, v: string): number {
  return C.G(s).vertices[v].hexes.reduce((a, h) => a + pips(s.board.hexes[h]?.number ?? null), 0);
}

function roadScore(s: GameState, e: string): number {
  const g = C.G(s);
  const ed = g.edges[e];
  let top = 0;
  for (const v of [ed.a, ed.b]) {
    for (const w of [v, ...g.vertices[v].neighbors]) {
      if (s.buildings[w] || !C.vertexLand(s, w) || !C.distanceOk(s, w)) continue;
      const sc = vertexScore(s, w) - (w === v ? 0 : 2);
      if (sc > top) top = sc;
    }
  }
  return top;
}

/** ¿Tiene `seat` un edificio junto a la casilla? */
function mineNear(s: GameState, seat: number, hex: string): boolean {
  return C.G(s).hexes[hex].vertices.some((v) => s.buildings[v]?.owner === seat);
}
function othersNear(s: GameState, seat: number, hex: string): number {
  return C.G(s).hexes[hex].vertices.filter((v) => s.buildings[v] && s.buildings[v].owner !== seat).length;
}

/** Invasión: a qué lado conviene llevar un caballero (junto a la casilla con bárbaros que más importa). */
function raidKnightMove(s: GameState, seat: number, rng: Rng): Action | null {
  const r = s.raid!;
  const g = C.G(s);
  const mine = Raid.knightsOf(s, seat).filter((e) => !r.knights[e].moved);
  if (!mine.length) return null;
  const knightsOn = (h: string) => g.hexes[h].edges.filter((e) => r.knights[e]).length;
  // casillas con bárbaros: primero las que tocan edificios propios y las que se pueden ganar
  const want = r.coast.filter((h) => Raid.barbsOn(s, h) > 0)
    .sort((a, b) => (Number(mineNear(s, seat, b)) * 3 + Raid.barbsOn(s, b) - knightsOn(b)) - (Number(mineNear(s, seat, a)) * 3 + Raid.barbsOn(s, a) - knightsOn(a)));
  const castle = new Set(Raid.castleEdges(s));
  for (const from of rng.shuffle([...mine])) {
    const atCastle = castle.has(from);
    // un caballero que ya está junto a una casilla con bárbaros se queda, salvo que esté en el castillo
    if (!atCastle && g.edges[from].hexes.some((h) => Raid.barbsOn(s, h) > 0) && rng.float() < 0.8) continue;
    for (const far of [false, true]) {
      if (far && !C.hasCards(s.players[seat].hand, { grain: 1 })) break;
      const reach = new Set(Raid.reach(s, from, far));
      for (const h of want) {
        const spot = g.hexes[h].edges.find((e) => reach.has(e));
        if (spot) return { t: 'raidMove', from, to: spot, far };
      }
    }
    if (atCastle) {
      const reach = Raid.reach(s, from, false);
      if (reach.length) return { t: 'raidMove', from, to: rng.pick(reach) };
    }
  }
  return null;
}

/** Escenarios con metas en el mar: a qué cruces conviene acercar los barcos (regalos o aldeas). */
/** Carretas: movimiento que falta (sin contar peajes) desde cada cruce hasta un mercado que le sirva. */
function wagonDistances(s: GameState, seat: number): Map<string, number> {
  const g = C.G(s);
  const dist = new Map<string, number>();
  const queue: [string, number][] = [];
  for (const h of Traders.goalHexes(s, seat)) {
    for (const v of g.hexes[h].vertices) {
      if (!C.vertexLand(s, v) || dist.has(v)) continue;
      dist.set(v, 0);
      queue.push([v, 0]);
    }
  }
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i][1] < queue[bi][1]) bi = i;
    const [v, d] = queue.splice(bi, 1)[0];
    if (d > (dist.get(v) ?? Infinity)) continue;
    for (const e of g.vertices[v].edges) {
      if (!C.edgeRoadable(s, e)) continue;
      const c = Traders.edgeCost(s, seat, e);
      const x = otherEnd(g, e, v);
      const nd = d + c.mp + (c.toll === null ? 0 : 0.5);
      if (nd < (dist.get(x) ?? Infinity)) {
        dist.set(x, nd);
        queue.push([x, nd]);
      }
    }
  }
  return dist;
}

/** Mover la carreta al cruce alcanzable más cerca de su meta (si llega, a la meta). */
function wagonMove(s: GameState, seat: number): Action | null {
  const w = s.traders!.wagons[seat];
  if (!w.at) return null;
  const trips = Traders.trips(s, seat);
  if (!trips.size) return null;
  const dist = wagonDistances(s, seat);
  let bestV: string | null = null;
  let bestD = dist.get(w.at) ?? Infinity;
  for (const [v, trip] of trips) {
    const d = (dist.get(v) ?? Infinity) + trip.tolls.length * 0.25;
    if (d < bestD - 1e-9) {
      bestD = d;
      bestV = v;
    }
  }
  return bestV ? { t: 'wagon', to: bestV } : null;
}

// ---------- expediciones ----------

/** Distancia en lados de mar (sin contar barcos ni movimiento) desde los lados meta. */
function seaDistances(s: GameState, goals: string[]): Map<string, number> {
  const g = C.G(s);
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const e of goals) if (X.seaEdge(s, e) && !dist.has(e)) { dist.set(e, 0); queue.push(e); }
  while (queue.length) {
    const e = queue.shift()!;
    for (const v of [g.edges[e].a, g.edges[e].b]) {
      for (const n of g.vertices[v].edges) {
        if (dist.has(n) || !X.seaEdge(s, n)) continue;
        dist.set(n, dist.get(e)! + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/** Lados meta de un barco según lo que lleva. */
function shipGoals(s: GameState, sh: XShip): string[] {
  const g = C.G(s);
  const x = s.expedition!;
  const sideOf = (hexes: string[]) => hexes.flatMap((h) => g.hexes[h].edges);
  const hasRoom = sh.cargo.length < X.holdOf(s, sh.owner);
  // entregar en el Consejo
  if (sh.cargo.some((c) => c === 'fish' || c === 'spice') && (!hasRoom || sh.cargo.every((c) => c === 'fish' || c === 'spice'))) return sideOf([x.council]);
  // fundar: lados de costa con un cruce libre lejos de la isla de origen
  const foundingSpots = () => Object.keys(g.edges).filter((e) => X.seaEdge(s, e) && [g.edges[e].a, g.edges[e].b].some((v) => C.vertexLand(s, v) && !s.buildings[v] && C.distanceOk(s, v)
    && C.regionsOfVertex(s, v).some((r) => !s.players[sh.owner].homeRegions.includes(r))));
  if (sh.cargo.includes('pioneer')) {
    const spots = foundingSpots();
    if (spots.length) return spots;
  }
  // vacío y casi con lo de un pionero: a puerto, si ya hay dónde fundar
  if (!sh.cargo.length && hasRoom) {
    const h = s.players[sh.owner].hand;
    const near = (['lumber', 'brick', 'wool', 'grain'] as const).filter((r) => h[r] > 0).length >= 3;
    if (near && C.piecesLeft(s, sh.owner).settlement > 0 && foundingSpots().length) {
      return Object.keys(g.edges).filter((e) => X.seaEdge(s, e) && (g.edges[e].hexes.includes(x.council) || [g.edges[e].a, g.edges[e].b].some((v) => s.buildings[v]?.owner === sh.owner)));
    }
  }
  // tripulación: aldea sin visitar o guarida en pie
  if (sh.cargo.includes('crew')) {
    const hexes = [...Object.keys(x.villages).filter((h) => !x.villages[h].visited.includes(sh.owner)), ...Object.keys(x.lairs).filter((h) => !x.lairs[h].taken)];
    if (hexes.length) return sideOf(hexes);
  }
  // pescar
  if (hasRoom && Object.values(x.shoals).some((n) => n > 0)) {
    const shoals = Object.keys(x.shoals).filter((h) => x.shoals[h] > 0);
    if (rngLike(sh.id + s.turn.n) < 0.7) return sideOf(shoals);
  }
  // vacío: volver a puerto para cargar
  if (!sh.cargo.length && hasRoom && rngLike(sh.id * 7 + s.turn.n) < 0.5) {
    const port = Object.keys(g.edges).filter((e) => X.seaEdge(s, e) && (g.edges[e].hexes.includes(x.council) || [g.edges[e].a, g.edges[e].b].some((v) => s.buildings[v]?.owner === sh.owner)));
    return port;
  }
  // explorar: lados de mar junto a la niebla
  const fogSides = Object.keys(g.edges).filter((e) => X.seaEdge(s, e) && g.edges[e].hexes.some((h) => s.board.hexes[h]?.terrain === 'fog'));
  return fogSides;
}
const rngLike = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1 + 1) % 1;

function expeditionMove(s: GameState, seat: number, rng: Rng): Action | null {
  for (const sh of X.shipsOf(s, seat)) {
    // primero lo que se puede hacer donde está
    const found = X.foundSpots(s, sh.id);
    if (found.length) return { t: 'found', ship: sh.id, at: best(rng, found, (v) => vertexScore(s, v)) };
    if (X.canDeliver(s, sh.id)) return { t: 'xdeliver', ship: sh.id };
    const crew = X.crewSpots(s, sh.id);
    if (crew.length) return { t: 'xcrew', ship: sh.id, hex: crew[0] };
    const fish = X.fishSpots(s, sh.id);
    if (fish.length) return { t: 'xfish', ship: sh.id, hex: fish[0] };
    if (sh.mp <= 0) continue;
    const reach = X.reach(s, sh.id);
    if (!reach.size) continue;
    const dist = seaDistances(s, shipGoals(s, sh));
    const here = dist.get(sh.at) ?? Infinity;
    let bestE: string | null = null;
    let bestD = here;
    for (const [e] of reach) {
      const d = dist.get(e) ?? Infinity;
      if (d < bestD) { bestD = d; bestE = e; }
    }
    if (bestE) return { t: 'sail', ship: sh.id, to: bestE };
  }
  return null;
}

function seaGoals(s: GameState, seat: number): string[] {
  const g = C.G(s);
  if (s.tribe) return s.tribe.gifts.flatMap((x) => [g.edges[x.edge].a, g.edges[x.edge].b]);
  if (s.looms) return s.looms.villages.filter((x) => x.cloth > 0 && !x.linked.includes(seat)).map((x) => x.v);
  return [];
}

/** Distancia en barcos desde varias metas a la vez. */
function goalDistances(s: GameState, goals: string[]): Map<string, number> {
  const g = C.G(s);
  const dist = new Map<string, number>(goals.map((v) => [v, 0]));
  const queue = [...goals];
  while (queue.length) {
    const x = queue.shift()!;
    for (const e of g.vertices[x].edges) {
      if (!C.edgeShippable(s, e)) continue;
      const w = otherEnd(g, e, x);
      if (dist.has(w)) continue;
      dist.set(w, dist.get(x)! + 1);
      queue.push(w);
    }
  }
  return dist;
}

/** El mejor lado para un barco nuevo: el que más se acerca a una meta del escenario. */
function shipTowardGoal(s: GameState, seat: number, rng: Rng, ships: string[]): string | null {
  const goals = seaGoals(s, seat);
  if (!goals.length || !ships.length) return null;
  const dist = goalDistances(s, goals);
  const g = C.G(s);
  // si el lado ya es la meta (un regalo), ese
  const gift = s.tribe ? ships.find((e) => s.tribe!.gifts.some((x) => x.edge === e)) : undefined;
  if (gift) return gift;
  const score = (e: string) => -Math.min(dist.get(g.edges[e].a) ?? 99, dist.get(g.edges[e].b) ?? 99);
  const top = best(rng, ships, score);
  return score(top) > -99 ? top : null;
}

function best<T>(rng: Rng, items: T[], score: (x: T) => number): T {
  let top = -Infinity;
  let out: T[] = [];
  for (const it of items) {
    const sc = score(it) + rng.float() * 0.5;
    if (sc > top) {
      top = sc;
      out = [it];
    }
  }
  return out[0];
}

export function botAction(s: GameState, seat: number, rng: Rng): Action | null {
  const st = s.steps[0];
  const p = s.players[seat];
  const h = p.hand;
  if (st && st.k !== 'produce') {
    if (!C.waitingSeats(st).includes(seat)) return null;
    switch (st.k) {
      case 'discard': return { t: 'discard', cards: randomCards(rng, h, st.waiting[seat]) };
      case 'robber': {
        const usePirate = st.pirate && (!st.robber || rng.float() < 0.3) && C.legalPirateHexes(s).length > 0;
        if (usePirate) return { t: 'robber', hex: rng.pick(C.legalPirateHexes(s)), target: 'pirate' };
        const hexes = C.legalRobberHexes(s, seat);
        const mine = (x: string) => C.G(s).hexes[x].vertices.some((v) => s.buildings[v]?.owner === seat);
        return { t: 'robber', hex: best(rng, hexes, (x) => C.robberVictims(s, seat, x).length * 3 + pips(s.board.hexes[x].number) - (mine(x) ? 12 : 0)), target: 'robber' };
      }
      case 'steal': {
        const from = rng.pick(st.from);
        // aldeas tejedoras: con el pirata, a veces una tela en vez de una carta
        const cloth = !!s.looms && st.on === 'pirate' && s.looms.cloth[from] > 0 && (!handTotal(s.players[from].hand) || rng.float() < 0.5);
        return cloth ? { t: 'steal', from, cloth: true } : { t: 'steal', from };
      }
      case 'pick': return { t: 'pick', cards: pickFromBank(rng, s, st.waiting[seat]) };
      case 'monopoly': return { t: 'monopoly', card: rng.pick(RESOURCES) };
      case 'freeRoutes': {
        const left = C.piecesLeft(s, seat);
        const roads = left.road > 0 ? C.legalRoads(s, seat) : [];
        const ships = st.source !== 'diplomat' && left.ship > 0 ? C.legalShips(s, seat) : [];
        if (!roads.length && !ships.length) return { t: 'skipFree' };
        if (ships.length && (!roads.length || rng.float() < 0.4)) return { t: 'freeRoute', edge: rng.pick(ships), ship: true };
        return { t: 'freeRoute', edge: best(rng, roads, (e) => roadScore(s, e)) };
      }
      case 'pillage': return { t: 'pillage', vertex: rng.pick(C.pillageable(s, seat)) };
      case 'defenderPick': return { t: 'defenderPick', track: rng.pick(TRACKS.filter((t) => s.hidden.progress[t].length > 0)) };
      case 'progressLimit': return { t: 'progressDiscard', card: rng.pick(p.progress) };
      case 'metropolis': return { t: 'metropolis', vertex: rng.pick(C.defaultCity(s, seat)) };
      case 'relocate': {
        const opts = C.knightReach(s, st.from, seat).empty.filter((v) => v !== st.from);
        return { t: 'relocate', to: opts.length ? rng.pick(opts) : null };
      }
      case 'deserterChoose': return { t: 'deserterChoose', vertex: rng.pick(Object.keys(s.knights).filter((v) => s.knights[v].owner === seat)) };
      case 'deserterPlace': {
        const opts = C.recruitSpots(s, seat);
        return { t: 'deserterPlace', vertex: opts.length ? rng.pick(opts) : null };
      }
      case 'spy': return { t: 'spyTake', card: st.cards.length && rng.float() < 0.9 ? rng.pick(st.cards) : null };
      case 'masterMerchant': return { t: 'masterTake', cards: randomCards(rng, s.players[st.target].hand, 2) };
      case 'give': return { t: 'give', cards: randomCards(rng, h, st.waiting[seat]) };
      case 'harborOffer': {
        const offers: Record<number, Resource> = {};
        const left = { ...h };
        for (const t of st.targets) {
          const opts = RESOURCES.filter((r) => left[r] > 0);
          if (!opts.length || rng.float() < 0.3) continue;
          const r = rng.pick(opts);
          left[r]--;
          offers[t] = r;
        }
        return { t: 'harborOffer', offers };
      }
      case 'harborReply': return { t: 'harborReply', card: rng.pick(COMMODITIES.filter((c) => h[c] > 0)) };
      case 'quake': return { t: 'quake', edge: rng.pick(Object.keys(s.roads).filter((e) => s.roads[e].owner === seat && !s.roads[e].broken)) };
      case 'gift': {
        const only = st.reason === 'force' ? CARDS : RESOURCES;
        return { t: 'gift', to: rng.pick(st.to[seat]), cards: randomCards(rng, h, st.waiting[seat], only) };
      }
      case 'neutral': return { t: 'neutral', at: rng.pick(Duel.neutralSpots(s, st.what)) };
      case 'camelBid': {
        const opts = (['wool', 'grain'] as const).filter((c) => h[c] > 0);
        if (!opts.length || rng.float() < 0.55) return { t: 'camelBid', bid: {} };
        const c = rng.pick(opts);
        return { t: 'camelBid', bid: { [c]: Math.min(h[c], 1 + rng.int(2)) } };
      }
      case 'placeHarbor': return { t: 'placeHarbor', edge: rng.pick(Tribe.harborSpots(s, seat)) };
      case 'raidKnight': return { t: 'raidPlace', edge: rng.pick(Raid.knightSpots(s, st.anywhere)) };
      case 'barbMove': {
        const spots = Traders.barbSpots(s, st);
        const g = C.G(s);
        const w = s.traders!.wagons[seat];
        const nearMe = (e: string) => (w.at && (g.edges[e].a === w.at || g.edges[e].b === w.at) ? 1 : 0);
        if (st.from === null) return { t: 'barbPlace', edge: best(rng, spots, (e) => (s.roads[e]?.owner === seat ? 6 : 0) + nearMe(e) * 4) };
        // adónde: un camino ajeno de alguien con cartas, lejos de mi carreta
        return { t: 'barbPlace', edge: best(rng, spots, (e) => {
          const r = s.roads[e];
          const foe = r && r.owner !== seat ? (st.steal && C.resourcesIn(s.players[r.owner].hand) > 0 ? 6 : 2) : 0;
          return foe - (r?.owner === seat ? 8 : 0) - nearMe(e) * 6;
        }) };
      }
      case 'raidTake': {
        // la casilla con más bárbaros, mejor si toca edificios propios
        const coast = s.raid!.coast.filter((h) => Raid.barbsOn(s, h) > 0);
        return { t: 'raidTake', hex: best(rng, coast, (h) => Raid.barbsOn(s, h) * 2 + (mineNear(s, seat, h) ? 3 : 0)) };
      }
      case 'raidShift': {
        if (st.from === null && Raid.shiftSources(s, st).length) {
          const src = Raid.shiftSources(s, st);
          return { t: 'raidShift', hex: best(rng, src, (h) => (mineNear(s, seat, h) ? 5 : 0) + Raid.barbsOn(s, h)) };
        }
        const to = Raid.shiftTargets(s, st);
        return { t: 'raidShift', hex: best(rng, to, (h) => (mineNear(s, seat, h) ? -6 : 0) + othersNear(s, seat, h)) };
      }
      case 'camelPlace': {
        const opts = Caravan.legalCamels(s);
        const g = C.G(s);
        const mine = (e: string) => [g.edges[e].a, g.edges[e].b].some((v) => s.buildings[v]?.owner === seat || g.vertices[v].neighbors.some((w) => s.buildings[w]?.owner === seat));
        return { t: 'camel', at: best(rng, opts, (e) => (mine(e) ? 2 : 0)) };
      }
      default: return null;
    }
  }
  const t = s.turn;
  // respuestas a ofertas
  if (s.trade && s.trade.to.includes(seat) && !s.trade.replies[seat]) {
    const can = C.hasCards(h, s.trade.want);
    const r = rng.float();
    if (can && r < 0.35) return { t: 'reply', id: s.trade.id, status: 'accept' };
    if (r < 0.45) {
      const give = randomCards(rng, h, 1);
      const want = { [rng.pick(RESOURCES.filter((x) => !give[x]))]: 1 } as Partial<Hand>;
      if (handTotal(give) > 0) return { t: 'counter', id: s.trade.id, give, want };
    }
    return { t: 'reply', id: s.trade.id, status: 'decline' };
  }
  if (C.actorOf(s) !== seat) return null;
  if (t.phase === 'setup') {
    if (t.setupAwait === 'building') {
      return { t: 'setupBuild', vertex: best(rng, C.legalSetupVertices(s), (v) => vertexScore(s, v)) };
    }
    const r = C.legalSetupRoutes(s, t.setupVertex!);
    if (r.ships.length && (!r.roads.length || rng.float() < 0.3)) return { t: 'setupRoute', edge: rng.pick(r.ships), ship: true };
    return { t: 'setupRoute', edge: best(rng, r.roads, (e) => roadScore(s, e)) };
  }
  if (t.phase === 'preRoll') {
    if (s.settings.guilds && p.progress.includes('alchemist') && rng.float() < 0.3) {
      return { t: 'playProgress', card: 'alchemist', arg: { dice: [rng.int(6) + 1, rng.int(6) + 1] } };
    }
    if (!s.settings.guilds && p.devPlayedTurn !== t.n && p.dev.some((d) => d.type === 'soldier' && d.turn !== t.n) && rng.float() < 0.4
      && (!s.bastions || Bastions.canArm(s, seat))) {
      return { t: 'playDev', card: 'soldier' };
    }
    return { t: 'roll' };
  }
  if (s.trade && s.trade.from === seat) {
    const ok = Object.entries(s.trade.replies).find(([, r]) => r.status !== 'decline');
    if (ok && rng.float() < 0.8) {
      const w = Number(ok[0]);
      const r = ok[1];
      const fromGives = r.status === 'counter' ? r.want! : s.trade.give;
      const withGives = r.status === 'counter' ? r.give! : s.trade.want;
      if (C.hasCards(h, fromGives) && C.hasCards(s.players[w].hand, withGives)) return { t: 'confirmTrade', id: s.trade.id, with: w };
    }
    return { t: 'cancelTrade' };
  }
  const sbp = t.phase === 'specialBuild';
  const left = C.piecesLeft(s, seat);
  const can = (cost: Partial<Hand>) => C.hasCards(h, cost);
  // temblor: reparar antes de seguir con caminos
  if (C.hasBrokenRoad(s, seat) && can(COST.road)) {
    const broken = Object.keys(s.roads).find((e) => s.roads[e].owner === seat && s.roads[e].broken)!;
    return { t: 'build', what: 'repair', at: broken };
  }
  // pesca: gastar fichas
  if (s.fish && t.phase === 'main') {
    if (Fish.bootTargets(s, seat).length && rng.float() < 0.8) return { t: 'passBoot', to: rng.pick(Fish.bootTargets(s, seat)) };
    const robbedMe = s.board.robber && C.G(s).hexes[s.board.robber].vertices.some((v) => s.buildings[v]?.owner === seat);
    if (robbedMe && Fish.canFish(s, seat, 'robber') && rng.float() < 0.6) return { t: 'fish', use: 'robber' };
    for (const use of ['dev', 'road', 'bank', 'steal'] as const) {
      if (Fish.canFish(s, seat, use) && rng.float() < 0.45) return { t: 'fish', use };
    }
  }
  // ríos: puentes y monedas
  if (s.river && (t.phase === 'main' || sbp)) {
    const bridges = River.legalBridges(s, seat);
    if (bridges.length && can(River.BRIDGE_COST) && rng.float() < 0.6) return { t: 'bridge', at: rng.pick(bridges) };
    if (t.phase === 'main' && River.canTradeCoins(s, seat) && rng.float() < 0.5) return { t: 'coins', use: 'trade' };
  }
  // duelo: fichas de comercio
  if (Duel.isDuel(s) && t.phase === 'main') {
    const robbedMe = s.board.robber && C.G(s).hexes[s.board.robber].vertices.some((v) => s.buildings[v]?.owner === seat);
    if (robbedMe && Duel.canUseToken(s, seat, 'robber') && rng.float() < 0.7) return { t: 'token', use: 'robber' };
    if (Duel.canUseToken(s, seat, 'force') && rng.float() < 0.08) return { t: 'token', use: 'force' };
    if (p.soldiers > 0 && s.awards.army.owner !== seat && (p.tokens ?? 0) < 2 && (s.duel?.supply ?? 0) > 0 && rng.float() < 0.1) return { t: 'cashSoldier' };
  }
  // bastiones: atacar cuando hay barcos de guerra suficientes (cierra el turno); armar barcos; seguir la ruta
  if (s.bastions && t.phase === 'main') {
    const w = Bastions.warships(s, seat);
    if (Bastions.canAssault(s, seat) && (w >= 4 || (w >= 2 && rng.float() < 0.3))) return { t: 'assault' };
    if (p.devPlayedTurn !== t.n && p.dev.some((d) => d.type === 'soldier' && d.turn !== t.n) && Bastions.canArm(s, seat)) return { t: 'playDev', card: 'soldier' };
    // con la ruta en el bastión, hacen falta barcos de guerra: comprar cartas
    const f = C.fortOf(s, seat);
    if (f && !f.taken && C.bastionRoute(s, seat).head === f.v && w < 5 && can(COST.dev) && s.decks.dev > 0) return { t: 'buyDev' };
  }
  if (s.bastions && can(COST.ship) && left.ship > 0 && rng.float() < 0.85) {
    const ships = C.legalShips(s, seat);
    if (ships.length) return { t: 'build', what: 'ship', at: ships[0] };
  }
  // invasión: mover caballeros hacia los bárbaros; comprar cartas; oro
  if (s.raid && t.phase === 'main') {
    const mv = rng.float() < 0.85 ? raidKnightMove(s, seat, rng) : null;
    if (mv) return mv;
    if (can(COST.dev) && rng.float() < 0.55) return { t: 'buyDev' };
    if (Gold.canBuy(s, seat) && rng.float() < 0.6) return { t: 'gold', use: 'buy' };
  }
  // expediciones: botar barcos, subir pioneros y tripulaciones, navegar y cumplir misiones
  if (s.expedition && t.phase === 'main') {
    const mine = X.shipsOf(s, seat);
    if (X.canBuildShip(s, seat) && (mine.length < 2 || rng.float() < 0.3)) {
      const spots = X.shipSpots(s, seat);
      return { t: 'xship', at: rng.pick(spots) };
    }
    const xp = s.expedition;
    const crewWork = Object.values(xp.villages).some((v) => !v.visited.includes(seat)) || Object.values(xp.lairs).some((l) => !l.taken) || !!s.hidden.xmarks && Object.values(s.hidden.xmarks).some((m) => m.k !== 'shoal');
    for (const sh of mine) {
      if (X.canLoad(s, seat, sh.id, 'pioneer') && left.settlement > 0 && !sh.cargo.includes('pioneer') && rng.float() < 0.9) return { t: 'xload', ship: sh.id, what: 'pioneer' };
      if (crewWork && X.canLoad(s, seat, sh.id, 'crew') && !sh.cargo.includes('crew') && rng.float() < 0.5) return { t: 'xload', ship: sh.id, what: 'crew' };
    }
    const mv = expeditionMove(s, seat, rng);
    if (mv) return mv;
  }
  // carretas: ahuyentar, mejorar, viajar hacia el mercado, trigo y oro
  if (s.traders && t.phase === 'main') {
    const w = s.traders.wagons[seat];
    const drv = Traders.drivable(s, seat);
    if (drv.length && rng.float() < 0.75) return { t: 'drive', edge: drv[0] };
    if (Traders.canUpgrade(s, seat) && rng.float() < 0.55) return { t: 'wagonUp' };
    const mv = wagonMove(s, seat);
    if (mv) return mv;
    if (Traders.canBoost(s, seat) && w.at && rng.float() < 0.5) {
      // el trigo sirve si con 2 más llega a la meta
      const d = wagonDistances(s, seat).get(w.at) ?? Infinity;
      if (d > 0 && d <= w.mp + Traders.BOOST) return { t: 'wagonBoost' };
    }
    if (Gold.canBuy(s, seat) && (s.gold![seat] ?? 0) >= 4 && rng.float() < 0.6) return { t: 'gold', use: 'buy' };
  }
  // grandes obras: subir la obra propia, o empezar una
  if (s.works) {
    const mine = Works.wonderOf(s, seat);
    if (mine && Works.canBuild(s, seat, mine.id) && rng.float() < 0.9) return { t: 'wonder', id: mine.id };
    if (!mine) for (const id of WONDERS) if (Works.canBuild(s, seat, id) && rng.float() < 0.8) return { t: 'wonder', id };
  }
  // regalos y aldeas: barcos hacia la meta más cercana
  if ((s.tribe || s.looms) && can(COST.ship) && left.ship > 0 && rng.float() < 0.55) {
    const to = shipTowardGoal(s, seat, rng, C.legalShips(s, seat));
    if (to) return { t: 'build', what: 'ship', at: to };
  }
  // construir
  if (can(COST.city) && left.city > 0) {
    const cities = C.legalCities(s, seat);
    if (cities.length) return { t: 'build', what: 'city', at: best(rng, cities, (v) => vertexScore(s, v)) };
  }
  const damaged = Object.values(s.buildings).some((b) => b.owner === seat && b.damaged);
  if (can(COST.settlement) && left.settlement > 0 && !damaged) {
    const spots = C.legalSettlements(s, seat);
    if (spots.length) return { t: 'build', what: 'settlement', at: best(rng, spots, (v) => vertexScore(s, v)) };
  }
  if (s.settings.guilds) {
    for (const tr of rng.shuffle([...TRACKS])) {
      if (Guild.canImprove(s, seat, tr) && rng.float() < 0.7) return { t: 'improve', track: tr };
    }
    if (can(COST.knight) && left.knights[1] > 0 && rng.float() < 0.5) {
      const spots = C.recruitSpots(s, seat);
      if (spots.length) return { t: 'recruit', at: rng.pick(spots) };
    }
    const mine = Object.keys(s.knights).filter((v) => s.knights[v].owner === seat);
    const inactive = mine.filter((v) => !s.knights[v].active);
    if (can(COST.activate) && inactive.length && rng.float() < 0.6) return { t: 'activate', at: rng.pick(inactive) };
    const promotable = mine.filter((v) => Guild.canPromote(s, seat, v));
    if (can(COST.promote) && promotable.length && rng.float() < 0.3) return { t: 'promote', at: rng.pick(promotable) };
    if (can(COST.wall) && left.wall > 0 && rng.float() < 0.3) {
      const walls = Object.keys(s.buildings).filter((v) => { const b = s.buildings[v]; return b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall; });
      if (walls.length) return { t: 'build', what: 'wall', at: rng.pick(walls) };
    }
  }
  // expediciones: con la isla llena, mejor juntar para pioneros que hacer caminos
  const wantRoad = rng.float() < (C.legalSettlements(s, seat).length ? 0.25 : s.expedition ? 0.2 : 0.8);
  if (wantRoad) {
    if (s.settings.openSea && can(COST.ship) && left.ship > 0 && rng.float() < 0.5) {
      const ships = C.legalShips(s, seat);
      if (ships.length) return { t: 'build', what: 'ship', at: rng.pick(ships) };
    }
    if (can(COST.road) && left.road > 0) {
      const roads = C.legalRoads(s, seat);
      if (roads.length) return { t: 'build', what: 'road', at: best(rng, roads, (e) => roadScore(s, e)) };
    }
  }
  if (!s.settings.guilds && can(COST.dev) && s.hidden.devDeck.length && rng.float() < 0.5) return { t: 'buyDev' };
  if (sbp) return { t: 'endTurn' };
  // cartas
  if (!s.settings.guilds && p.devPlayedTurn !== t.n) {
    const playable = p.dev.filter((d) => d.turn !== t.n && d.type !== 'point' && (d.type !== 'soldier' || !s.bastions || Bastions.canArm(s, seat))).map((d) => d.type);
    if (playable.length && rng.float() < 0.5) {
      const card = rng.pick(playable) as 'soldier' | 'roads' | 'plenty' | 'monopoly' | 'haul';
      return { t: 'playDev', card } as Action;
    }
  }
  if (s.settings.guilds && p.progress.length && rng.float() < 0.5) {
    const a = progressAttempt(s, seat, rng);
    if (a) return a;
  }
  // caballeros
  if (s.settings.guilds && rng.float() < 0.3) {
    const ready = Object.keys(s.knights).filter((v) => C.canKnightAct(s, v, seat));
    if (ready.length) {
      const from = rng.pick(ready);
      const k = s.knights[from];
      if (C.robberActive(s) && s.board.robber && C.G(s).hexes[s.board.robber].vertices.includes(from) && rng.float() < 0.5) {
        return { t: 'chase', from, target: 'robber' };
      }
      const reach = C.knightReach(s, from, seat);
      const foes = reach.foes.filter((v) => s.knights[v].level < k.level);
      if (foes.length) return { t: 'knightMove', from, to: rng.pick(foes) };
      if (reach.empty.length && rng.float() < 0.3) return { t: 'knightMove', from, to: rng.pick(reach.empty) };
    }
  }
  // barcos
  if (s.settings.openSea && !t.shipMoved.includes(seat) && rng.float() < 0.15) {
    const movable = C.movableShips(s, seat);
    if (movable.length) {
      const from = rng.pick(movable);
      const targets = C.shipTargets(s, seat, from);
      if (targets.length) return { t: 'moveShip', from, to: rng.pick(targets) };
    }
  }
  // comercio con el banco
  const goals: Partial<Hand>[] = [];
  const wonder = s.works ? Works.wonderOf(s, seat) ?? (WONDERS.map((id) => ({ id })).find((x) => !s.works!.wonders.find((w) => w.id === x.id)!.owner && Works.meets(s, seat, x.id)) ?? null) : null;
  if (wonder) goals.push(WONDER_COST[wonder.id]);
  if (s.bastions && C.legalShips(s, seat).length) goals.push(COST.ship);
  if (left.city > 0 && C.legalCities(s, seat).length) goals.push(COST.city);
  if (left.settlement > 0 && C.legalSettlements(s, seat).length) goals.push(COST.settlement);
  if (s.traders && s.traders.wagons[seat].level < Traders.MAX_LEVEL) goals.push(Traders.LEVELS[s.traders.wagons[seat].level].cost);
  if (s.expedition && left.settlement > 0 && !C.legalSettlements(s, seat).length) goals.unshift(X.PIONEER_COST);
  if (s.expedition && X.shipsOf(s, seat).length < 2) goals.unshift(X.SHIP_COST);
  goals.push(COST.road);
  if (!s.settings.guilds) goals.push(COST.dev);
  else goals.push(COST.knight);
  const goal = rng.float() < 0.75 ? goals[0] : rng.pick(goals);
  const missing = CARDS.filter((c) => (goal[c] ?? 0) > h[c]);
  if (missing.length) {
    for (const c of rng.shuffle([...CARDS])) {
      const ratio = C.ratioFor(s, seat, c);
      if (!s.settings.guilds && !RESOURCES.includes(c as Resource)) continue;
      if (h[c] - (goal[c] ?? 0) >= ratio) {
        const get = rng.pick(missing.filter((m) => s.bank[m] > 0 && (s.settings.guilds || RESOURCES.includes(m as Resource))) as Card[]);
        if (get && get !== c) return { t: 'bank', give: c, get, count: 1 };
      }
    }
  }
  // invasión: antes de terminar, sacar los caballeros del castillo
  if (s.raid && t.phase === 'main') {
    const stuck = Raid.stuckAtCastle(s, seat);
    if (stuck.length) {
      const reach = Raid.reach(s, stuck[0], false);
      return { t: 'raidMove', from: stuck[0], to: rng.pick(reach) };
    }
  }
  // oferta entre jugadores, de vez en cuando
  if (t.phase === 'main' && rng.float() < 0.1 && handTotal(h) > 0 && missing.length) {
    const give = randomCards(rng, h, 1, RESOURCES);
    const wantCard = rng.pick(missing.filter((m) => !give[m]));
    if (handTotal(give) && wantCard) return { t: 'offer', give, want: { [wantCard]: 1 } };
  }
  return { t: 'endTurn' };
}

function progressAttempt(s: GameState, seat: number, rng: Rng): Action | null {
  const p = s.players[seat];
  const card = rng.pick(p.progress);
  if (!Guild.canPlayProgress(s, seat, card)) return null;
  const g = C.G(s);
  const others = s.players.map((x) => x.seat).filter((x) => x !== seat);
  const myVp = C.vpOf(s, seat, false);
  const a = (arg: object = {}): Action => ({ t: 'playProgress', card, arg });
  switch (card) {
    case 'alchemist': return null;
    case 'crane': {
      const tr = TRACKS.filter((x) => Guild.canImprove(s, seat, x, 1));
      return tr.length ? a({ track: rng.pick(tr) }) : null;
    }
    case 'engineer': {
      if (C.piecesLeft(s, seat).wall <= 0) return null;
      const vs = Object.keys(s.buildings).filter((v) => { const b = s.buildings[v]; return b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall; });
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'inventor': {
      const hs = Object.keys(s.board.hexes).filter((x) => { const n = s.board.hexes[x].number; return !!n && ![2, 12, 6, 8].includes(n); });
      if (hs.length < 2) return null;
      rng.shuffle(hs);
      return a({ hexes: [hs[0], hs[1]] });
    }
    case 'medicine': {
      if (!C.hasCards(p.hand, COST.medicine) || C.piecesLeft(s, seat).city <= 0) return null;
      const vs = Object.keys(s.buildings).filter((v) => s.buildings[v].owner === seat && s.buildings[v].kind === 'settlement');
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'smith': {
      const vs = Object.keys(s.knights).filter((v) => Guild.canPromote(s, seat, v));
      return vs.length ? a({ vertices: [rng.pick(vs)] }) : null;
    }
    case 'bishop': return C.robberActive(s) ? a() : null;
    case 'deserter': {
      const t = others.filter((o) => Object.values(s.knights).some((k) => k.owner === o));
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'diplomat': {
      const es = Object.keys(s.roads).filter((e) => C.isOpenRoad(s, e));
      return es.length ? a({ edge: rng.pick(es) }) : null;
    }
    case 'intrigue': {
      const vs = Object.keys(s.knights).filter((v) => s.knights[v].owner !== seat
        && g.vertices[v].edges.some((e) => s.roads[e]?.owner === seat || (s.settings.openSea && s.ships[e]?.owner === seat)));
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'spy': {
      const t = others.filter((o) => s.players[o].progress.length > 0);
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'masterMerchant': {
      const t = others.filter((o) => C.vpOf(s, o, false) > myVp && handTotal(s.players[o].hand) > 0);
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'commercialHarbor': return RESOURCES.some((r) => p.hand[r] > 0) ? a() : null;
    case 'merchant': {
      const hs = Object.keys(s.board.hexes).filter((x) => {
        const tr = s.board.hexes[x].terrain;
        return ['forest', 'hills', 'pasture', 'fields', 'mountains'].includes(tr) && g.hexes[x].vertices.some((v) => s.buildings[v]?.owner === seat);
      });
      return hs.length ? a({ hex: rng.pick(hs) }) : null;
    }
    case 'merchantFleet': return a({ card: rng.pick(CARDS) });
    case 'resourceMonopoly': return a({ card: rng.pick(RESOURCES) });
    case 'tradeMonopoly': return a({ card: rng.pick(COMMODITIES) });
    default: return a();
  }
}

export const _test = { randomCards, emptyHand, TRACK_COMMODITY };

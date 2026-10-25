// Consultas y utilidades compartidas del motor (legalidad, puntos, rutas, manos, registro).
import { graphOf, otherEnd, type Graph } from './geometry';
import {
  CARDS, GameError, LIMITS, RESOURCES, TERRAIN_RESOURCE, handTotal, isCommodity, isResource,
  type Card, type GameState, type Hand, type LogEntry, type Resource, type Step, type Terrain,
} from './types';

export const G = (s: GameState): Graph => graphOf(s.board.hexes);

export const terrainOf = (s: GameState, hex: string): Terrain | 'fog' | undefined => s.board.hexes[hex]?.terrain;
export const isLandTerrain = (t: Terrain | 'fog' | undefined): t is Terrain => t !== undefined && t !== 'sea' && t !== 'fog';
export const hexIsLand = (s: GameState, hex: string) => isLandTerrain(terrainOf(s, hex));
export const hexIsSea = (s: GameState, hex: string) => terrainOf(s, hex) === 'sea';

export function vertexLand(s: GameState, v: string): boolean {
  const vx = G(s).vertices[v];
  return !!vx && vx.hexes.some((h) => hexIsLand(s, h));
}

export function edgeRoadable(s: GameState, e: string): boolean {
  const ed = G(s).edges[e];
  return !!ed && ed.hexes.some((h) => hexIsLand(s, h));
}

export function edgeShippable(s: GameState, e: string): boolean {
  if (!s.settings.openSea) return false;
  const ed = G(s).edges[e];
  return !!ed && ed.hexes.length === 2 && ed.hexes.some((h) => hexIsSea(s, h));
}

export const pirateTouches = (s: GameState, e: string) => !!s.board.pirate && G(s).edges[e].hexes.includes(s.board.pirate);

/** Un vértice bloquea el paso de las rutas de `seat` si hay un edificio o caballero ajeno. */
export function blocksFor(s: GameState, v: string, seat: number): boolean {
  const b = s.buildings[v];
  if (b && b.owner !== seat) return true;
  const k = s.knights[v];
  return !!k && k.owner !== seat;
}

export function routeConnects(s: GameState, seat: number, e: string, layer: Record<string, { owner: number }>): boolean {
  const g = G(s);
  const ed = g.edges[e];
  for (const v of [ed.a, ed.b]) {
    const b = s.buildings[v];
    if (b && b.owner === seat) return true;
    if (blocksFor(s, v, seat)) continue;
    if (g.vertices[v].edges.some((x) => x !== e && layer[x]?.owner === seat)) return true;
  }
  return false;
}

export const isNeutral = (s: GameState, seat: number) => !!s.players[seat]?.neutral;

/** Temblor: con un camino dañado no se construyen caminos nuevos hasta repararlo. */
export const hasBrokenRoad = (s: GameState, seat: number) => Object.values(s.roads).some((r) => r.owner === seat && r.broken);

/** Ríos: lados donde el agua cruza; sólo se pasa con un puente. */
export const isCrossing = (s: GameState, e: string) => !!s.river?.crossings.includes(e);

// ---------- invasión en la costa ----------

/** Casilla tomada por los bárbaros (tres o más). */
export const raidConquered = (s: GameState, hex: string) => (s.raid?.barbs[hex] ?? 0) >= 3;

/** Edificio caído: todas sus casillas de tierra están tomadas (el castillo y el desierto nunca caen). */
export function raidFallen(s: GameState, v: string): boolean {
  if (!s.raid) return false;
  const land = G(s).vertices[v].hexes.filter((h) => hexIsLand(s, h));
  return land.length > 0 && land.every((h) => raidConquered(s, h));
}

export function canRoad(s: GameState, seat: number, e: string): boolean {
  if (!G(s).edges[e] || s.roads[e] || s.ships[e] || isCrossing(s, e)) return false;
  // junto a una casilla tomada no se construyen caminos
  if (s.raid && G(s).edges[e].hexes.some((h) => raidConquered(s, h))) return false;
  if (s.bastions?.forts.some((f) => f.plan.includes(e))) return false; // los carriles de barcos no llevan caminos
  return edgeRoadable(s, e) && routeConnects(s, seat, e, s.roads) && !hasBrokenRoad(s, seat);
}

export function canShip(s: GameState, seat: number, e: string): boolean {
  if (!G(s).edges[e] || s.roads[e] || s.ships[e]) return false;
  if (!edgeShippable(s, e) || pirateTouches(s, e)) return false;
  if (s.bastions) return bastionStep(s, seat, e);
  return routeConnects(s, seat, e, s.ships);
}

// ---------- bastiones: una sola ruta, sin ramas y por el camino más corto ----------

export const fortOf = (s: GameState, seat: number) => s.bastions?.forts.find((f) => f.seat === seat) ?? null;

/** Ruta de barcos de `seat` en orden desde su puerto de salida, y el cruce donde termina. */
export function bastionRoute(s: GameState, seat: number): { edges: string[]; head: string; landed: boolean } {
  const f = fortOf(s, seat);
  if (!f) return { edges: [], head: '', landed: false };
  const g = G(s);
  const edges: string[] = [];
  const seen = new Set<string>();
  let v = f.start;
  let landed = v === f.landing;
  for (;;) {
    const e = g.vertices[v].edges.find((x) => s.ships[x]?.owner === seat && !seen.has(x));
    if (!e) break;
    seen.add(e);
    edges.push(e);
    v = otherEnd(g, e, v);
    if (v === f.landing) landed = true;
  }
  return { edges, head: v, landed };
}

/**
 * Cruces por donde no puede pasar la ruta de `seat`: edificios ajenos, bastiones sin tomar, desembarcos ajenos y
 * cruces que ya toca la ruta de otro jugador (las rutas no se tocan, así ninguna queda encerrada por otra).
 */
function routeBlocked(s: GameState, seat: number, v: string): boolean {
  if (blocksFor(s, v, seat)) return true;
  for (const f of s.bastions?.forts ?? []) {
    if (!f.taken && f.v === v) return true;
    if (f.seat !== seat && f.landing === v) return true;
  }
  return G(s).vertices[v].edges.some((e) => s.ships[e] && s.ships[e].owner !== seat);
}

/** Distancias en barcos hasta `target` por lados navegables libres, sin pasar por cruces bloqueados. */
export function shipDistances(s: GameState, target: string, seat: number): Map<string, number> {
  const g = G(s);
  const dist = new Map<string, number>([[target, 0]]);
  const queue = [target];
  while (queue.length) {
    const x = queue.shift()!;
    const d = dist.get(x)!;
    if (x !== target && routeBlocked(s, seat, x)) continue;
    for (const e of g.vertices[x].edges) {
      if (!edgeShippable(s, e) || s.ships[e] || s.roads[e]) continue;
      const w = otherEnd(g, e, x);
      if (dist.has(w)) continue;
      dist.set(w, d + 1);
      queue.push(w);
    }
  }
  return dist;
}

/** Bastiones: el barco nuevo va en el lado siguiente del carril trazado al empezar. */
function bastionStep(s: GameState, seat: number, e: string): boolean {
  const f = fortOf(s, seat);
  if (!f || f.taken) return false;
  const r = bastionRoute(s, seat);
  return f.plan[r.edges.length] === e;
}

/** Cruces de los carriles ajenos (ahí no se funda). */
export function laneOfOthers(s: GameState, seat: number, v: string): boolean {
  const g = G(s);
  return (s.bastions?.forts ?? []).some((f) => f.seat !== seat && f.plan.some((e) => g.edges[e].a === v || g.edges[e].b === v));
}

export function distanceOk(s: GameState, v: string): boolean {
  return !s.buildings[v] && G(s).vertices[v].neighbors.every((n) => !s.buildings[n]);
}

export function canSettle(s: GameState, seat: number, v: string): boolean {
  const vx = G(s).vertices[v];
  if (!vx || s.buildings[v] || s.knights[v]) return false;
  if (!vertexLand(s, v) || !distanceOk(s, v) || !scenarioSettleOk(s, seat, v)) return false;
  return vx.edges.some((e) => s.roads[e]?.owner === seat || s.ships[e]?.owner === seat);
}

/** Escenarios de Mar Abierto: islitas donde no se funda y, en los bastiones, sólo el punto de desembarco propio. */
function scenarioSettleOk(s: GameState, seat: number, v: string): boolean {
  const land = G(s).vertices[v].hexes.filter((h) => hexIsLand(s, h));
  if (s.tribe && land.every((h) => s.tribe!.hexes.includes(h))) return false;
  if (s.looms && land.every((h) => s.looms!.hexes.includes(h))) return false;
  if (s.bastions && !land.some((h) => s.board.hexes[h].region === 0)) return fortOf(s, seat)?.landing === v;
  if (s.bastions && laneOfOthers(s, seat, v)) return false;
  if (s.raid && G(s).vertices[v].hexes.some((h) => raidConquered(s, h))) return false;
  return true;
}

export function canCity(s: GameState, seat: number, v: string): boolean {
  const b = s.buildings[v];
  return !!b && b.owner === seat && (b.kind === 'settlement' || !!b.damaged);
}

export function setupVertexOk(s: GameState, v: string): boolean {
  const vx = G(s).vertices[v];
  if (!vx || s.buildings[v] || !vertexLand(s, v) || !distanceOk(s, v)) return false;
  if (s.works && (s.works.strait.includes(v) || s.works.waste.includes(v))) return false;
  if (s.bastions && laneOfOthers(s, -1, v)) return false;
  const home = s.board.homeRegions;
  if (!home) return true;
  return vx.hexes.some((h) => hexIsLand(s, h) && home.includes(s.board.hexes[h].region ?? -1));
}

export function setupRouteOk(s: GameState, v: string, e: string, ship: boolean): boolean {
  const ed = G(s).edges[e];
  if (!ed || (ed.a !== v && ed.b !== v) || s.roads[e] || s.ships[e]) return false;
  if (ship && s.bastions) return false; // la única ruta de barcos ya está puesta
  if (s.bastions?.forts.some((f) => f.plan.includes(e))) return false;
  return ship ? edgeShippable(s, e) && !pirateTouches(s, e) : edgeRoadable(s, e) && !isCrossing(s, e);
}

export function piecesUsed(s: GameState, seat: number) {
  let road = 0, ship = 0, settlement = 0, city = 0, wall = 0;
  const knights = [0, 0, 0, 0];
  for (const r of Object.values(s.roads)) if (r.owner === seat) road++;
  for (const r of Object.values(s.ships)) if (r.owner === seat) ship++;
  for (const b of Object.values(s.buildings)) {
    if (b.owner !== seat) continue;
    if (b.kind === 'city') city++;
    else settlement++;
    if (b.wall) wall++;
  }
  for (const k of Object.values(s.knights)) if (k.owner === seat) knights[k.level]++;
  return { road, ship, settlement, city, wall, knights };
}

export function piecesLeft(s: GameState, seat: number) {
  const u = piecesUsed(s, seat);
  return {
    road: LIMITS.road - u.road,
    ship: s.settings.openSea ? LIMITS.ship - u.ship : 0,
    settlement: LIMITS.settlement - u.settlement,
    city: LIMITS.city - u.city,
    wall: s.settings.guilds ? LIMITS.wall - u.wall : 0,
    knights: [0, LIMITS.knightPerLevel - u.knights[1], LIMITS.knightPerLevel - u.knights[2], LIMITS.knightPerLevel - u.knights[3]],
  };
}

// ---------- manos y banco ----------

export function hasCards(h: Hand, cost: Partial<Hand>): boolean {
  return CARDS.every((c) => (cost[c] ?? 0) <= h[c]);
}

export function validHandPart(part: Partial<Hand>): boolean {
  return Object.entries(part).every(([c, n]) => (CARDS as readonly string[]).includes(c) && Number.isInteger(n) && (n as number) >= 0);
}

export function pay(s: GameState, seat: number, cost: Partial<Hand>) {
  const h = s.players[seat].hand;
  if (!hasCards(h, cost)) throw new GameError('cost');
  for (const c of CARDS) {
    const n = cost[c] ?? 0;
    h[c] -= n;
    s.bank[c] += n;
  }
}

/** Entrega hasta n cartas del banco. Devuelve cuántas se entregaron. */
export function gain(s: GameState, seat: number, card: Card, n: number): number {
  const k = Math.max(0, Math.min(n, s.bank[card]));
  s.bank[card] -= k;
  s.players[seat].hand[card] += k;
  return k;
}

export function moveCards(s: GameState, from: number, to: number, cards: Partial<Hand>) {
  const a = s.players[from].hand;
  const b = s.players[to].hand;
  if (!hasCards(a, cards)) throw new GameError('cards');
  for (const c of CARDS) {
    const n = cards[c] ?? 0;
    a[c] -= n;
    b[c] += n;
  }
}

export function randomCard(h: Hand, r: number): Card | null {
  const total = handTotal(h);
  if (!total) return null;
  let x = Math.floor(r * total);
  for (const c of CARDS) {
    if (x < h[c]) return c;
    x -= h[c];
  }
  return null;
}

// ---------- registro ----------

export function log(s: GameState, k: string, p?: LogEntry['p'], to?: number[], alt?: LogEntry['alt']) {
  const e: LogEntry = { n: s.turn.n, k };
  if (p) e.p = p;
  if (to) e.to = to;
  if (alt) e.alt = alt;
  s.log.push(e);
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

export function handText(h: Partial<Hand>): string {
  return CARDS.filter((c) => (h[c] ?? 0) > 0).map((c) => `${h[c]}:${c}`).join(',');
}

// ---------- puntos ----------

export function vpOf(s: GameState, seat: number, hidden = true): number {
  const p = s.players[seat];
  let vp = 0;
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner !== seat || raidFallen(s, v)) continue;
    vp += b.kind === 'city' && !b.damaged ? 2 : 1;
    if (b.metro) vp += 2;
  }
  if (s.awards.road.owner === seat) vp += 2;
  if (!s.settings.guilds && s.awards.army.owner === seat) vp += 2;
  if (s.awards.harbor?.owner === seat) vp += 2;
  vp += camelBonus(s, seat) + wealthBonus(s, seat);
  vp += (s.tribe?.vp[seat] ?? 0) + clothPoints(s, seat) + Math.floor((s.raid?.prisoners[seat] ?? 0) / 2);
  vp += (s.traders?.delivered[seat] ?? 0) + (s.traders?.wagons[seat].level === 5 ? 1 : 0);
  vp += missionPoints(s, seat);
  vp += p.vpCards.length + p.defender;
  if (s.board.merchant?.owner === seat) vp += 1;
  for (const b of p.bonus) vp += b.vp;
  if (hidden) vp += p.dev.filter((d) => d.type === 'point').length;
  return vp;
}

export function vpBreakdown(s: GameState, seat: number) {
  const p = s.players[seat];
  let settlements = 0, cities = 0, metros = 0;
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner !== seat || raidFallen(s, v)) continue;
    if (b.kind === 'city' && !b.damaged) cities++;
    else settlements++;
    if (b.metro) metros++;
  }
  return {
    settlements, cities: cities * 2, metropolis: metros * 2,
    road: s.awards.road.owner === seat ? 2 : 0,
    army: !s.settings.guilds && s.awards.army.owner === seat ? 2 : 0,
    cards: p.dev.filter((d) => d.type === 'point').length + p.vpCards.length,
    defender: p.defender,
    merchant: s.board.merchant?.owner === seat ? 1 : 0,
    bonus: p.bonus.reduce((a, b) => a + b.vp, 0),
    harbor: s.awards.harbor?.owner === seat ? 2 : 0,
    camels: camelBonus(s, seat),
    wealth: wealthBonus(s, seat),
    gifts: s.tribe?.vp[seat] ?? 0,
    cloth: clothPoints(s, seat),
    prisoners: Math.floor((s.raid?.prisoners[seat] ?? 0) / 2),
    goods: s.traders?.delivered[seat] ?? 0,
    missions: missionPoints(s, seat),
    wagon: s.traders?.wagons[seat].level === 5 ? 1 : 0,
  };
}

/** Expediciones: cada 2 pescados entregados, 1 punto; cada especia, 1; y lo ganado en las guaridas. */
export const missionPoints = (s: GameState, seat: number) => {
  const x = s.expedition;
  return x ? Math.floor(x.fish[seat] / 2) + x.spice[seat] + x.lairVp[seat] : 0;
};

/** Aldeas tejedoras: dos telas, un punto. */
export const clothPoints = (s: GameState, seat: number) => Math.floor((s.looms?.cloth[seat] ?? 0) / 2);

// ---------- comercio con el banco ----------

export function harborKinds(s: GameState, seat: number): Set<Resource | 'any'> {
  const g = G(s);
  const out = new Set<Resource | 'any'>();
  for (const h of s.board.harbors) {
    const e = g.edges[h.edge];
    // un edificio caído no usa su puerto
    if ((s.buildings[e.a]?.owner === seat && !raidFallen(s, e.a)) || (s.buildings[e.b]?.owner === seat && !raidFallen(s, e.b))) out.add(h.kind);
  }
  return out;
}

export function ratioFor(s: GameState, seat: number, card: Card): number {
  let r = 4;
  const kinds = harborKinds(s, seat);
  if (kinds.has('any')) r = 3;
  if (s.expedition?.adv[seat]?.includes('trade')) r = Math.min(r, 3); // expediciones: mercaderes
  if (isResource(card) && kinds.has(card)) r = 2;
  if (s.settings.guilds) {
    if (isCommodity(card) && s.players[seat].improvements.trade >= 3) r = 2;
    const m = s.board.merchant;
    if (m && m.owner === seat && TERRAIN_RESOURCE[terrainOf(s, m.hex) as Terrain] === card) r = 2;
    if (s.turn.fleet && s.turn.fleet.seat === seat && s.turn.fleet.card === card) r = 2;
  }
  return r;
}

export function handLimit(s: GameState, seat: number): number {
  return 7 + (s.settings.guilds ? 2 * piecesUsed(s, seat).wall : 0);
}

// ---------- ruta comercial más larga ----------

/** Camellos: tramos con camello y cuántos camellos toca cada cruce. */
export function camelEdges(s: GameState): Set<string> {
  return new Set(s.caravan?.routes.flat() ?? []);
}

/** +1 PV por cada edificio en un cruce entre dos camellos. */
export function camelBonus(s: GameState, seat: number): number {
  if (!s.caravan) return 0;
  const camels = camelEdges(s);
  const g = G(s);
  let n = 0;
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner === seat && g.vertices[v].edges.filter((e) => camels.has(e)).length >= 2) n++;
  }
  return n;
}

/** Ríos: +1 PV para quien tiene más monedas (sin empate); −2 para los que menos tienen (si no están todos iguales). */
export function wealthBonus(s: GameState, seat: number): number {
  const r = s.river;
  if (!r || s.players[seat].neutral) return 0;
  const coins = s.players.filter((p) => !p.neutral).map((p) => r.coins[p.seat] ?? 0);
  const max = Math.max(...coins);
  const min = Math.min(...coins);
  const mine = r.coins[seat] ?? 0;
  if (max === min) return 0;
  if (mine === max && coins.filter((c) => c === max).length === 1) return 1;
  if (mine === min) return -2;
  return 0;
}

/** Puntos que necesita cada uno (la bota vieja pide uno más). */
export const targetOf = (s: GameState, seat: number) => s.settings.vpTarget + (s.fish?.boot === seat ? 1 : 0);

export function longestRoute(s: GameState, seat: number): number {
  const g = G(s);
  const camels = camelEdges(s);
  const own = new Map<string, 'road' | 'ship'>();
  for (const [e, r] of Object.entries(s.roads)) if (r.owner === seat && !r.broken) own.set(e, 'road');
  for (const [e, r] of Object.entries(s.ships)) if (r.owner === seat) own.set(e, 'ship');
  if (!own.size) return 0;
  let best = 0;
  const used = new Set<string>();
  const dfs = (v: string, len: number, last: 'road' | 'ship' | null) => {
    if (len > best) best = len;
    if (len > 0 && blocksFor(s, v, seat)) return;
    const mine = s.buildings[v]?.owner === seat;
    for (const e of g.vertices[v].edges) {
      const kind = own.get(e);
      if (!kind || used.has(e)) continue;
      if (last && kind !== last && !mine) continue;
      used.add(e);
      dfs(otherEnd(g, e, v), len + (kind === 'road' && camels.has(e) ? 2 : 1), kind);
      used.delete(e);
    }
  };
  for (const e of own.keys()) {
    const ed = g.edges[e];
    dfs(ed.a, 0, null);
    dfs(ed.b, 0, null);
  }
  return best;
}

export function updateRoadAward(s: GameState) {
  if (s.looms || s.bastions || s.traders) return; // sin premio por la ruta más larga en estos escenarios
  const n = s.players.length;
  const lens = Array.from({ length: n }, (_, i) => (isNeutral(s, i) ? 0 : longestRoute(s, i)));
  const max = Math.max(...lens);
  const holder = s.awards.road.owner;
  let next: number | null = holder;
  if (holder !== null && lens[holder] >= 5 && lens[holder] >= max) {
    next = holder;
  } else if (max >= 5) {
    const top = lens.map((l, i) => (l === max ? i : -1)).filter((i) => i >= 0);
    next = top.length === 1 ? top[0] : null;
  } else {
    next = null;
  }
  if (next !== holder) {
    if (next === null) log(s, 'award.road.none');
    else log(s, 'award.road', { seat: next, len: lens[next] });
  }
  s.awards.road = { owner: next, len: next === null ? 0 : lens[next] };
}

export function updateArmyAward(s: GameState) {
  if (s.settings.guilds || s.bastions || s.traders) return;
  const holder = s.awards.army.owner;
  const best = holder === null ? 2 : s.players[holder].soldiers;
  let next = holder;
  for (const p of s.players) if (p.soldiers > best && p.soldiers >= 3 && (next === null || p.soldiers > s.players[next].soldiers)) next = p.seat;
  if (next !== holder && next !== null) log(s, 'award.army', { seat: next, size: s.players[next].soldiers });
  s.awards.army = { owner: next, size: next === null ? 0 : s.players[next].soldiers };
}

// ---------- ladrón y pirata ----------

export const robberActive = (s: GameState) => !s.settings.guilds || s.barbarians.attacks > 0;

export function robberHexOk(s: GameState, seat: number, hex: string, friendly = s.settings.friendlyRobber): boolean {
  if (!hexIsLand(s, hex) || hex === s.board.robber) return false;
  // las islitas del pueblo isleño y de las aldeas no se tocan; en el pueblo isleño el ladrón no vuelve al desierto
  if (s.tribe && (s.tribe.hexes.includes(hex) || terrainOf(s, hex) === 'desert')) return false;
  if (s.looms?.hexes.includes(hex)) return false;
  if (friendly) {
    const hx = G(s).hexes[hex];
    if (hx.vertices.some((v) => {
      const b = s.buildings[v];
      return b && b.owner !== seat && !isNeutral(s, b.owner) && vpOf(s, b.owner, false) <= 2;
    })) return false;
  }
  return true;
}

export function legalRobberHexes(s: GameState, seat: number): string[] {
  const all = Object.keys(s.board.hexes);
  const strict = all.filter((h) => robberHexOk(s, seat, h));
  return strict.length ? strict : all.filter((h) => robberHexOk(s, seat, h, false));
}

export function legalPirateHexes(s: GameState): string[] {
  if (!s.settings.openSea && !s.expedition) return [];
  return Object.keys(s.board.hexes).filter((h) => hexIsSea(s, h) && h !== s.board.pirate);
}

export function robberVictims(s: GameState, seat: number, hex: string): number[] {
  const out = new Set<number>();
  for (const v of G(s).hexes[hex].vertices) {
    const b = s.buildings[v];
    if (b && b.owner !== seat && handTotal(s.players[b.owner].hand) > 0) out.add(b.owner);
  }
  return [...out].sort((a, b) => a - b);
}

export function pirateVictims(s: GameState, seat: number, hex: string): number[] {
  const out = new Set<number>();
  for (const e of G(s).hexes[hex].edges) {
    const sh = s.ships[e];
    if (sh && sh.owner !== seat && (handTotal(s.players[sh.owner].hand) > 0 || (s.looms?.cloth[sh.owner] ?? 0) > 0)) out.add(sh.owner);
    // expediciones: los barcos que navegan junto a la casilla
    const xs = s.expedition?.ships.find((x) => x.at === e);
    if (xs && xs.owner !== seat && handTotal(s.players[xs.owner].hand) > 0) out.add(xs.owner);
  }
  return [...out].sort((a, b) => a - b);
}

// ---------- listas de lugares legales (UI y bots) ----------

export function legalRoads(s: GameState, seat: number): string[] {
  return Object.keys(G(s).edges).filter((e) => canRoad(s, seat, e));
}
export function legalShips(s: GameState, seat: number): string[] {
  if (!s.settings.openSea) return [];
  return Object.keys(G(s).edges).filter((e) => canShip(s, seat, e));
}
export function legalSettlements(s: GameState, seat: number): string[] {
  return Object.keys(G(s).vertices).filter((v) => canSettle(s, seat, v));
}
export function legalCities(s: GameState, seat: number): string[] {
  return Object.keys(s.buildings).filter((v) => canCity(s, seat, v));
}
export function legalSetupVertices(s: GameState): string[] {
  return Object.keys(G(s).vertices).filter((v) => setupVertexOk(s, v));
}
export function legalSetupRoutes(s: GameState, v: string): { roads: string[]; ships: string[] } {
  const vx = G(s).vertices[v];
  if (!vx) return { roads: [], ships: [] };
  return {
    roads: vx.edges.filter((e) => setupRouteOk(s, v, e, false)),
    ships: s.settings.openSea ? vx.edges.filter((e) => setupRouteOk(s, v, e, true)) : [],
  };
}

/** Barcos que `seat` puede mover este turno (extremo de una ruta abierta). */
export function movableShips(s: GameState, seat: number): string[] {
  if (!s.settings.openSea || s.bastions) return [];
  const g = G(s);
  const villages = new Set(s.looms?.villages.map((x) => x.v) ?? []);
  return Object.entries(s.ships)
    .filter(([e, sh]) => {
      if (sh.owner !== seat || s.turn.builtShips.includes(e) || pirateTouches(s, e)) return false;
      const ed = g.edges[e];
      return [ed.a, ed.b].some((v) => {
        if (s.buildings[v]?.owner === seat) return false;
        if (s.knights[v]?.owner === seat) return false; // un caballero propio cierra la ruta
        if (villages.has(v)) return false; // la ruta que llega a una aldea queda cerrada
        return !g.vertices[v].edges.some((x) => x !== e && s.ships[x]?.owner === seat);
      });
    })
    .map(([e]) => e);
}

export function shipTargets(s: GameState, seat: number, from: string): string[] {
  const sh = s.ships[from];
  if (!sh) return [];
  delete s.ships[from];
  try {
    return legalShips(s, seat).filter((e) => e !== from);
  } finally {
    s.ships[from] = sh;
  }
}

// ---------- pasos pendientes ----------

export function head(s: GameState): Step | undefined {
  return s.steps[0];
}

export function waitingSeats(st: Step): number[] {
  switch (st.k) {
    case 'discard':
    case 'pick':
    case 'progressLimit':
    case 'give':
    case 'gift':
      return Object.keys(st.waiting).map(Number);
    case 'pillage':
    case 'defenderPick':
    case 'quake':
    case 'camelBid':
      return st.waiting;
    case 'harborReply':
      return Object.keys(st.offers).map(Number);
    case 'produce':
    case 'duelRoll':
    case 'fleet':
      return [];
    case 'deserterChoose':
      return [st.seat];
    default:
      return [st.seat];
  }
}

export function resourcesIn(h: Hand): number {
  return RESOURCES.reduce((a, r) => a + h[r], 0);
}

export function regionsOfVertex(s: GameState, v: string): number[] {
  const out = new Set<number>();
  for (const h of G(s).vertices[v].hexes) {
    const hx = s.board.hexes[h];
    if (hexIsLand(s, h) && hx.region !== undefined && s.board.regionNames[hx.region] !== undefined) out.add(hx.region);
  }
  return [...out];
}

// ---------- caballeros ----------

/** Vértices alcanzables por un caballero desde `from` por rutas propias. */
export function knightReach(s: GameState, from: string, seat: number): { empty: string[]; foes: string[] } {
  const g = G(s);
  const viaShips = s.settings.openSea;
  const seen = new Set<string>([from]);
  const queue: [string, 'road' | 'ship' | null][] = [[from, null]];
  const empty: string[] = [];
  const foes: string[] = [];
  while (queue.length) {
    const [v, last] = queue.shift()!;
    const mine = s.buildings[v]?.owner === seat;
    for (const e of g.vertices[v].edges) {
      let kind: 'road' | 'ship' | null = null;
      if (s.roads[e]?.owner === seat) kind = 'road';
      else if (viaShips && s.ships[e]?.owner === seat) kind = 'ship';
      if (!kind) continue;
      if (last && kind !== last && !mine) continue;
      const w = otherEnd(g, e, v);
      if (seen.has(w)) continue;
      seen.add(w);
      const b = s.buildings[w];
      const k = s.knights[w];
      if (b && b.owner !== seat) continue;
      if (k && k.owner !== seat) {
        foes.push(w);
        continue;
      }
      if (!b && !k) empty.push(w);
      queue.push([w, kind]);
    }
  }
  return { empty, foes };
}

export function recruitSpots(s: GameState, seat: number): string[] {
  const g = G(s);
  return Object.keys(g.vertices).filter((v) => !s.buildings[v] && !s.knights[v]
    && g.vertices[v].edges.some((e) => s.roads[e]?.owner === seat || (s.settings.openSea && s.ships[e]?.owner === seat)));
}

export function canKnightAct(s: GameState, v: string, seat: number): boolean {
  const k = s.knights[v];
  return !!k && k.owner === seat && k.active && k.activatedTurn !== s.turn.n;
}

export function defaultCity(s: GameState, seat: number): string[] {
  return Object.entries(s.buildings).filter(([, b]) => b.owner === seat && b.kind === 'city' && !b.damaged && !b.metro).map(([v]) => v);
}

export function decksOf(s: GameState) {
  return {
    dev: s.raid ? s.hidden.raidDeck?.length ?? 0 : s.hidden.devDeck.length + (s.hidden.devDiscard?.length ?? 0),
    science: s.hidden.progress.science.length,
    trade: s.hidden.progress.trade.length,
    politics: s.hidden.progress.politics.length,
  };
}

/** Quién puede actuar ahora en el flujo principal (sin contar pasos pendientes). */
export function actorOf(s: GameState): number {
  const t = s.turn;
  switch (t.phase) {
    case 'setup':
      return t.setupOrder[t.setupIndex];
    case 'specialBuild':
      return t.sbpOrder[t.sbpIndex];
    case 'paired':
      return t.partner ?? t.current;
    default:
      return t.current;
  }
}

/** Compañero del turno en pareja (5-6 jugadores), o null. */
export function pairedPartner(s: GameState): number | null {
  const n = s.players.length;
  if (n < 5 || s.settings.turnMode !== 'paired') return null;
  return (s.turn.current + 3) % n;
}

export function pillageable(s: GameState, seat: number): string[] {
  return Object.entries(s.buildings)
    .filter(([, b]) => b.owner === seat && b.kind === 'city' && !b.metro && !b.damaged)
    .map(([v]) => v);
}

export function isOpenRoad(s: GameState, e: string): boolean {
  const r = s.roads[e];
  if (!r) return false;
  const g = G(s);
  const ed = g.edges[e];
  const closed = (v: string) => s.buildings[v]?.owner === r.owner
    || g.vertices[v].edges.some((x) => x !== e && s.roads[x]?.owner === r.owner);
  return !closed(ed.a) || !closed(ed.b);
}

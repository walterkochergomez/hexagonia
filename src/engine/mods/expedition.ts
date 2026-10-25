// Expediciones: desde la isla de origen se explora un mar tapado con barcos que se mueven. Los barcos llevan pioneros
// (fundan poblados en islas lejanas sin camino) y tripulaciones (misiones). Misiones a elección: pesca para el Consejo,
// especias de las aldeas y guaridas piratas.
import * as C from '../core';
import {
  GameError, type Advantage, type GameState, type Hand, type XMark, type XShip,
} from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const SHIP_COST: Partial<Hand> = { lumber: 1, wool: 1 };
export const PIONEER_COST: Partial<Hand> = { lumber: 1, brick: 1, wool: 1, grain: 1 };
export const CREW_COST: Partial<Hand> = { wool: 1, ore: 1 };
export const MAX_SHIPS = 3;
export const HOLD = 2;
export const MOVE = 4;
export const SHOAL_FISH = 4;
export const FISH_PER_VP = 2;
export const LAIR_CREWS = 3;
export const ADVANTAGES: readonly Advantage[] = ['sails', 'holds', 'trade'];

const mainTurn = (s: GameState, seat: number) => s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length;

export function setup(s: GameState, council: string, marks: Record<string, XMark>) {
  s.hidden.xmarks = marks;
  s.expedition = {
    council, ships: [], nextId: 1,
    shoals: {}, villages: {}, lairs: {},
    fish: s.players.map(() => 0), spice: s.players.map(() => 0), lairVp: s.players.map(() => 0),
    adv: s.players.map(() => []),
  };
}

/** Al descubrirse una casilla, su marca (banco, aldea o guarida) pasa a verse. */
export function onReveal(s: GameState, hex: string) {
  const x = s.expedition;
  const m = s.hidden.xmarks?.[hex];
  if (!x || !m) return;
  delete s.hidden.xmarks![hex];
  if (m.k === 'shoal') x.shoals[hex] = SHOAL_FISH;
  else if (m.k === 'village') x.villages[hex] = { adv: m.adv, visited: [] };
  else x.lairs[hex] = { crews: [], taken: false };
}

export const hasAdv = (s: GameState, seat: number, a: Advantage) => !!s.expedition?.adv[seat]?.includes(a);
export const holdOf = (s: GameState, seat: number) => HOLD + (hasAdv(s, seat, 'holds') ? 1 : 0);
export const moveOf = (s: GameState, seat: number) => MOVE + (hasAdv(s, seat, 'sails') ? 1 : 0);
export const shipsOf = (s: GameState, seat: number) => s.expedition?.ships.filter((x) => x.owner === seat) ?? [];
export const shipById = (s: GameState, id: number) => s.expedition?.ships.find((x) => x.id === id);
export const shipOn = (s: GameState, e: string) => s.expedition?.ships.find((x) => x.at === e);

/** Lado de mar navegable: toca una casilla de mar ya descubierta. */
export function seaEdge(s: GameState, e: string): boolean {
  const ed = C.G(s).edges[e];
  return !!ed && ed.hexes.some((h) => C.hexIsSea(s, h));
}
const pirateEdge = (s: GameState, e: string) => !!s.board.pirate && C.G(s).edges[e].hexes.includes(s.board.pirate);

/** En puerto: el barco está junto a un edificio propio o junto al Consejo. */
export function inPort(s: GameState, ship: XShip): boolean {
  const g = C.G(s);
  const ed = g.edges[ship.at];
  if (ed.hexes.includes(s.expedition!.council)) return true;
  return [ed.a, ed.b].some((v) => s.buildings[v]?.owner === ship.owner);
}

// ---------- barcos ----------

/** Lados donde `seat` puede botar un barco: de mar, libres, junto a un edificio propio o al Consejo. */
export function shipSpots(s: GameState, seat: number): string[] {
  const x = s.expedition;
  if (!x) return [];
  const g = C.G(s);
  return Object.keys(g.edges).filter((e) => {
    if (!seaEdge(s, e) || shipOn(s, e) || pirateEdge(s, e)) return false;
    const ed = g.edges[e];
    return ed.hexes.includes(x.council) || [ed.a, ed.b].some((v) => s.buildings[v]?.owner === seat);
  });
}

export function canBuildShip(s: GameState, seat: number): boolean {
  return !!s.expedition && mainTurn(s, seat) && shipsOf(s, seat).length < MAX_SHIPS && C.hasCards(s.players[seat].hand, SHIP_COST) && shipSpots(s, seat).length > 0;
}

export function buildShip(s: GameState, seat: number, e: string, free = false) {
  const x = s.expedition!;
  if (!free) {
    need(canBuildShip(s, seat) && shipSpots(s, seat).includes(e), 'illegal');
    C.pay(s, seat, SHIP_COST);
  }
  // un barco nuevo navega desde el turno siguiente
  x.ships.push({ id: x.nextId++, owner: seat, at: e, cargo: [], mp: 0, fished: false });
  C.log(s, 'xship.build', { seat });
}

/** Cargar un pionero o una tripulación nuevos en un barco en puerto con lugar. */
export function canLoad(s: GameState, seat: number, id: number, what: 'pioneer' | 'crew'): boolean {
  const sh = shipById(s, id);
  if (!sh || sh.owner !== seat || !mainTurn(s, seat)) return false;
  if (sh.cargo.length >= holdOf(s, seat) || !inPort(s, sh)) return false;
  return C.hasCards(s.players[seat].hand, what === 'pioneer' ? PIONEER_COST : CREW_COST);
}

export function load(s: GameState, seat: number, id: number, what: 'pioneer' | 'crew') {
  need(canLoad(s, seat, id, what), 'illegal');
  C.pay(s, seat, what === 'pioneer' ? PIONEER_COST : CREW_COST);
  shipById(s, id)!.cargo.push(what);
  C.log(s, what === 'pioneer' ? 'xship.pioneer' : 'xship.crew', { seat });
}

/** Lados a los que llega un barco con el movimiento que le queda, y por dónde pasa. */
export function reach(s: GameState, id: number): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const sh = shipById(s, id);
  if (!sh || sh.mp <= 0) return out;
  const g = C.G(s);
  const prev = new Map<string, string[]>([[sh.at, []]]);
  const queue = [sh.at];
  while (queue.length) {
    const e = queue.shift()!;
    const path = prev.get(e)!;
    if (path.length >= sh.mp) continue;
    for (const v of [g.edges[e].a, g.edges[e].b]) {
      for (const n of g.vertices[v].edges) {
        if (prev.has(n) || !seaEdge(s, n) || pirateEdge(s, n)) continue;
        const p = [...path, n];
        prev.set(n, p);
        queue.push(n);
        if (!shipOn(s, n)) out.set(n, p);
      }
    }
  }
  return out;
}

/** Mover un barco. `reveal` descubre las casillas tapadas junto a cada lado por donde pasa. */
export function sail(s: GameState, seat: number, id: number, to: string, reveal: (e: string) => void) {
  need(mainTurn(s, seat), 'notYourTurn');
  const sh = shipById(s, id);
  need(sh && sh.owner === seat, 'illegal');
  const path = reach(s, id).get(to);
  need(path, 'illegal');
  for (const e of path!) reveal(e);
  sh!.at = to;
  sh!.mp -= path!.length;
  C.log(s, 'xship.sail', { seat });
}

// ---------- pioneros ----------

/** Cruces donde el pionero de un barco puede fundar un poblado (sin camino). */
export function foundSpots(s: GameState, id: number): string[] {
  const sh = shipById(s, id);
  if (!sh || !sh.cargo.includes('pioneer') || C.piecesLeft(s, sh.owner).settlement <= 0) return [];
  const ed = C.G(s).edges[sh.at];
  return [ed.a, ed.b].filter((v) => C.vertexLand(s, v) && !s.buildings[v] && C.distanceOk(s, v));
}

export function found(s: GameState, seat: number, id: number, v: string) {
  need(mainTurn(s, seat), 'notYourTurn');
  const sh = shipById(s, id);
  need(sh && sh.owner === seat && foundSpots(s, id).includes(v), 'illegal');
  sh!.cargo.splice(sh!.cargo.indexOf('pioneer'), 1);
  s.buildings[v] = { owner: seat, kind: 'settlement' };
  C.log(s, 'xship.found', { seat });
}

// ---------- misiones ----------

export function fishSpots(s: GameState, id: number): string[] {
  const sh = shipById(s, id);
  const x = s.expedition;
  if (!sh || !x || sh.fished || sh.cargo.length >= holdOf(s, sh.owner)) return [];
  return C.G(s).edges[sh.at].hexes.filter((h) => (x.shoals[h] ?? 0) > 0);
}

export function fish(s: GameState, seat: number, id: number, hex: string) {
  need(mainTurn(s, seat), 'notYourTurn');
  const sh = shipById(s, id);
  need(sh && sh.owner === seat && fishSpots(s, id).includes(hex), 'illegal');
  s.expedition!.shoals[hex]--;
  sh!.cargo.push('fish');
  sh!.fished = true;
  C.log(s, 'xship.fish', { seat });
}

export function canDeliver(s: GameState, id: number): boolean {
  const sh = shipById(s, id);
  const x = s.expedition;
  return !!sh && !!x && C.G(s).edges[sh.at].hexes.includes(x.council) && sh.cargo.some((c) => c === 'fish' || c === 'spice');
}

export function deliver(s: GameState, seat: number, id: number) {
  need(mainTurn(s, seat), 'notYourTurn');
  const sh = shipById(s, id);
  need(sh && sh.owner === seat && canDeliver(s, id), 'illegal');
  const x = s.expedition!;
  const nFish = sh!.cargo.filter((c) => c === 'fish').length;
  const nSpice = sh!.cargo.filter((c) => c === 'spice').length;
  x.fish[seat] += nFish;
  x.spice[seat] += nSpice;
  sh!.cargo = sh!.cargo.filter((c) => c !== 'fish' && c !== 'spice');
  C.log(s, 'xship.deliver', { seat, fish: nFish, spice: nSpice });
}

/** Casillas junto al barco donde puede bajar una tripulación: aldeas no visitadas por su dueño o guaridas en pie. */
export function crewSpots(s: GameState, id: number): string[] {
  const sh = shipById(s, id);
  const x = s.expedition;
  if (!sh || !x || !sh.cargo.includes('crew')) return [];
  return C.G(s).edges[sh.at].hexes.filter((h) => (x.villages[h] && !x.villages[h].visited.includes(sh.owner)) || (x.lairs[h] && !x.lairs[h].taken));
}

export function crewTo(s: GameState, seat: number, id: number, hex: string) {
  need(mainTurn(s, seat), 'notYourTurn');
  const sh = shipById(s, id);
  need(sh && sh.owner === seat && crewSpots(s, id).includes(hex), 'illegal');
  const x = s.expedition!;
  sh!.cargo.splice(sh!.cargo.indexOf('crew'), 1);
  const vil = x.villages[hex];
  if (vil) {
    // la tripulación se queda en la aldea: ventaja y una especia para el Consejo
    vil.visited.push(seat);
    if (!x.adv[seat].includes(vil.adv)) x.adv[seat].push(vil.adv);
    sh!.cargo.push('spice');
    C.log(s, 'xship.village', { seat, adv: vil.adv });
    return;
  }
  const lair = x.lairs[hex];
  lair.crews.push(seat);
  C.log(s, 'xship.lair', { seat, n: lair.crews.length });
  if (lair.crews.length >= LAIR_CREWS) {
    lair.taken = true;
    for (const p of lair.crews) x.lairVp[p]++;
    x.lairVp[seat]++;
    C.log(s, 'xship.lairTaken', { seat });
  }
}

/** Al empezar el turno, los barcos recuperan su movimiento. */
export function newTurn(s: GameState) {
  for (const sh of s.expedition?.ships ?? []) {
    sh.mp = moveOf(s, sh.owner);
    sh.fished = false;
  }
}

/** Barcos de la salida: uno por jugador, en los lados de mar más cerca del Consejo. */
export function startShips(s: GameState) {
  const x = s.expedition;
  if (!x) return;
  const g = C.G(s);
  const dist = new Map<string, number>();
  const queue: string[] = [];
  for (const e of g.hexes[x.council].edges) if (seaEdge(s, e)) { dist.set(e, 0); queue.push(e); }
  while (queue.length) {
    const e = queue.shift()!;
    for (const v of [g.edges[e].a, g.edges[e].b]) {
      for (const n of g.vertices[v].edges) {
        if (dist.has(n) || !seaEdge(s, n)) continue;
        dist.set(n, dist.get(e)! + 1);
        queue.push(n);
      }
    }
  }
  const order = [...dist.keys()].sort((a, b) => dist.get(a)! - dist.get(b)!);
  for (const p of s.players) {
    const e = order.find((x2) => !shipOn(s, x2));
    if (e) buildShip(s, p.seat, e, true);
  }
  newTurn(s);
}

/** Puntos de las misiones (el cálculo vive en el núcleo para el marcador). */
export const missionPoints = C.missionPoints;

/** Dueños de barcos junto a la casilla del pirata (víctimas del robo). */
export function pirateVictims(s: GameState, seat: number, hex: string): number[] {
  const out = new Set<number>();
  for (const e of C.G(s).hexes[hex].edges) {
    const sh = shipOn(s, e);
    if (sh && sh.owner !== seat && C.resourcesIn(s.players[sh.owner].hand) > 0) out.add(sh.owner);
  }
  return [...out];
}

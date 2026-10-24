// Ríos de oro: ríos que cruzan la isla y sólo se pasan con puentes; construir junto al agua da monedas.
// Quien tiene más monedas gana 1 PV; los que menos tienen pierden 2.
import type { Rng } from '../rng';
import * as C from '../core';
import { GameError, isResource, type GameState, type Resource } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const BRIDGE_COST = { brick: 2, lumber: 1 } as const;
export const BRIDGES_MAX = 3;
export const COIN_TRADES = 2;

/** Arma los ríos: cadenas de 3 casillas desde el interior hasta la costa, sin tocarse entre sí. */
export function setup(s: GameState, rng: Rng) {
  const g = C.G(s);
  const land = (id: string | null) => !!id && C.hexIsLand(s, id) && s.board.hexes[id].terrain !== 'swamp';
  const coastal = (id: string) => g.hexes[id].neighbors.some((n) => !n || s.board.hexes[n]?.terrain === 'sea');
  const want = s.players.length > 4 ? 3 : 2;
  for (let attempt = 0; attempt < 300; attempt++) {
    const rivers: string[][] = [];
    const taken = new Set<string>();
    const near = (id: string) => taken.has(id) || g.hexes[id].neighbors.some((n) => n && taken.has(n));
    const springs = rng.shuffle(Object.keys(s.board.hexes).filter((id) => land(id) && !coastal(id)));
    for (const spring of springs) {
      if (rivers.length >= want) break;
      if (near(spring)) continue;
      // camino de 3 casillas que termina en la costa
      const paths: string[][] = [];
      for (const b of g.hexes[spring].neighbors) {
        if (!land(b) || near(b!)) continue;
        for (const c of g.hexes[b!].neighbors) {
          if (!land(c) || c === spring || near(c!) || !coastal(c!)) continue;
          if (g.hexes[c!].neighbors.includes(spring)) continue; // que no se doble sobre sí mismo
          paths.push([spring, b!, c!]);
        }
      }
      if (!paths.length) continue;
      const path = rng.pick(paths);
      rivers.push(path);
      for (const h of path) taken.add(h);
    }
    if (rivers.length < want) continue;
    const crossings: string[] = [];
    for (const r of rivers) {
      for (let i = 0; i + 1 < r.length; i++) {
        const side = g.hexes[r[i]].neighbors.indexOf(r[i + 1]);
        crossings.push(g.hexes[r[i]].edges[side]);
      }
      // desembocadura: el lado de la última casilla que da al mar, del lado opuesto a la anterior
      const last = r[r.length - 1];
      const hx = g.hexes[last];
      const from = hx.neighbors.indexOf(r[r.length - 2]);
      const seaSides = hx.neighbors.map((n, i) => (!n || s.board.hexes[n]?.terrain === 'sea' ? i : -1)).filter((i) => i >= 0);
      seaSides.sort((a, b) => Math.abs(((a - from + 6) % 6) - 3) - Math.abs(((b - from + 6) % 6) - 3));
      if (seaSides.length) crossings.push(hx.edges[seaSides[0]]);
    }
    s.river = { rivers, crossings, coins: s.players.map(() => 0) };
    return;
  }
  throw new Error('no se pudieron trazar los ríos');
}

export const riverHexes = (s: GameState) => new Set(s.river?.rivers.flat() ?? []);
const bridgesOf = (s: GameState, seat: number) => Object.values(s.roads).filter((r) => r.owner === seat && r.bridge).length;

export function canBridge(s: GameState, seat: number, e: string): boolean {
  if (!s.river || !C.isCrossing(s, e) || s.roads[e] || s.ships[e]) return false;
  if (bridgesOf(s, seat) >= BRIDGES_MAX || C.piecesLeft(s, seat).road <= 0 || C.hasBrokenRoad(s, seat)) return false;
  return C.routeConnects(s, seat, e, s.roads);
}

export const legalBridges = (s: GameState, seat: number) => (s.river?.crossings ?? []).filter((e) => canBridge(s, seat, e));

function gainCoins(s: GameState, seat: number, n: number, why: string) {
  if (!s.river || s.players[seat].neutral || n <= 0) return;
  s.river.coins[seat] = (s.river.coins[seat] ?? 0) + n;
  C.log(s, 'coins.gain', { seat, n, why });
}

export function buildBridge(s: GameState, seat: number, e: string) {
  need(canBridge(s, seat, e), 'illegal');
  C.pay(s, seat, BRIDGE_COST);
  s.roads[e] = { owner: seat, bridge: true };
  C.log(s, 'build.bridge', { seat });
  gainCoins(s, seat, 3, 'bridge');
  C.updateRoadAward(s);
}

/** Camino junto a un río (que no lo cruza): 1 moneda. */
export function afterRoad(s: GameState, seat: number, e: string) {
  if (!s.river || C.isCrossing(s, e)) return;
  const rh = riverHexes(s);
  if (C.G(s).edges[e].hexes.some((h) => rh.has(h))) gainCoins(s, seat, 1, 'road');
}

/** Poblado junto a un río: 1 moneda. */
export function afterSettlement(s: GameState, seat: number, v: string) {
  if (!s.river) return;
  const rh = riverHexes(s);
  if (C.G(s).vertices[v].hexes.some((h) => rh.has(h))) gainCoins(s, seat, 1, 'settlement');
}

export function canTradeCoins(s: GameState, seat: number): boolean {
  return !!s.river && s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length
    && (s.river.coins[seat] ?? 0) >= 2 && (s.turn.coinTrades ?? 0) < COIN_TRADES && C.resourcesIn(s.bank) > 0;
}

/** 2 monedas por un recurso a elección, hasta 2 veces por turno. */
export function tradeCoins(s: GameState, seat: number) {
  need(canTradeCoins(s, seat), 'illegal');
  s.river!.coins[seat] -= 2;
  s.turn.coinTrades = (s.turn.coinTrades ?? 0) + 1;
  C.log(s, 'coins.trade', { seat });
  s.steps.unshift({ k: 'pick', reason: 'coins', waiting: { [seat]: 1 } });
}

/** Comprar una moneda con cartas, a la tasa del banco o del puerto. */
export function buyCoin(s: GameState, seat: number, give: Resource) {
  need(!!s.river && s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length && isResource(give), 'illegal');
  const ratio = C.ratioFor(s, seat, give);
  C.pay(s, seat, { [give]: ratio });
  s.river!.coins[seat] = (s.river!.coins[seat] ?? 0) + 1;
  C.log(s, 'coins.buy', { seat, give, n: ratio });
}


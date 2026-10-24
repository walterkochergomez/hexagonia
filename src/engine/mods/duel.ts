// Duelo (2 jugadores): dos colores neutrales que crecen cuando los jugadores construyen, dos tiradas por turno
// y fichas de comercio para forzar un cambio o devolver el ladrón al desierto.
import type { Rng } from '../rng';
import * as C from '../core';
import { GameError, emptyHand, handTotal, type GameState, type PlayerState, type Step } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const TOKENS_START = 5;
export const TOKENS_TOTAL = 20;

export const isDuel = (s: GameState) => !!s.settings.duel && s.players.some((p) => p.neutral);

/** Agrega los dos neutrales y les pone dos poblados con camino a cada uno. */
export function setup(s: GameState, rng: Rng) {
  const used = new Set(s.players.map((p) => p.color));
  const colors = [5, 3, 4, 2, 1, 0].filter((c) => !used.has(c)).slice(0, 2);
  for (const p of s.players) p.tokens = TOKENS_START;
  const base = s.players.length;
  colors.forEach((color, i) => {
    const p: PlayerState = {
      seat: base + i, name: '', color, hand: emptyHand(), dev: [], devPlayedTurn: -1, soldiers: 0,
      progress: [], vpCards: [], improvements: { science: 0, trade: 0, politics: 0 }, defender: 0, bonus: [], homeRegions: [],
      neutral: true,
    };
    s.players.push(p);
  });
  s.duel = { supply: TOKENS_TOTAL - TOKENS_START * base };
  // dos rondas: cada neutral funda en un lugar al azar de los que valen la pena (ni los mejores ni los peores)
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < colors.length; i++) {
      const seat = base + i;
      const spots = C.legalSetupVertices(s);
      const pips = (v: string) => C.G(s).vertices[v].hexes.reduce((a, h) => a + pipCount(s.board.hexes[h]?.number ?? null), 0);
      const ranked = rng.shuffle([...spots]).sort((a, b) => pips(b) - pips(a));
      const pool = ranked.slice(Math.floor(ranked.length * 0.25), Math.max(Math.floor(ranked.length * 0.25) + 1, Math.floor(ranked.length * 0.7)));
      const v = rng.pick(pool.length ? pool : ranked);
      s.buildings[v] = { owner: seat, kind: 'settlement' };
      const roads = C.legalSetupRoutes(s, v).roads;
      if (roads.length) s.roads[rng.pick(roads)] = { owner: seat };
    }
  }
}

const pipCount = (n: number | null) => (n ? 6 - Math.abs(7 - n) : 0);

export const neutralSeats = (s: GameState) => s.players.filter((p) => p.neutral).map((p) => p.seat);

/** Lugares donde se puede construir para algún neutral. */
export function neutralSpots(s: GameState, what: 'road' | 'settlement'): string[] {
  const out = new Set<string>();
  for (const n of neutralSeats(s)) {
    const left = C.piecesLeft(s, n);
    if (what === 'road' && left.road > 0) for (const e of C.legalRoads(s, n)) out.add(e);
    if (what === 'settlement' && left.settlement > 0) for (const v of C.legalSettlements(s, n)) out.add(v);
  }
  return [...out];
}

/** Después de que un jugador construye: le toca hacer crecer a un neutral (si se puede). */
export function afterBuild(s: GameState, seat: number, what: 'road' | 'settlement') {
  if (!isDuel(s) || s.players[seat].neutral || s.turn.phase === 'setup') return;
  let kind: 'road' | 'settlement' = what;
  if (kind === 'settlement' && !neutralSpots(s, 'settlement').length) kind = 'road';
  if (!neutralSpots(s, kind).length) return;
  s.steps.unshift({ k: 'neutral', seat, what: kind });
}

export function placeNeutral(s: GameState, st: Extract<Step, { k: 'neutral' }>, at: string) {
  const owner = neutralSeats(s).find((n) => (st.what === 'road' ? C.piecesLeft(s, n).road > 0 && C.canRoad(s, n, at) : C.piecesLeft(s, n).settlement > 0 && C.canSettle(s, n, at)));
  need(owner !== undefined, 'illegal');
  if (st.what === 'road') s.roads[at] = { owner: owner! };
  else s.buildings[at] = { owner: owner!, kind: 'settlement' };
  C.log(s, st.what === 'road' ? 'neutral.road' : 'neutral.settlement', { seat: st.seat });
  C.updateRoadAward(s);
}

// ---------- fichas de comercio ----------

export const opponentOf = (s: GameState, seat: number) => s.players.find((p) => !p.neutral && p.seat !== seat)!.seat;

/** Cuesta 1 ficha si vas igual o atrás en puntos visibles, 2 si vas adelante. */
export function tokenCost(s: GameState, seat: number): number {
  return C.vpOf(s, seat, false) <= C.vpOf(s, opponentOf(s, seat), false) ? 1 : 2;
}

export function canUseToken(s: GameState, seat: number, use: 'force' | 'robber'): boolean {
  if (!isDuel(s) || s.turn.phase !== 'main' || s.turn.current !== seat || s.turn.tokenUsed || s.steps.length) return false;
  if ((s.players[seat].tokens ?? 0) < tokenCost(s, seat)) return false;
  if (use === 'robber') return !!s.board.robberStart && s.board.robber !== s.board.robberStart;
  return handTotal(s.players[opponentOf(s, seat)].hand) > 0;
}

export function useToken(s: GameState, seat: number, use: 'force' | 'robber', rng: Rng) {
  need(canUseToken(s, seat, use), 'illegal');
  const cost = tokenCost(s, seat);
  s.players[seat].tokens = (s.players[seat].tokens ?? 0) - cost;
  s.duel!.supply += cost;
  s.turn.tokenUsed = true;
  if (use === 'robber') {
    s.board.robber = s.board.robberStart;
    C.log(s, 'token.robber', { seat, n: cost });
    return;
  }
  const opp = opponentOf(s, seat);
  const took = emptyHand();
  for (let i = 0; i < 2; i++) {
    const c = C.randomCard(s.players[opp].hand, rng.float());
    if (!c) break;
    C.moveCards(s, opp, seat, { [c]: 1 });
    took[c]++;
  }
  const n = handTotal(took);
  C.log(s, 'token.force.cards', { seat, victim: opp, cards: C.handText(took), n: cost }, [seat, opp], { k: 'token.force', p: { seat, victim: opp, n: cost } });
  if (n > 0) s.steps.unshift({ k: 'gift', reason: 'force', waiting: { [seat]: n }, to: { [seat]: [opp] } });
}

/** Fichas por un poblado nuevo: 2 junto al desierto, 1 en la costa, 3 si ambas. */
export function earnForSettlement(s: GameState, seat: number, v: string) {
  if (!isDuel(s) || s.players[seat].neutral || s.turn.phase === 'setup') return;
  const hexes = C.G(s).vertices[v].hexes.map((h) => s.board.hexes[h]?.terrain);
  let n = 0;
  if (hexes.includes('desert')) n += 2;
  if (hexes.length < 3 || hexes.includes('sea')) n += 1;
  gain(s, seat, n);
}

function gain(s: GameState, seat: number, n: number) {
  const k = Math.min(n, s.duel?.supply ?? 0);
  if (k <= 0) return;
  s.duel!.supply -= k;
  s.players[seat].tokens = (s.players[seat].tokens ?? 0) + k;
  C.log(s, 'token.gain', { seat, n: k });
}

/** Devolver un soldado jugado a cambio de 2 fichas. */
export function cashSoldier(s: GameState, seat: number) {
  need(isDuel(s) && s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length, 'notYourTurn');
  const p = s.players[seat];
  need(p.soldiers > 0 && (s.duel?.supply ?? 0) > 0, 'illegal');
  p.soldiers--;
  C.log(s, 'soldier.cash', { seat });
  gain(s, seat, 2);
  // el mayor ejército se recalcula: si quien lo tenía ya no es el mayor, pasa al que tenga más (3 o más)
  const holder = s.awards.army.owner;
  if (holder !== null) {
    const best = Math.max(...s.players.map((x) => x.soldiers));
    if (s.players[holder].soldiers < 3 || s.players[holder].soldiers < best) {
      const top = s.players.filter((x) => x.soldiers === best && best >= 3);
      s.awards.army = top.length === 1 ? { owner: top[0].seat, size: best } : { owner: null, size: 0 };
      C.log(s, s.awards.army.owner === null ? 'award.army.none' : 'award.army', { seat: s.awards.army.owner, size: best });
    } else s.awards.army.size = s.players[holder].soldiers;
  }
}

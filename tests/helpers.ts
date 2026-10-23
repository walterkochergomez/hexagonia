import { expect } from 'vitest';
import { applyAction, createGame } from '../src/engine/game';
import { botAction, whoActs } from '../src/engine/bot';
import { Rng, seedRng } from '../src/engine/rng';
import * as C from '../src/engine/core';
import { CARDS, LIMITS, type GameState, type Settings } from '../src/engine/types';

export function settings(over: Partial<Settings> = {}): Settings {
  return { seats: 4, openSea: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 1, ...over };
}

export function seats(n: number) {
  return Array.from({ length: n }, (_, i) => ({ name: `P${i}`, color: i }));
}

export function totals(s: GameState) {
  const out: Record<string, number> = {};
  for (const c of CARDS) out[c] = s.bank[c] + s.players.reduce((a, p) => a + p.hand[c], 0);
  return out;
}

export function invariants(s: GameState, initial: Record<string, number>) {
  const t = totals(s);
  for (const c of CARDS) {
    if (t[c] !== initial[c]) throw new Error(`conservación ${c}: ${t[c]} != ${initial[c]}`);
    if (s.bank[c] < 0) throw new Error(`banco negativo ${c}`);
    for (const p of s.players) if (p.hand[c] < 0) throw new Error(`mano negativa ${c}`);
  }
  for (const p of s.players) {
    const u = C.piecesUsed(s, p.seat);
    if (u.road > LIMITS.road || u.ship > LIMITS.ship || u.settlement > LIMITS.settlement || u.city > LIMITS.city || u.wall > LIMITS.wall) throw new Error('piezas de más');
    if (u.knights.some((k) => k > LIMITS.knightPerLevel)) throw new Error('caballeros de más');
  }
  const g = C.G(s);
  for (const v of Object.keys(s.buildings)) {
    if (g.vertices[v].neighbors.some((n) => s.buildings[n])) throw new Error('regla de distancia');
    if (!C.vertexLand(s, v)) throw new Error('edificio en el mar');
    if (s.knights[v]) throw new Error('caballero sobre edificio');
  }
  for (const e of Object.keys(s.roads)) if (!C.edgeRoadable(s, e) || s.ships[e]) throw new Error('camino ilegal');
  for (const e of Object.keys(s.ships)) if (!C.edgeShippable(s, e)) throw new Error('barco ilegal');
  if (s.awards.road.owner !== null && C.longestRoute(s, s.awards.road.owner) < 5) throw new Error('premio de ruta inválido');
  if (s.settings.guilds) {
    const n = s.hidden.progress.science.length + s.hidden.progress.trade.length + s.hidden.progress.politics.length
      + s.players.reduce((a, p) => a + p.progress.length + p.vpCards.length, 0);
    if (n !== 54) throw new Error(`cartas de progreso: ${n}`);
  }
}

export interface SimResult { winner: number | null; actions: number; errors: string[]; turns: number; state: GameState }

export function simulate(set: Settings, n: number, maxActions = 8000): SimResult {
  let s = createGame(set, seats(n));
  const initial = totals(s);
  const rng = new Rng(seedRng(set.seed ^ 0xabcdef));
  const errors: string[] = [];
  let actions = 0;
  let stuck = 0;
  let perTurn = 0;
  let lastTurn = -1;
  for (; actions < maxActions && s.winner === null; actions++) {
    const seat = whoActs(s);
    if (seat === null) throw new Error('nadie actúa');
    if (s.turn.n !== lastTurn) {
      lastTurn = s.turn.n;
      perTurn = 0;
    }
    perTurn++;
    let a = botAction(s, seat, rng);
    if (perTurn > 60 && a && !s.steps.length && !s.trade && C.actorOf(s) === seat && s.turn.phase !== 'setup' && s.turn.phase !== 'preRoll') a = { t: 'endTurn' };
    if (!a) throw new Error(`bot sin acción: seat ${seat} fase ${s.turn.phase} paso ${s.steps[0]?.k}`);
    try {
      s = applyAction(s, seat, a);
      stuck = 0;
    } catch (e) {
      errors.push(`${(e as Error).message} :: ${JSON.stringify(a)} :: fase ${s.turn.phase} paso ${s.steps[0]?.k}`);
      if (++stuck > 20) throw new Error(`atascado: ${errors.slice(-3).join(' | ')}`);
      continue;
    }
    invariants(s, initial);
  }
  return { winner: s.winner, actions, errors, turns: s.turn.n, state: s };
}

export { expect };

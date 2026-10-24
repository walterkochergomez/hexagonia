// Mazo de sucesos: 36 cartas con la misma distribución que dos dados, y 20 de ellas traen un suceso.
// La carta de año nuevo va 5 cartas antes del fondo: al salir se baraja todo otra vez.
import type { Rng } from '../rng';
import * as C from '../core';
import { RESOURCES, handTotal, type ChronicleCard, type ChronicleEvent, type GameState, type Step } from '../types';

const FACES: Record<number, (ChronicleEvent | null)[]> = {
  2: ['harvest'],
  3: ['feud', null],
  4: ['flee', 'flee', null],
  5: ['joust', 'tradeWind', null, null],
  6: ['quake', 'neighbors', 'plague', null, null],
  7: ['raid', 'raid', 'raid', 'raid', 'raid', 'raid'],
  8: ['plague', null, null, null, null],
  9: ['calm', null, null, null],
  10: ['aid', null, null],
  11: ['aid', null],
  12: ['calm'],
};

export const CHRONICLE_CARDS: ChronicleCard[] = Object.entries(FACES).flatMap(([n, evs]) => evs.map((ev) => (ev ? { n: Number(n), ev } : { n: Number(n) })));

export function newDeck(rng: Rng): ChronicleCard[] {
  const deck = rng.shuffle(CHRONICLE_CARDS.map((c) => ({ ...c })));
  deck.splice(deck.length - 5, 0, { n: 0, newYear: true });
  return deck;
}

/** Saca una carta; con `avoid`, descarta las de ese número (segunda tirada del duelo). */
export function draw(s: GameState, rng: Rng, avoid?: number): ChronicleCard {
  for (let guard = 0; guard < 80; guard++) {
    let deck = s.hidden.chronicle ?? [];
    if (!deck.length) deck = newDeck(rng);
    const card = deck.shift()!;
    s.hidden.chronicle = deck;
    if (card.newYear) {
      s.hidden.chronicle = newDeck(rng);
      C.log(s, 'chronicle.newYear');
      continue;
    }
    if (avoid !== undefined && card.n === avoid) continue;
    s.chronicle = { left: s.hidden.chronicle.length, last: card };
    return card;
  }
  throw new Error('mazo de sucesos');
}

/** Dos dados que suman lo de la carta (para registro, estadística y tablero). */
export const diceOf = (n: number): [number, number] => {
  const a = Math.min(6, n - 1);
  return [a, n - a];
};

const humans = (s: GameState) => s.players.filter((p) => !p.neutral).map((p) => p.seat);

/** Los que más tienen de algo (al menos `min`); todos los empatados. */
function leaders(s: GameState, score: (seat: number) => number, min = 1): number[] {
  const sc = humans(s).map((x) => [x, score(x)] as const);
  const max = Math.max(...sc.map(([, v]) => v));
  if (max < min) return [];
  return sc.filter(([, v]) => v === max).map(([x]) => x);
}

const withCards = (s: GameState, xs: number[]) => xs.filter((x) => handTotal(s.players[x].hand) > 0);

/** Siguiente jugador (no neutral) en el orden de la mesa. */
export function nextHuman(s: GameState, seat: number): number {
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    const x = (seat + i) % n;
    if (!s.players[x].neutral) return x;
  }
  return seat;
}

/** Aplica el suceso de la carta, antes de la producción. Devuelve los pasos que deben resolverse primero. */
export function resolve(s: GameState, card: ChronicleCard): Step[] {
  const ev = card.ev;
  if (!ev || ev === 'raid') return [];
  C.log(s, 'chronicle.event', { ev });
  const steps: Step[] = [];
  const picks = (xs: number[], reason: 'harvest' | 'joust' | 'calm') => {
    if (!xs.length) {
      C.log(s, 'chronicle.nobody');
      return;
    }
    if (RESOURCES.every((r) => s.bank[r] === 0)) return;
    steps.push({ k: 'pick', reason, waiting: Object.fromEntries(xs.map((x) => [x, 1])) });
  };
  const steal = (thief: number | null) => {
    if (thief === null) {
      C.log(s, 'chronicle.nobody');
      return;
    }
    const from = withCards(s, humans(s).filter((x) => x !== thief));
    if (from.length) steps.push({ k: 'steal', seat: thief, hex: '', on: 'event', from });
  };
  switch (ev) {
    case 'harvest':
      picks(humans(s), 'harvest');
      break;
    case 'feud': {
      const top = leaders(s, (x) => s.players[x].soldiers);
      steal(top.length === 1 ? top[0] : null);
      break;
    }
    case 'flee':
      if (s.board.robberStart && s.board.robber !== s.board.robberStart) {
        s.board.robber = s.board.robberStart;
        C.log(s, 'robber.flee');
      }
      break;
    case 'joust':
      picks(leaders(s, (x) => s.players[x].soldiers), 'joust');
      break;
    case 'tradeWind':
      steal(s.awards.road.owner);
      break;
    case 'quake': {
      const waiting = humans(s).filter((x) => Object.values(s.roads).some((r) => r.owner === x && !r.broken));
      if (waiting.length) steps.push({ k: 'quake', waiting });
      break;
    }
    case 'neighbors': {
      const waiting: Record<number, number> = {};
      const to: Record<number, number[]> = {};
      for (const x of humans(s)) {
        if (C.resourcesIn(s.players[x].hand) > 0) {
          waiting[x] = 1;
          to[x] = [nextHuman(s, x)];
        }
      }
      if (Object.keys(waiting).length) steps.push({ k: 'gift', reason: 'neighbors', waiting, to });
      break;
    }
    case 'plague':
      s.turn.plague = true;
      break;
    case 'calm': {
      const harbors = (x: number) => {
        const g = C.G(s);
        return s.board.harbors.filter((h) => [g.edges[h.edge].a, g.edges[h.edge].b].some((v) => s.buildings[v]?.owner === x)).length;
      };
      picks(leaders(s, harbors), 'calm');
      break;
    }
    case 'aid': {
      const vp = (x: number) => C.vpOf(s, x, false);
      const top = leaders(s, vp, 0);
      const waiting: Record<number, number> = {};
      const to: Record<number, number[]> = {};
      for (const x of top) {
        const poorer = humans(s).filter((y) => vp(y) < vp(x));
        if (poorer.length && C.resourcesIn(s.players[x].hand) > 0) {
          waiting[x] = 1;
          to[x] = poorer;
        }
      }
      if (Object.keys(waiting).length) steps.push({ k: 'gift', reason: 'aid', waiting, to });
      else C.log(s, 'chronicle.nobody');
      break;
    }
  }
  return steps;
}

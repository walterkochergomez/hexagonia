import { botAction } from '../engine/bot';
import * as C from '../engine/core';
import type { Rng } from '../engine/rng';
import type { Action, GameState } from '../engine/types';

/** Siguiente jugada de algún bot, o null si hay que esperar a una persona. */
export function pickBotMove(s: GameState, bots: Set<number>, rng: Rng, tradeAgeMs: number, actionsThisTurn: number): { seat: number; a: Action } | null {
  if (s.winner !== null || !bots.size) return null;
  const st = s.steps[0];
  if (st && st.k !== 'produce') {
    for (const seat of C.waitingSeats(st)) {
      if (!bots.has(seat)) continue;
      const a = botAction(s, seat, rng);
      if (a) return { seat, a };
    }
    return null;
  }
  if (s.trade) {
    for (const seat of s.trade.to) {
      if (bots.has(seat) && !s.trade.replies[seat]) {
        const a = botAction(s, seat, rng);
        if (a) return { seat, a };
      }
    }
    const from = s.trade.from;
    if (!bots.has(from)) return null;
    const all = s.trade.to.every((x) => s.trade!.replies[x]);
    if (!all && tradeAgeMs < 8000) return null;
    const a = botAction(s, from, rng);
    return a ? { seat: from, a } : null;
  }
  const actor = C.actorOf(s);
  if (!bots.has(actor)) return null;
  let a = botAction(s, actor, rng);
  if (actionsThisTurn > 40 && s.turn.phase !== 'setup' && s.turn.phase !== 'preRoll') a = { t: 'endTurn' };
  return a ? { seat: actor, a } : null;
}

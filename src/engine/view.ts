// Vista recortada por asiento: lo que cada jugador puede saber.
import * as C from './core';
import { emptyHand, handTotal, type GameState } from './types';

export function viewFor(s: GameState, seat: number | null): GameState {
  const v = structuredClone(s);
  const over = s.winner !== null;
  v.redacted = true;
  v.viewer = seat;
  v.decks = C.decksOf(s);
  v.hidden = { fog: {}, devDeck: [], progress: { science: [], trade: [], politics: [] }, rng: [0, 0, 0, 0] };
  for (const p of v.players) {
    p.handCount = handTotal(p.hand);
    p.devCount = p.dev.length;
    p.progressCount = p.progress.length;
    if (p.seat === seat) continue;
    p.hand = emptyHand();
    if (!over) p.dev = [];
    p.progress = [];
  }
  v.steps = v.steps.map((st) => {
    if (st.k === 'spy' && st.seat !== seat) return { ...st, cards: [] };
    if (st.k === 'masterMerchant' && st.seat !== seat) return { ...st, hand: emptyHand() };
    return st;
  });
  v.log = s.log.flatMap((e) => {
    if (!e.to || (seat !== null && e.to.includes(seat))) return [{ n: e.n, k: e.k, p: e.p }];
    return e.alt ? [{ n: e.n, k: e.alt.k, p: e.alt.p }] : [];
  });
  return v;
}

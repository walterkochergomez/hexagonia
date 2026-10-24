// Señor de los muelles: puntos de puerto por edificios junto a un puerto; con 3 o más, 2 PV para quien tenga más.
import * as C from '../core';
import type { GameState } from '../types';

/** Poblado junto a un puerto: 1 punto de puerto; ciudad: 2. Cada edificio cuenta una vez. */
export function harborPoints(s: GameState, seat: number): number {
  const g = C.G(s);
  const spots = new Set<string>();
  for (const h of s.board.harbors) {
    const e = g.edges[h.edge];
    spots.add(e.a);
    spots.add(e.b);
  }
  let pts = 0;
  for (const v of spots) {
    const b = s.buildings[v];
    if (b && b.owner === seat) pts += b.kind === 'city' && !b.damaged ? 2 : 1;
  }
  return pts;
}

export function updateHarborAward(s: GameState) {
  if (!s.settings.harbormaster) return;
  const cur = s.awards.harbor ?? { owner: null, pts: 0 };
  const pts = s.players.map((p) => (p.neutral ? 0 : harborPoints(s, p.seat)));
  const max = Math.max(...pts);
  let next: number | null;
  if (cur.owner !== null && pts[cur.owner] >= 3 && pts[cur.owner] >= max) next = cur.owner;
  else if (max >= 3) {
    const top = pts.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    next = top.length === 1 ? top[0] : null;
  } else next = null;
  if (next !== cur.owner) {
    if (next === null) C.log(s, 'award.harbor.none');
    else C.log(s, 'award.harbor', { seat: next, pts: pts[next] });
  }
  s.awards.harbor = { owner: next, pts: next === null ? 0 : pts[next] };
}

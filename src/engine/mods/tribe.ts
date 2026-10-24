// Pueblo isleño: alrededor de la isla grande hay islitas sin números donde no se puede construir. En sus costas
// esperan regalos (puntos, cartas de desarrollo y puertos) para el primero que llega en barco a ese lado.
import type { Rng } from '../rng';
import * as C from '../core';
import { GameError, type GameState, type Resource, type Step, type TribeGift } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export function setup(s: GameState, rng: Rng, isles: string[]) {
  const g = C.G(s);
  const big = s.players.length > 4;
  const set = new Set(isles);
  // lados de la costa de las islitas por donde se puede navegar
  const cands = rng.shuffle(Object.values(g.edges)
    .filter((e) => e.hexes.length === 2 && e.hexes.some((h) => set.has(h)) && e.hexes.some((h) => s.board.hexes[h].terrain === 'sea'))
    .map((e) => e.id));
  const kinds: Omit<TribeGift, 'edge'>[] = [];
  for (let i = 0; i < (big ? 10 : 8); i++) kinds.push({ kind: 'vp' });
  for (let i = 0; i < (big ? 5 : 4); i++) kinds.push({ kind: 'dev' });
  const ports: (Resource | 'any')[] = ['lumber', 'brick', 'wool', 'grain', 'ore', 'any'];
  if (big) ports.push('any');
  for (const h of ports) kinds.push({ kind: 'harbor', harbor: h });
  rng.shuffle(kinds);
  // primero sin regalos vecinos (que no compartan cruce); si no alcanzan, se completa con el resto
  const used = new Set<string>();
  const picked: string[] = [];
  for (const e of cands) {
    if (picked.length >= kinds.length) break;
    const ed = g.edges[e];
    if (used.has(ed.a) || used.has(ed.b)) continue;
    picked.push(e);
    used.add(ed.a);
    used.add(ed.b);
  }
  for (const e of cands) {
    if (picked.length >= kinds.length) break;
    if (!picked.includes(e)) picked.push(e);
  }
  const gifts: TribeGift[] = picked.map((edge, i) => ({ ...kinds[i], edge }));
  const cards = gifts.filter((x) => x.kind === 'dev').length;
  s.hidden.tribeDev = s.hidden.devDeck.splice(0, cards);
  s.tribe = { hexes: [...isles], gifts, vp: s.players.map(() => 0), held: s.players.map(() => []) };
}

/** Un barco propio llegó a `e`: si hay un regalo en ese lado, es suyo. */
export function afterShip(s: GameState, seat: number, e: string) {
  const t = s.tribe;
  if (!t) return;
  const i = t.gifts.findIndex((x) => x.edge === e);
  if (i < 0) return;
  const gift = t.gifts[i];
  t.gifts.splice(i, 1);
  if (gift.kind === 'vp') {
    t.vp[seat]++;
    C.log(s, 'tribe.vp', { seat });
  } else if (gift.kind === 'dev') {
    const card = s.hidden.tribeDev?.pop() ?? s.hidden.devDeck.shift();
    if (!card) return;
    s.players[seat].dev.push({ type: card, turn: s.turn.n });
    C.log(s, 'tribe.dev.card', { seat, card }, [seat], { k: 'tribe.dev', p: { seat } });
  } else {
    C.log(s, 'tribe.harbor', { seat, port: gift.harbor! });
    t.held[seat].push(gift.harbor!);
    offerHeld(s, seat);
  }
}

/** Lados de costa junto a un edificio propio donde cabe un puerto (sin tocar otro puerto). */
export function harborSpots(s: GameState, seat: number): string[] {
  const g = C.G(s);
  const taken = new Set(s.board.harbors.flatMap((h) => [g.edges[h.edge].a, g.edges[h.edge].b]));
  const out = new Set<string>();
  for (const [v, b] of Object.entries(s.buildings)) {
    if (b.owner !== seat || taken.has(v)) continue;
    for (const e of g.vertices[v].edges) {
      const ed = g.edges[e];
      if (ed.hexes.length !== 2 || taken.has(ed.a) || taken.has(ed.b)) continue;
      if (ed.hexes.some((h) => C.hexIsSea(s, h)) && ed.hexes.some((h) => C.hexIsLand(s, h))) out.add(e);
    }
  }
  return [...out];
}

/** Si tiene un puerto guardado y ya hay dónde ponerlo, se lo pide. */
export function offerHeld(s: GameState, seat: number) {
  const t = s.tribe;
  if (!t || !t.held[seat].length || s.steps.some((x) => x.k === 'placeHarbor')) return;
  if (!harborSpots(s, seat).length) return;
  const kind = t.held[seat].shift()!;
  s.steps.unshift({ k: 'placeHarbor', seat, kind });
}

export function placeHarbor(s: GameState, seat: number, st: Extract<Step, { k: 'placeHarbor' }>, edge: string) {
  need(harborSpots(s, seat).includes(edge), 'illegal');
  const sea = C.G(s).edges[edge].hexes.find((h) => C.hexIsSea(s, h))!;
  s.board.harbors = [...s.board.harbors, { edge, hex: sea, kind: st.kind }];
  C.log(s, 'tribe.harborPlaced', { seat, port: st.kind });
}

/** Si ya no hay lugar para el puerto pendiente, vuelve a quedar guardado. */
export function stuck(s: GameState, st: Extract<Step, { k: 'placeHarbor' }>): boolean {
  if (harborSpots(s, st.seat).length) return false;
  s.tribe?.held[st.seat].unshift(st.kind);
  return true;
}

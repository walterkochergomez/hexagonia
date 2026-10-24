// Ruta de camellos: tres caravanas salen del oasis y crecen por votación cada vez que alguien funda o
// mejora un edificio. Un edificio entre dos camellos vale 1 PV más y un camino bajo un camello vale doble.
import * as C from '../core';
import { GameError, handTotal, type GameState, type Hand, type Step } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const CAMELS = 22;

export function setup(s: GameState) {
  const oasis = Object.values(s.board.hexes).find((h) => h.terrain === 'desert' && s.board.robber === h.id)?.id
    ?? Object.values(s.board.hexes).find((h) => h.terrain === 'desert')!.id;
  const vs = C.G(s).hexes[oasis].vertices;
  s.caravan = { oasis, starts: [vs[0], vs[2], vs[4]], routes: [[], [], []], left: s.players.length > 4 ? 28 : CAMELS };
}

/** Cruces por donde ya pasa alguna caravana (incluidos sus inicios). */
function visited(s: GameState): Set<string> {
  const c = s.caravan!;
  const g = C.G(s);
  const out = new Set<string>(c.starts);
  for (const r of c.routes) for (const e of r) { out.add(g.edges[e].a); out.add(g.edges[e].b); }
  return out;
}

/** Último cruce de cada caravana. */
export function heads(s: GameState): string[] {
  const c = s.caravan!;
  const g = C.G(s);
  return c.routes.map((r, i) => {
    let v = c.starts[i];
    for (const e of r) v = g.edges[e].a === v ? g.edges[e].b : g.edges[e].a;
    return v;
  });
}

/** Tramos donde se puede poner el próximo camello: siguen a una caravana, en tierra, sin cruzarse ni volver al oasis. */
export function legalCamels(s: GameState): string[] {
  const c = s.caravan;
  if (!c || c.left <= 0) return [];
  const g = C.G(s);
  const seen = visited(s);
  const oasisEdges = new Set(g.hexes[c.oasis].edges);
  const out = new Set<string>();
  for (const v of heads(s)) {
    for (const e of g.vertices[v].edges) {
      if (oasisEdges.has(e) || !C.edgeRoadable(s, e)) continue;
      const w = g.edges[e].a === v ? g.edges[e].b : g.edges[e].a;
      if (seen.has(w)) continue;
      out.add(e);
    }
  }
  return [...out];
}

/** Al empezar el turno siguiente a uno en que se construyó: todos pujan con lana y trigo. */
export function startVote(s: GameState) {
  if (!s.caravan || !legalCamels(s).length) return;
  const waiting = s.players.filter((p) => !p.neutral).map((p) => p.seat);
  s.steps.unshift({ k: 'camelBid', waiting, bids: {} });
  C.log(s, 'camel.vote');
}

export function bid(s: GameState, st: Extract<Step, { k: 'camelBid' }>, seat: number, cards: Partial<Hand>) {
  need(st.waiting.includes(seat), 'pending');
  need(C.validHandPart(cards) && Object.keys(cards).every((c) => c === 'wool' || c === 'grain' || !(cards as Record<string, number>)[c]), 'badArg');
  need(C.hasCards(s.players[seat].hand, cards), 'cards');
  st.bids[seat] = { wool: cards.wool ?? 0, grain: cards.grain ?? 0 };
  st.waiting = st.waiting.filter((x) => x !== seat);
  if (st.waiting.length) return;
  // todos pujaron: gana la mayor; en empate, el primero desde el jugador del turno
  s.steps.splice(s.steps.indexOf(st), 1);
  const n = s.players.length;
  let best = -1;
  let winner = s.turn.current;
  for (let i = 0; i < n; i++) {
    const x = (s.turn.current + i) % n;
    const b = st.bids[x];
    if (!b) continue;
    const tot = handTotal(b);
    if (tot > best) { best = tot; winner = x; }
  }
  for (const [x, b] of Object.entries(st.bids)) {
    const k = Number(x);
    if (handTotal(b) > 0 && C.hasCards(s.players[k].hand, b)) C.pay(s, k, b);
  }
  for (const [x, b] of Object.entries(st.bids)) C.log(s, 'camel.bid', { seat: Number(x), n: handTotal(b) });
  C.log(s, 'camel.win', { seat: winner });
  if (legalCamels(s).length) s.steps.unshift({ k: 'camelPlace', seat: winner });
}

export function place(s: GameState, seat: number, e: string) {
  need(legalCamels(s).includes(e), 'illegal');
  const c = s.caravan!;
  const g = C.G(s);
  const hs = heads(s);
  const i = hs.findIndex((v) => g.edges[e].a === v || g.edges[e].b === v);
  c.routes[i].push(e);
  c.left--;
  C.log(s, 'camel.place', { seat });
  C.updateRoadAward(s);
}

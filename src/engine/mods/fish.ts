// Aguas de pesca: un lago en el centro (2, 3, 11, 12) y caladeros en la costa que dan fichas de pescado.
// Las fichas valen 1 a 3 peces, no son cartas y se gastan en acciones; entre ellas hay una bota vieja.
import type { Rng } from '../rng';
import * as C from '../core';
import { FISH_COST, GameError, type FishGround, type FishUse, type GameState } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const LAKE_NUMBERS = [2, 3, 11, 12];
export const FISH_LIMIT = 7;
const GROUND_NUMBERS = [4, 5, 6, 8, 9, 10];

/** 11 de un pez, 10 de dos, 8 de tres y la bota vieja (0). */
export function newPile(rng: Rng): number[] {
  const pile = [...Array(11).fill(1), ...Array(10).fill(2), ...Array(8).fill(3), 0];
  return rng.shuffle(pile);
}

export function setup(s: GameState, rng: Rng) {
  const g = C.G(s);
  const lakes = Object.values(s.board.hexes).filter((h) => h.terrain === 'lake').map((h) => h.id);
  const harborHexes = new Set(s.board.harbors.map((h) => h.hex));
  const harborVertices = new Set(s.board.harbors.flatMap((h) => [g.edges[h.edge].a, g.edges[h.edge].b]));
  // caladero: casilla de mar pegada a dos casillas de tierra vecinas entre sí (toca tres cruces de la costa)
  const cands: FishGround[] = [];
  for (const [id, h] of Object.entries(s.board.hexes)) {
    if (h.terrain !== 'sea' || harborHexes.has(id)) continue;
    const vs = g.hexes[id].vertices.filter((v) => C.vertexLand(s, v));
    if (vs.length !== 3) continue;
    cands.push({ hex: id, n: 0, vertices: vs });
  }
  const clean = cands.filter((c) => !c.vertices.some((v) => harborVertices.has(v)));
  const pool = clean.length >= 6 ? clean : cands;
  // repartidos alrededor de la isla
  const cx = pool.reduce((a, c) => a + g.hexes[c.hex].X, 0) / Math.max(1, pool.length);
  const cy = pool.reduce((a, c) => a + g.hexes[c.hex].Y, 0) / Math.max(1, pool.length);
  const angle = (c: FishGround) => Math.atan2(g.hexes[c.hex].Y * 0.866 - cy * 0.866, g.hexes[c.hex].X * 0.5 - cx * 0.5);
  const sorted = [...pool].sort((a, b) => angle(a) - angle(b));
  const want = Math.min(sorted.length, s.players.length > 4 ? 8 : 6);
  const offset = rng.int(Math.max(1, sorted.length));
  const picked: FishGround[] = [];
  const used = new Set<string>();
  for (let i = 0; i < want; i++) {
    let j = (offset + Math.round((i * sorted.length) / want)) % sorted.length;
    // sin caladeros que compartan cruces
    for (let k = 0; k < sorted.length && (used.has(sorted[j].hex) || sorted[j].vertices.some((v) => picked.some((p) => p.vertices.includes(v)))); k++) j = (j + 1) % sorted.length;
    if (used.has(sorted[j].hex)) continue;
    used.add(sorted[j].hex);
    picked.push({ ...sorted[j] });
  }
  const numbers = rng.shuffle(want > 6 ? [...GROUND_NUMBERS, 5, 9] : [...GROUND_NUMBERS]);
  picked.forEach((p, i) => { p.n = numbers[i % numbers.length]; });
  s.hidden.fishPile = newPile(rng);
  s.fish = { lakes, grounds: picked, pile: s.hidden.fishPile.length, boot: null };
  for (const p of s.players) p.fish = [];
}

/** Saca una ficha de la pila para `seat` (si no está en el límite). */
export function draw(s: GameState, seat: number): boolean {
  const p = s.players[seat];
  const pile = s.hidden.fishPile ?? [];
  if (!pile.length || (p.fish ?? []).length >= FISH_LIMIT) return false;
  const v = pile.shift()!;
  s.fish!.pile = pile.length;
  if (v === 0) {
    s.fish!.boot = seat;
    C.log(s, 'fish.boot', { seat });
    return true;
  }
  p.fish = [...(p.fish ?? []), v];
  return true;
}

/** Cruces que pescan con un número: los del lago (2, 3, 11, 12) y los de cada caladero con ese número. */
export function fishingVertices(s: GameState, total: number): string[] {
  const f = s.fish;
  if (!f) return [];
  const g = C.G(s);
  const out: string[] = [];
  if (LAKE_NUMBERS.includes(total)) for (const l of f.lakes) if (s.board.robber !== l) out.push(...g.hexes[l].vertices);
  for (const gr of f.grounds) if (gr.n === total) out.push(...gr.vertices);
  return out;
}

export function produce(s: GameState, total: number) {
  if (!s.fish || total === 7) return;
  const caught: Record<number, number> = {};
  for (const v of fishingVertices(s, total)) {
    const b = s.buildings[v];
    if (!b || s.players[b.owner].neutral) continue;
    const k = b.kind === 'city' && !b.damaged ? 2 : 1;
    for (let i = 0; i < k; i++) if (draw(s, b.owner)) caught[b.owner] = (caught[b.owner] ?? 0) + 1;
  }
  for (const [seat, n] of Object.entries(caught)) C.log(s, 'fish.catch', { seat: Number(seat), n });
}

/** Preparación: el segundo poblado junto al agua de pesca recibe una ficha. */
export function setupBonus(s: GameState, seat: number, v: string) {
  if (!s.fish) return;
  const g = C.G(s);
  const wet = s.fish.grounds.some((gr) => gr.vertices.includes(v)) || s.fish.lakes.some((l) => g.hexes[l].vertices.includes(v));
  if (wet && draw(s, seat)) C.log(s, 'fish.catch', { seat, n: 1 });
}

const total = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/** Fichas a entregar: las que suman lo justo o lo menos posible por encima (no se da vuelto). */
export function payment(hand: number[], cost: number): number[] | null {
  if (total(hand) < cost) return null;
  let best: number[] | null = null;
  const n = hand.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) pick.push(i);
    const sum = total(pick.map((i) => hand[i]));
    if (sum < cost) continue;
    if (!best || sum < total(best.map((i) => hand[i])) || (sum === total(best.map((i) => hand[i])) && pick.length < best.length)) best = pick;
  }
  return best;
}

export function canFish(s: GameState, seat: number, use: FishUse): boolean {
  if (!s.fish || s.turn.phase !== 'main' || s.turn.current !== seat || s.steps.length) return false;
  if (!payment(s.players[seat].fish ?? [], FISH_COST[use])) return false;
  switch (use) {
    case 'robber': return !!s.board.robber;
    case 'steal': return s.players.some((p) => p.seat !== seat && !p.neutral && C.resourcesIn(p.hand) > 0);
    case 'bank': return C.resourcesIn(s.bank) > 0;
    case 'road': return C.piecesLeft(s, seat).road > 0 && C.legalRoads(s, seat).length > 0;
    case 'dev': return s.hidden.devDeck.length > 0;
  }
}

export function spend(s: GameState, seat: number, use: FishUse, rng: Rng) {
  need(canFish(s, seat, use), 'illegal');
  const p = s.players[seat];
  const idx = payment(p.fish!, FISH_COST[use])!;
  const paid = idx.map((i) => p.fish![i]);
  p.fish = p.fish!.filter((_, i) => !idx.includes(i));
  // las fichas vuelven a la pila, mezcladas
  const pile = s.hidden.fishPile ?? [];
  for (const v of paid) pile.splice(rng.int(pile.length + 1), 0, v);
  s.hidden.fishPile = pile;
  s.fish!.pile = pile.length;
  C.log(s, 'fish.spend', { seat, use, n: total(paid) });
  switch (use) {
    case 'robber':
      s.board.robber = null;
      C.log(s, 'fish.robber', { seat });
      break;
    case 'steal': {
      const from = s.players.filter((x) => x.seat !== seat && !x.neutral && C.resourcesIn(x.hand) > 0).map((x) => x.seat);
      s.steps.unshift({ k: 'steal', seat, hex: '', on: 'event', from });
      break;
    }
    case 'bank':
      s.steps.unshift({ k: 'pick', reason: 'fish', waiting: { [seat]: 1 } });
      break;
    case 'road':
      s.steps.unshift({ k: 'freeRoutes', seat, left: 1, source: 'fish' });
      break;
    case 'dev': {
      const card = s.hidden.devDeck.shift()!;
      p.dev.push({ type: card, turn: s.turn.n });
      C.log(s, 'dev.buy.card', { seat, card }, [seat], { k: 'dev.buy', p: { seat } });
      break;
    }
  }
}

/** La bota vieja se le puede pasar a alguien con tantos puntos visibles como tú o más. */
export function bootTargets(s: GameState, seat: number): number[] {
  if (s.fish?.boot !== seat) return [];
  const mine = C.vpOf(s, seat, false);
  return s.players.filter((p) => p.seat !== seat && !p.neutral && C.vpOf(s, p.seat, false) >= mine).map((p) => p.seat);
}

export function passBoot(s: GameState, seat: number, to: number) {
  need(s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length, 'notYourTurn');
  need(bootTargets(s, seat).includes(to), 'illegal');
  s.fish!.boot = to;
  C.log(s, 'fish.passBoot', { seat, to });
}

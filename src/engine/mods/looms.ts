// Aldeas tejedoras: entre las dos islas grandes hay islitas con dos aldeas cada una. Quien llega en barco a una
// aldea recibe una tela y después otra cada vez que sale el número de la aldea. Dos telas valen un punto.
// La partida también termina cuando quedan tres aldeas o menos con telas.
import type { Rng } from '../rng';
import * as C from '../core';
import type { GameState, Village } from '../types';

export const CLOTH_PER_VILLAGE = 5;
export const LAST_VILLAGES = 3;

export function setup(s: GameState, rng: Rng, isles: string[]) {
  const g = C.G(s);
  const big = s.players.length > 4;
  const byIsle = new Map<number, string[]>();
  for (const h of isles) {
    const r = s.board.hexes[h].region ?? -1;
    byIsle.set(r, [...(byIsle.get(r) ?? []), h]);
  }
  const numbers = rng.shuffle(big ? [2, 3, 4, 5, 6, 8, 9, 10, 11, 12] : [3, 4, 5, 6, 8, 9, 10, 11]);
  const px = (v: string) => [g.vertices[v].X * 0.866, g.vertices[v].Y * 0.5];
  const far = (a: string, b: string) => Math.hypot(px(a)[0] - px(b)[0], px(a)[1] - px(b)[1]);
  const villages: Village[] = [];
  for (const hexes of byIsle.values()) {
    // cruces de la costa a los que llega un barco
    const vs = [...new Set(hexes.flatMap((h) => g.hexes[h].vertices))]
      .filter((v) => g.vertices[v].edges.some((e) => C.edgeShippable(s, e)));
    let best: [string, string] | null = null;
    let top = -1;
    for (const a of rng.shuffle([...vs])) for (const b of vs) {
      if (a === b) continue;
      const d = far(a, b);
      if (d > top + 0.01) { top = d; best = [a, b]; }
    }
    if (!best) continue;
    for (const v of best) villages.push({ v, n: numbers[villages.length % numbers.length], cloth: CLOTH_PER_VILLAGE, linked: [] });
  }
  s.looms = { hexes: [...isles], villages, supply: big ? 12 : 10, cloth: s.players.map(() => 0) };
}

const villageAt = (s: GameState, v: string) => s.looms?.villages.find((x) => x.v === v) ?? null;

function take(s: GameState, seat: number, vil: Village): boolean {
  const l = s.looms!;
  if (vil.cloth > 0) vil.cloth--;
  else if (l.supply > 0) l.supply--;
  else return false;
  l.cloth[seat]++;
  return true;
}

/** Un barco propio llegó a `e`: si toca una aldea a la que aún no llegaba, queda unido y recibe una tela. */
export function afterShip(s: GameState, seat: number, e: string) {
  if (!s.looms) return;
  const ed = C.G(s).edges[e];
  for (const v of [ed.a, ed.b]) {
    const vil = villageAt(s, v);
    if (!vil || vil.linked.includes(seat)) continue;
    vil.linked.push(seat);
    // la primera tela sale de la aldea (si está vacía, no hay)
    const got = vil.cloth > 0 && take(s, seat, vil);
    C.log(s, 'looms.link', { seat, n: vil.n, got });
  }
}

/** Sale un número: cada jugador unido a esa aldea recibe una tela (si la aldea se vacía, de la reserva). */
export function produce(s: GameState, total: number) {
  const l = s.looms;
  if (!l || total === 7) return;
  const n = s.players.length;
  for (const vil of l.villages) {
    if (vil.n !== total || vil.cloth <= 0 || !vil.linked.length) continue;
    // en orden desde el jugador del turno, por si la reserva no alcanza
    const order = Array.from({ length: n }, (_, i) => (s.turn.current + i) % n).filter((x) => vil.linked.includes(x));
    for (const seat of order) if (take(s, seat, vil)) C.log(s, 'looms.cloth', { seat, n: total });
  }
}

/** Aldeas a las que `seat` ya llegó (sin eso no puede mover el pirata). */
export const linked = (s: GameState, seat: number) => s.looms?.villages.some((x) => x.linked.includes(seat)) ?? false;

export const villagesLeft = (s: GameState) => s.looms?.villages.filter((x) => x.cloth > 0).length ?? 0;

/** ¿Terminó por falta de telas? */
export const exhausted = (s: GameState) => !!s.looms && villagesLeft(s) <= LAST_VILLAGES;

/** Ganador cuando se acaban las telas: más puntos; si empatan, más telas; si siguen empatados, el primero desde el turno. */
export function leader(s: GameState): number {
  const n = s.players.length;
  let best = s.turn.current;
  for (let i = 1; i < n; i++) {
    const x = (s.turn.current + i) % n;
    const a = [C.vpOf(s, x), s.looms!.cloth[x]];
    const b = [C.vpOf(s, best), s.looms!.cloth[best]];
    if (a[0] > b[0] || (a[0] === b[0] && a[1] > b[1])) best = x;
  }
  return best;
}

/** El pirata le quita una tela a `victim`. */
export function stealCloth(s: GameState, thief: number, victim: number) {
  const l = s.looms!;
  l.cloth[victim]--;
  l.cloth[thief]++;
  C.log(s, 'looms.steal', { seat: thief, victim });
}

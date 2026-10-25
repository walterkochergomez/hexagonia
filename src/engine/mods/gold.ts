// Oro (invasión en la costa y carretas): no es un recurso. Dos de oro compran un recurso (dos veces por turno) y
// cuatro recursos iguales, o tres con un puerto 3:1, se cambian por uno de oro.
import * as C from '../core';
import { GameError, isResource, type GameState, type Resource } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export const BUYS = 2;

export function setup(s: GameState, start: number) {
  s.gold = s.players.map(() => start);
}

export function gain(s: GameState, seat: number, n: number, why: string) {
  if (!s.gold || n <= 0) return;
  s.gold[seat] = (s.gold[seat] ?? 0) + n;
  C.log(s, 'gold.gain', { seat, n, why });
}

/** Pagar oro a otro jugador (peajes) o al banco (to = null). Devuelve lo pagado. */
export function pay(s: GameState, seat: number, n: number, to: number | null): number {
  if (!s.gold) return 0;
  const k = Math.min(n, s.gold[seat] ?? 0);
  s.gold[seat] -= k;
  if (to !== null) s.gold[to] = (s.gold[to] ?? 0) + k;
  return k;
}

const mainTurn = (s: GameState, seat: number) => s.turn.phase === 'main' && s.turn.current === seat && !s.steps.length;

export function canBuy(s: GameState, seat: number): boolean {
  return !!s.gold && mainTurn(s, seat) && (s.gold[seat] ?? 0) >= 2 && (s.turn.goldBuys ?? 0) < BUYS && C.resourcesIn(s.bank) > 0;
}

export function buy(s: GameState, seat: number) {
  need(canBuy(s, seat), 'illegal');
  s.gold![seat] -= 2;
  s.turn.goldBuys = (s.turn.goldBuys ?? 0) + 1;
  C.log(s, 'gold.buy', { seat });
  s.steps.unshift({ k: 'pick', reason: 'gold2', waiting: { [seat]: 1 } });
}

/** Cuatro iguales por uno de oro; con un puerto 3:1, tres (los puertos 2:1 no ayudan). */
export const sellRatio = (s: GameState, seat: number) => (C.harborKinds(s, seat).has('any') ? 3 : 4);

export function sell(s: GameState, seat: number, give: Resource) {
  need(!!s.gold && mainTurn(s, seat) && isResource(give), 'illegal');
  const n = sellRatio(s, seat);
  C.pay(s, seat, { [give]: n });
  s.gold![seat] += 1;
  C.log(s, 'gold.sell', { seat, give, n });
}

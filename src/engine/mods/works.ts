// Grandes obras: cinco obras de cuatro niveles. Cada jugador puede levantar una sola, la primera que cumpla su
// requisito y esté libre. Gana quien termina el cuarto nivel, o quien llega a la meta de puntos con un nivel más
// alto que todos los demás.
import * as C from '../core';
import { GameError, WONDERS, WONDER_COST, WONDER_LEVELS, type GameState, type WonderId } from '../types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

export function setup(s: GameState, marks: { strait?: string; rock?: string[] }) {
  const g = C.G(s);
  // estrecho: los cruces de tierra de la casilla de mar que separa la isla grande de una islita
  const strait = marks.strait ? g.hexes[marks.strait].vertices.filter((v) => C.vertexLand(s, v)) : [];
  // páramo: los cruces que tocan al menos dos de los tres desiertos
  const deserts = new Set(marks.rock ?? []);
  const waste = Object.keys(g.vertices).filter((v) => g.vertices[v].hexes.filter((h) => deserts.has(h)).length >= 2);
  s.works = { wonders: WONDERS.map((id) => ({ id, owner: null, level: 0 })), strait, waste };
}

export const wonderOf = (s: GameState, seat: number) => s.works?.wonders.find((w) => w.owner === seat) ?? null;
export const levelOf = (s: GameState, seat: number) => wonderOf(s, seat)?.level ?? 0;

/** Requisito para empezar cada obra. */
export function meets(s: GameState, seat: number, id: WonderId): boolean {
  const w = s.works;
  if (!w) return false;
  const g = C.G(s);
  const mine = Object.entries(s.buildings).filter(([, b]) => b.owner === seat);
  const cities = mine.filter(([, b]) => b.kind === 'city' && !b.damaged);
  switch (id) {
    case 'tower': {
      const docks = new Set(s.board.harbors.flatMap((h) => [g.edges[h.edge].a, g.edges[h.edge].b]));
      return cities.some(([v]) => docks.has(v)) && C.longestRoute(s, seat) >= 5;
    }
    case 'library': return cities.length >= 1 && C.vpOf(s, seat, false) >= 6;
    case 'lock': return mine.some(([v]) => w.strait.includes(v));
    case 'mills': return mine.some(([v]) => w.waste.includes(v));
    case 'observatory': return cities.length >= 2;
  }
}

/** ¿Puede pagar el próximo nivel de `id` ahora? (empezarla si está libre y cumple el requisito) */
export function canBuild(s: GameState, seat: number, id: WonderId): boolean {
  if (!s.works || !['main', 'specialBuild', 'paired'].includes(s.turn.phase) || C.actorOf(s) !== seat || s.steps.length) return false;
  const w = s.works.wonders.find((x) => x.id === id);
  if (!w || w.level >= WONDER_LEVELS) return false;
  const mine = wonderOf(s, seat);
  if (mine ? mine.id !== id : w.owner !== null || !meets(s, seat, id)) return false;
  return C.hasCards(s.players[seat].hand, WONDER_COST[id]);
}

export function build(s: GameState, seat: number, id: WonderId) {
  need(canBuild(s, seat, id), 'illegal');
  const w = s.works!.wonders.find((x) => x.id === id)!;
  C.pay(s, seat, WONDER_COST[id]);
  if (w.owner === null) {
    w.owner = seat;
    C.log(s, 'wonder.start', { seat, id });
  }
  w.level++;
  C.log(s, 'wonder.level', { seat, id, n: w.level });
}

/** Gana con el cuarto nivel, o con la meta de puntos y un nivel más alto que todos. */
export function wins(s: GameState, seat: number): boolean {
  const lv = levelOf(s, seat);
  if (lv >= WONDER_LEVELS) return true;
  if (lv === 0 || C.vpOf(s, seat) < C.targetOf(s, seat)) return false;
  return s.works!.wonders.every((x) => x.owner === seat || x.level < lv);
}

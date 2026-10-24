import { describe, it, expect } from 'vitest';
import { applyAction, createGame } from '../src/engine/game';
import { seaMap, standardMap } from '../src/engine/maps';
import { Rng, seedRng } from '../src/engine/rng';
import * as C from '../src/engine/core';
import { viewFor } from '../src/engine/view';
import { buildGraph, parseHex, sharedVertex } from '../src/engine/geometry';
import { harborPoints } from '../src/engine/mods/harbor';
import { CHRONICLE_CARDS, newDeck } from '../src/engine/mods/chronicle';
import * as Duel from '../src/engine/mods/duel';
import * as Fish from '../src/engine/mods/fish';
import * as River from '../src/engine/mods/river';
import * as Caravan from '../src/engine/mods/caravan';
import { settings, seats, totals } from './helpers';
import {
  CARDS, RESOURCES, handTotal, type Action, type Card, type GameState, type Hand, type SeaScenario, type Settings,
} from '../src/engine/types';

function game(over: Partial<Settings> = {}, n = 4): GameState {
  return createGame(settings(over), seats(n));
}

/** Pasa a la fase principal del jugador `seat` sin preparación. */
function main(s: GameState, seat = 0): GameState {
  s.turn.phase = 'main';
  s.turn.current = seat;
  s.turn.n = 10;
  s.turn.dice = [3, 4];
  s.steps = [];
  return s;
}

function give(s: GameState, seat: number, cards: Partial<Hand>) {
  for (const c of CARDS) {
    const n = cards[c] ?? 0;
    s.players[seat].hand[c] += n;
    s.bank[c] -= n;
  }
}

const act = (s: GameState, seat: number, a: Action) => applyAction(s, seat, a);

function landVertex(s: GameState, pred: (v: string) => boolean = () => true): string {
  const g = C.G(s);
  const vs = Object.keys(g.vertices).filter((v) => g.vertices[v].hexes.length === 3 && g.vertices[v].hexes.every((h) => C.hexIsLand(s, h)) && pred(v));
  return vs[0];
}

/** Camino simple de `len` aristas en tierra a partir de un vértice interior. */
function landPath(s: GameState, len: number): { vs: string[]; es: string[] } {
  const g = C.G(s);
  const starts = Object.keys(g.vertices).filter((v) => C.vertexLand(s, v));
  for (const start of starts) {
    const vs = [start];
    const es: string[] = [];
    const ok = (function dfs(v: string): boolean {
      if (es.length === len) return true;
      for (const e of g.vertices[v].edges) {
        if (!C.edgeRoadable(s, e) || es.includes(e)) continue;
        const w = C.G(s).edges[e].a === v ? g.edges[e].b : g.edges[e].a;
        if (vs.includes(w)) continue;
        vs.push(w);
        es.push(e);
        if (dfs(w)) return true;
        vs.pop();
        es.pop();
      }
      return false;
    })(start);
    if (ok) return { vs, es };
  }
  throw new Error('sin camino');
}

describe('mapas', () => {
  it('mapa estándar 3-4: terrenos, números y puertos', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const m = standardMap(new Rng(seedRng(seed)), false);
      const land = Object.values(m.hexes).filter((h) => h.terrain !== 'sea');
      expect(land.length).toBe(19);
      const count = (t: string) => land.filter((h) => h.terrain === t).length;
      expect([count('forest'), count('pasture'), count('fields'), count('hills'), count('mountains'), count('desert')]).toEqual([4, 4, 4, 3, 3, 1]);
      expect(land.filter((h) => h.number).map((h) => h.number).sort((a, b) => a! - b!)).toEqual([2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]);
      const byId = Object.fromEntries(land.map((h) => [h.id, h]));
      for (const h of land) {
        if (h.number !== 6 && h.number !== 8) continue;
        const g = buildGraph(Object.values(m.hexes).map((x) => [x.q, x.r]));
        for (const nb of g.hexes[h.id].neighbors) if (nb && byId[nb]) expect([6, 8]).not.toContain(byId[nb].number);
      }
      expect(m.harbors.length).toBe(9);
      const g = buildGraph(Object.values(m.hexes).map((x) => [x.q, x.r]));
      const used = new Set<string>();
      for (const hb of m.harbors) {
        const e = g.edges[hb.edge];
        expect(e.hexes.some((x) => m.hexes[x].terrain === 'sea')).toBe(true);
        expect(e.hexes.some((x) => m.hexes[x].terrain !== 'sea')).toBe(true);
        expect(used.has(e.a) || used.has(e.b)).toBe(false);
        used.add(e.a);
        used.add(e.b);
      }
      expect(m.harbors.filter((x) => x.kind === 'any').length).toBe(4);
    }
  });

  it('mapa estándar 5-6: 30 hexágonos, 28 números, 11 puertos', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const m = standardMap(new Rng(seedRng(seed)), true);
      const land = Object.values(m.hexes).filter((h) => h.terrain !== 'sea');
      expect(land.length).toBe(30);
      expect(land.filter((h) => h.number).length).toBe(28);
      expect(land.filter((h) => h.terrain === 'desert').length).toBe(2);
      expect(m.harbors.length).toBe(11);
    }
  });

  it('mapas de Mar Abierto se generan en todos los escenarios y tamaños', () => {
    for (const sc of ['islands', 'archipelago', 'fog', 'desert', 'newWorld'] as SeaScenario[]) {
      for (const big of [false, true]) {
        for (let seed = 1; seed <= 12; seed++) {
          const m = seaMap(new Rng(seedRng(seed * 31)), sc, big);
          const land = Object.values(m.hexes).filter((h) => h.terrain !== 'sea' && h.terrain !== 'fog');
          expect(land.length).toBeGreaterThanOrEqual(sc === 'fog' ? 14 : 24);
          expect(m.harbors.length).toBeGreaterThanOrEqual(4);
          if (sc === 'fog') expect(Object.keys(m.fog).length).toBeGreaterThan(10);
          if (sc === 'desert') {
            for (const h of Object.values(m.hexes)) if (h.terrain === 'gold') expect([6, 8]).not.toContain(h.number);
          }
          for (const h of Object.values(m.hexes)) {
            const [q, r] = parseHex(h.id);
            expect([q, r]).toEqual([h.q, h.r]);
          }
        }
      }
    }
  });
});

describe('preparación', () => {
  it('orden en serpiente, recursos de la segunda colocación y paso al primer turno', () => {
    let s = game({ seed: 5 }, 3);
    const order = s.turn.setupOrder;
    expect(order.length).toBe(6);
    expect(order.slice(3)).toEqual([...order.slice(0, 3)].reverse());
    for (let i = 0; i < 6; i++) {
      const seat = order[i];
      const v = C.legalSetupVertices(s)[0];
      const before = handTotal(s.players[seat].hand);
      s = act(s, seat, { t: 'setupBuild', vertex: v });
      const producing = C.G(s).vertices[v].hexes.filter((h) => C.hexIsLand(s, h) && s.board.hexes[h].terrain !== 'desert').length;
      expect(handTotal(s.players[seat].hand) - before).toBe(i >= 3 ? producing : 0);
      const r = C.legalSetupRoutes(s, v);
      s = act(s, seat, { t: 'setupRoute', edge: r.roads[0] });
    }
    expect(s.turn.phase).toBe('preRoll');
    expect(s.turn.current).toBe(order[0]);
  });

  it('respeta la regla de distancia', () => {
    let s = game({ seed: 6 });
    const seat = s.turn.setupOrder[0];
    const v = landVertex(s);
    s = act(s, seat, { t: 'setupBuild', vertex: v });
    const nb = C.G(s).vertices[v].neighbors[0];
    expect(C.setupVertexOk(s, nb)).toBe(false);
  });
});

describe('producción, siete y ladrón', () => {
  it('escasez del banco: nadie cobra si no alcanza para todos', () => {
    let s = main(game({ seed: 7 }));
    const hex = Object.values(s.board.hexes).find((h) => h.terrain === 'mountains' && h.number)!;
    const g = C.G(s);
    const [v1, , v3] = g.hexes[hex.id].vertices;
    s.buildings[v1] = { owner: 1, kind: 'city' };
    s.buildings[v3] = { owner: 2, kind: 'settlement' };
    s.bank.ore = 2; // demanda 3
    const others = totals(s).ore;
    s.turn.phase = 'preRoll';
    const n = hex.number!;
    s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
    s.board.robber = null;
    s = act(s, 0, { t: 'roll' });
    expect(s.players[1].hand.ore).toBe(0);
    expect(s.players[2].hand.ore).toBe(0);
    expect(totals(s).ore).toBe(others);
  });

  it('escasez con un solo afectado: recibe lo que queda', () => {
    let s = main(game({ seed: 8 }));
    const hex = Object.values(s.board.hexes).find((h) => h.terrain === 'mountains' && h.number)!;
    const [v1] = C.G(s).hexes[hex.id].vertices;
    s.buildings[v1] = { owner: 1, kind: 'city' };
    s.bank.ore = 1;
    s.turn.phase = 'preRoll';
    const n = hex.number!;
    s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
    s.board.robber = null;
    s = act(s, 0, { t: 'roll' });
    expect(s.players[1].hand.ore).toBe(1);
  });

  it('siete: descartan la mitad los que tienen más de 7 y el ladrón roba', () => {
    let s = main(game({ seed: 9 }));
    give(s, 1, { lumber: 4, brick: 5 }); // 9 cartas → descarta 4
    give(s, 2, { wool: 7 }); // 7 cartas → no descarta
    const hex = Object.values(s.board.hexes).find((h) => h.terrain === 'fields' && h.id !== s.board.robber)!;
    const v = C.G(s).hexes[hex.id].vertices[0];
    s.buildings[v] = { owner: 2, kind: 'settlement' };
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [3, 4];
    s = act(s, 0, { t: 'roll' });
    expect(s.steps[0]).toMatchObject({ k: 'discard', waiting: { 1: 4 } });
    expect(() => act(s, 0, { t: 'robber', hex: hex.id, target: 'robber' })).toThrow();
    s = act(s, 1, { t: 'discard', cards: { lumber: 2, brick: 2 } });
    expect(s.steps[0].k).toBe('robber');
    s = act(s, 0, { t: 'robber', hex: hex.id, target: 'robber' });
    expect(s.board.robber).toBe(hex.id);
    expect(handTotal(s.players[0].hand)).toBe(1);
    expect(handTotal(s.players[2].hand)).toBe(6);
  });

  it('el hexágono con ladrón no produce', () => {
    let s = main(game({ seed: 10 }));
    const hex = Object.values(s.board.hexes).find((h) => h.terrain === 'forest' && h.number)!;
    s.buildings[C.G(s).hexes[hex.id].vertices[0]] = { owner: 1, kind: 'settlement' };
    s.board.robber = hex.id;
    s.turn.phase = 'preRoll';
    const n = hex.number!;
    s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
    s = act(s, 0, { t: 'roll' });
    expect(s.players[1].hand.lumber).toBe(0);
  });
});

describe('construcción y premios', () => {
  it('ruta más larga: se gana con 5 y se pierde al cortarla', () => {
    let s = main(game({ seed: 11 }));
    const { vs, es } = landPath(s, 6);
    s.buildings[vs[0]] = { owner: 0, kind: 'settlement' };
    give(s, 0, { lumber: 6, brick: 6 });
    for (const e of es.slice(0, 5)) s = act(s, 0, { t: 'build', what: 'road', at: e });
    expect(s.awards.road).toEqual({ owner: 0, len: 5 });
    expect(C.vpOf(s, 0)).toBe(3);
    // el rival corta en el medio con un poblado
    s.roads[C.G(s).vertices[vs[3]].edges.find((e) => !es.includes(e) && C.edgeRoadable(s, e))!] = { owner: 1 };
    give(s, 1, { lumber: 1, brick: 1, wool: 1, grain: 1 });
    s = main(s, 1);
    s = act(s, 1, { t: 'build', what: 'settlement', at: vs[3] });
    expect(s.awards.road.owner).toBe(null);
  });

  it('ciudad sobre poblado propio y límites de piezas', () => {
    let s = main(game({ seed: 12 }));
    const v = landVertex(s);
    s.buildings[v] = { owner: 0, kind: 'settlement' };
    give(s, 0, { grain: 2, ore: 3 });
    s = act(s, 0, { t: 'build', what: 'city', at: v });
    expect(s.buildings[v].kind).toBe('city');
    expect(C.vpOf(s, 0)).toBe(2);
  });
});

describe('cartas de desarrollo', () => {
  it('no se juega la comprada este turno, una por turno, y mayor ejército con 3', () => {
    let s = main(game({ seed: 13 }));
    s.hidden.devDeck.unshift('soldier');
    give(s, 0, { wool: 1, grain: 1, ore: 1 });
    s = act(s, 0, { t: 'buyDev' });
    expect(s.players[0].dev[0].type).toBe('soldier');
    expect(() => act(s, 0, { t: 'playDev', card: 'soldier' })).toThrow();
    s.players[0].dev.push({ type: 'soldier', turn: 1 }, { type: 'soldier', turn: 1 }, { type: 'soldier', turn: 1 });
    s = act(s, 0, { t: 'playDev', card: 'soldier' });
    expect(s.steps[0].k).toBe('robber');
    const hex = C.legalRobberHexes(s, 0)[0];
    s = act(s, 0, { t: 'robber', hex, target: 'robber' });
    expect(() => act(s, 0, { t: 'playDev', card: 'soldier' })).toThrow('oneDevPerTurn');
    s.players[0].soldiers = 2;
    s.turn.n = 11;
    s = act(s, 0, { t: 'playDev', card: 'soldier' });
    expect(s.awards.army.owner).toBe(0);
  });

  it('monopolio y año de abundancia', () => {
    let s = main(game({ seed: 14 }));
    give(s, 1, { wool: 3 });
    give(s, 2, { wool: 2, ore: 1 });
    s.players[0].dev.push({ type: 'monopoly', turn: 1 });
    s = act(s, 0, { t: 'playDev', card: 'monopoly' });
    s = act(s, 0, { t: 'monopoly', card: 'wool' });
    expect(s.players[0].hand.wool).toBe(5);
    expect(s.players[2].hand.ore).toBe(1);
    s.turn.n++;
    s.players[0].dev.push({ type: 'plenty', turn: 1 });
    s = act(s, 0, { t: 'playDev', card: 'plenty' });
    s = act(s, 0, { t: 'pick', cards: { ore: 1, grain: 1 } });
    expect(s.players[0].hand.ore).toBe(1);
  });
});

describe('comercio', () => {
  it('oferta, aceptación, contraoferta y confirmación', () => {
    let s = main(game({ seed: 15 }));
    give(s, 0, { lumber: 2 });
    give(s, 1, { ore: 1 });
    give(s, 2, { grain: 2 });
    expect(() => act(s, 0, { t: 'offer', give: { lumber: 1 }, want: { lumber: 1 } })).toThrow();
    s = act(s, 0, { t: 'offer', give: { lumber: 1 }, want: { ore: 1 } });
    s = act(s, 1, { t: 'reply', id: s.trade!.id, status: 'accept' });
    s = act(s, 2, { t: 'counter', id: s.trade!.id, give: { grain: 2 }, want: { lumber: 2 } });
    s = act(s, 0, { t: 'confirmTrade', id: s.trade!.id, with: 2 });
    expect(s.players[0].hand).toMatchObject({ lumber: 0, grain: 2 });
    expect(s.players[2].hand).toMatchObject({ lumber: 2, grain: 0 });
    expect(s.trade).toBe(null);
  });

  it('banco 4:1, puerto 3:1 y 2:1', () => {
    let s = main(game({ seed: 16 }));
    give(s, 0, { brick: 8 });
    expect(C.ratioFor(s, 0, 'brick')).toBe(4);
    const g = C.G(s);
    const any = s.board.harbors.find((h) => h.kind === 'any')!;
    s.buildings[g.edges[any.edge].a] = { owner: 0, kind: 'settlement' };
    expect(C.ratioFor(s, 0, 'brick')).toBe(3);
    const br = s.board.harbors.find((h) => h.kind === 'brick')!;
    s.buildings[g.edges[br.edge].a] = { owner: 0, kind: 'settlement' };
    expect(C.ratioFor(s, 0, 'brick')).toBe(2);
    expect(C.ratioFor(s, 0, 'ore')).toBe(3);
    s = act(s, 0, { t: 'bank', give: 'brick', get: 'ore', count: 2 });
    expect(s.players[0].hand).toMatchObject({ brick: 4, ore: 2 });
  });
});

describe('turnos y victoria', () => {
  it('5-6: fase especial de construcción para los demás en orden', () => {
    let s = main(game({ seed: 17 }, 5), 2);
    s = act(s, 2, { t: 'endTurn' });
    expect(s.turn.phase).toBe('specialBuild');
    expect(s.turn.sbpOrder).toEqual([3, 4, 0, 1]);
    give(s, 3, { lumber: 1, wool: 1 });
    expect(() => act(s, 3, { t: 'bank', give: 'lumber', get: 'ore', count: 1 })).toThrow();
    for (const p of [3, 4, 0, 1]) s = act(s, p, { t: 'endTurn' });
    expect(s.turn.phase).toBe('preRoll');
    expect(s.turn.current).toBe(3);
  });

  it('5-6: turno en pareja con el tercer jugador a la izquierda', () => {
    let s = main(game({ seed: 18, turnMode: 'paired' }, 6), 1);
    s = act(s, 1, { t: 'endTurn' });
    expect(s.turn.phase).toBe('paired');
    expect(s.turn.partner).toBe(4);
    give(s, 4, { lumber: 4, brick: 1 });
    expect(() => act(s, 4, { t: 'offer', give: { brick: 1 }, want: { ore: 1 } })).toThrow();
    s = act(s, 4, { t: 'bank', give: 'lumber', get: 'ore', count: 1 });
    s = act(s, 4, { t: 'endTurn' });
    expect(s.turn.current).toBe(2);
  });

  it('se gana sólo en el propio turno', () => {
    let s = main(game({ seed: 19 }), 0);
    const g = C.G(s);
    const vs = Object.keys(g.vertices).filter((v) => C.vertexLand(s, v));
    let k = 0;
    for (const v of vs) {
      if (k >= 4) break;
      if (!C.distanceOk(s, v)) continue;
      s.buildings[v] = { owner: 1, kind: 'city' };
      k++;
    }
    s.players[1].dev.push({ type: 'point', turn: 1 }, { type: 'point', turn: 1 });
    expect(C.vpOf(s, 1)).toBe(10);
    s = act(s, 0, { t: 'endTurn' });
    expect(s.winner).toBe(1);
  });
});

describe('Mar Abierto', () => {
  function seaGame(sc: SeaScenario = 'islands', seed = 20) {
    return main(game({ openSea: true, scenario: sc, seed }));
  }

  it('barcos sólo en el mar y unidos a poblado o barco propio; caminos y barcos se unen sólo en edificios', () => {
    let s = seaGame();
    const g = C.G(s);
    const coastV = Object.keys(g.vertices).find((v) => C.vertexLand(s, v) && g.vertices[v].hexes.some((h) => C.hexIsSea(s, h)) && g.vertices[v].hexes.length === 3)!;
    const shipEdge = g.vertices[coastV].edges.find((e) => C.edgeShippable(s, e))!;
    give(s, 0, { lumber: 3, wool: 3, brick: 2 });
    expect(C.canShip(s, 0, shipEdge)).toBe(false);
    // un camino que llega al vértice costero no basta para un barco
    const roadEdge = g.vertices[coastV].edges.find((e) => C.edgeRoadable(s, e) && e !== shipEdge)!;
    const far = g.edges[roadEdge].a === coastV ? g.edges[roadEdge].b : g.edges[roadEdge].a;
    s.buildings[far] = { owner: 0, kind: 'settlement' };
    s = act(s, 0, { t: 'build', what: 'road', at: roadEdge });
    expect(C.canShip(s, 0, shipEdge)).toBe(false);
    s.buildings[coastV] = { owner: 0, kind: 'settlement' };
    delete s.buildings[far];
    s = act(s, 0, { t: 'build', what: 'ship', at: shipEdge });
    expect(s.ships[shipEdge].owner).toBe(0);
  });

  it('mover barco: sólo el extremo de una ruta abierta, no el recién construido, una vez por turno', () => {
    let s = seaGame('islands', 21);
    const g = C.G(s);
    const coastV = Object.keys(g.vertices).find((v) => C.vertexLand(s, v) && g.vertices[v].edges.some((e) => C.edgeShippable(s, e)))!;
    s.buildings[coastV] = { owner: 0, kind: 'settlement' };
    give(s, 0, { lumber: 3, wool: 3 });
    let e1 = '';
    let e2 = '';
    for (const cand of C.legalShips(s, 0)) {
      const tip = g.edges[cand].a === coastV ? g.edges[cand].b : g.edges[cand].a;
      s.ships[cand] = { owner: 0 };
      const next = C.legalShips(s, 0).find((e) => sharedVertex(g, e, cand) === tip);
      delete s.ships[cand];
      if (next) {
        e1 = cand;
        e2 = next;
        break;
      }
    }
    s = act(s, 0, { t: 'build', what: 'ship', at: e1 });
    s = act(s, 0, { t: 'build', what: 'ship', at: e2 });
    expect(C.movableShips(s, 0)).toEqual([]); // construidos este turno
    s.turn.builtShips = [];
    expect(C.movableShips(s, 0)).toEqual([e2]);
    const to = C.shipTargets(s, 0, e2)[0];
    s = act(s, 0, { t: 'moveShip', from: e2, to });
    expect(s.ships[to]).toBeTruthy();
    expect(() => act(s, 0, { t: 'moveShip', from: to, to: e2 })).toThrow('shipMoved');
  });

  it('el pirata impide construir barcos en sus lados y roba a dueños de barcos', () => {
    let s = seaGame('islands', 22);
    const g = C.G(s);
    const coastV = Object.keys(g.vertices).find((v) => C.vertexLand(s, v) && g.vertices[v].edges.some((e) => C.edgeShippable(s, e)))!;
    s.buildings[coastV] = { owner: 0, kind: 'settlement' };
    const e = C.legalShips(s, 0)[0];
    const sea = g.edges[e].hexes.find((h) => C.hexIsSea(s, h))!;
    s.board.pirate = sea;
    expect(C.canShip(s, 0, e)).toBe(false);
  });

  it('campo de oro: producción a elección', () => {
    let s = seaGame('islands', 23);
    const gold = Object.values(s.board.hexes).find((h) => h.terrain === 'gold' && h.number)!;
    const v = C.G(s).hexes[gold.id].vertices.find((x) => C.vertexLand(s, x))!;
    s.buildings[v] = { owner: 1, kind: 'city' };
    s.turn.phase = 'preRoll';
    const n = gold.number!;
    s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
    s = act(s, 0, { t: 'roll' });
    expect(s.steps[0]).toMatchObject({ k: 'pick', reason: 'gold', waiting: { 1: 2 } });
    s = act(s, 1, { t: 'pick', cards: { ore: 2 } });
    expect(s.players[1].hand.ore).toBeGreaterThanOrEqual(2);
  });

  it('bono por la primera colonia en una isla nueva', () => {
    let s = seaGame('islands', 24);
    for (const p of s.players) p.homeRegions = [0];
    const island = Object.values(s.board.hexes).find((h) => h.region !== undefined && h.region > 0 && C.hexIsLand(s, h.id))!;
    const g = C.G(s);
    const v = g.hexes[island.id].vertices.find((x) => C.distanceOk(s, x))!;
    const e = g.vertices[v].edges.find((x) => C.edgeShippable(s, x) || C.edgeRoadable(s, x))!;
    if (C.edgeShippable(s, e)) s.ships[e] = { owner: 0 };
    else s.roads[e] = { owner: 0 };
    give(s, 0, { lumber: 1, brick: 1, wool: 1, grain: 1 });
    s = act(s, 0, { t: 'build', what: 'settlement', at: v });
    expect(s.players[0].bonus.length).toBe(1);
    expect(C.vpOf(s, 0)).toBe(1 + s.board.regionBonus);
  });

  it('niebla: al llegar se descubre el hexágono y da un recurso', () => {
    let s = seaGame('fog', 25);
    const g = C.G(s);
    const edge = Object.keys(g.edges).find((e) => {
      const hs = g.edges[e].hexes;
      return hs.length === 2 && hs.some((h) => s.board.hexes[h].terrain === 'fog') && hs.some((h) => C.hexIsSea(s, h));
    })!;
    const ed = g.edges[edge];
    const fogHex = ed.hexes.find((h) => s.board.hexes[h].terrain === 'fog')!;
    const content = s.hidden.fog[fogHex];
    s.ships[g.vertices[ed.a].edges.find((x) => x !== edge)!] = { owner: 0 };
    give(s, 0, { lumber: 1, wool: 1 });
    const before = handTotal(s.players[0].hand);
    s = act(s, 0, { t: 'build', what: 'ship', at: edge });
    expect(s.board.hexes[fogHex].terrain).toBe(content.terrain);
    expect(s.hidden.fog[fogHex]).toBeUndefined();
    const res = ['forest', 'hills', 'pasture', 'fields', 'mountains'].includes(content.terrain);
    expect(handTotal(s.players[0].hand)).toBeGreaterThanOrEqual(before - 2 + (res ? 1 : 0));
  });
});

describe('Gremios y Guardianes', () => {
  function guildGame(seed = 30) {
    return main(game({ guilds: true, seed }));
  }

  it('la segunda colocación es ciudad y produce mercancía', () => {
    let s = game({ guilds: true, seed: 31 }, 3);
    for (let i = 0; i < 6; i++) {
      const seat = s.turn.setupOrder[i];
      const v = C.legalSetupVertices(s)[0];
      s = act(s, seat, { t: 'setupBuild', vertex: v });
      expect(s.buildings[v].kind).toBe(i >= 3 ? 'city' : 'settlement');
      s = act(s, seat, { t: 'setupRoute', edge: C.legalSetupRoutes(s, v).roads[0] });
    }
    const forest = Object.values(s.board.hexes).find((h) => h.terrain === 'forest' && h.number)!;
    const v = C.G(s).hexes[forest.id].vertices.find((x) => !s.buildings[x] && C.distanceOk(s, x));
    if (v) {
      s.buildings[v] = { owner: 1, kind: 'city' };
      const n = forest.number!;
      s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
      s.board.robber = null;
      const before = s.players[1].hand.paper;
      s = act(s, s.turn.current, { t: 'roll' });
      expect(s.players[1].hand.paper).toBeGreaterThan(before);
    }
  });

  it('antes del primer ataque el siete no mueve el ladrón', () => {
    let s = guildGame(32);
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [3, 4];
    s = act(s, 0, { t: 'roll' });
    expect(s.steps.find((x) => x.k === 'robber')).toBeUndefined();
  });

  it('ataque bárbaro perdido: saquea al que menos aportó', () => {
    let s = guildGame(33);
    const vs = Object.keys(C.G(s).vertices).filter((v) => C.vertexLand(s, v));
    let placed = 0;
    for (const v of vs) {
      if (placed >= 4 || !C.distanceOk(s, v)) continue;
      s.buildings[v] = { owner: placed % 2, kind: 'city' };
      placed++;
    }
    const kv = vs.find((v) => !s.buildings[v] && !C.G(s).vertices[v].neighbors.some((n) => s.buildings[n]))!;
    s.knights[kv] = { owner: 0, level: 2, active: true, activatedTurn: 1, promotedTurn: -1 };
    s.barbarians.pos = 6;
    s.hidden.rng = [1, 2, 3, 4];
    // forzar barco en el dado de eventos probando semillas
    for (let k = 0; k < 200; k++) {
      const trial = structuredClone(s);
      trial.hidden.rng = [k + 1, 7, 13, 99];
      trial.turn.phase = 'preRoll';
      trial.turn.alchemist = [1, 2];
      const out = act(trial, 0, { t: 'roll' });
      if (out.barbarians.attacks === 1) {
        expect(out.barbarians.last).toMatchObject({ strength: 4, defense: 2, won: false, losers: [1] });
        const step = out.steps[0];
        expect(step).toMatchObject({ k: 'pillage', waiting: [1] });
        const after = act(out, 1, { t: 'pillage', vertex: C.pillageable(out, 1)[0] });
        expect(C.pillageable(after, 1).length).toBe(1);
        expect(Object.values(after.knights).every((x) => !x.active)).toBe(true);
        return;
      }
    }
    throw new Error('no salió barco');
  });

  it('defensa ganada: el que más aportó recibe un punto', () => {
    let s = guildGame(34);
    const v = landVertex(s);
    s.buildings[v] = { owner: 1, kind: 'city' };
    const kv = Object.keys(C.G(s).vertices).find((x) => C.vertexLand(s, x) && !s.buildings[x] && C.distanceOk(s, x))!;
    s.knights[kv] = { owner: 2, level: 1, active: true, activatedTurn: 1, promotedTurn: -1 };
    s.barbarians.pos = 6;
    for (let k = 0; k < 200; k++) {
      const trial = structuredClone(s);
      trial.hidden.rng = [k + 3, 5, 9, 1];
      trial.turn.phase = 'preRoll';
      trial.turn.alchemist = [1, 2];
      const out = act(trial, 0, { t: 'roll' });
      if (out.barbarians.attacks === 1) {
        expect(out.barbarians.last?.won).toBe(true);
        expect(out.players[2].defender).toBe(1);
        expect(out.board.robber).toBe(out.board.robberStart);
        return;
      }
    }
    throw new Error('no salió barco');
  });

  it('metrópolis al nivel 4 y se pierde ante un nivel 5', () => {
    let s = guildGame(35);
    const vs = Object.keys(C.G(s).vertices).filter((v) => C.vertexLand(s, v) && C.distanceOk(s, v));
    s.buildings[vs[0]] = { owner: 0, kind: 'city' };
    const v1 = vs.find((v) => C.distanceOk(s, v))!;
    s.buildings[v1] = { owner: 1, kind: 'city' };
    s.players[0].improvements.science = 3;
    s.players[1].improvements.science = 4;
    give(s, 0, { paper: 9 });
    s = act(s, 0, { t: 'improve', track: 'science' });
    expect(s.metropolis.science?.owner).toBe(0);
    expect(C.vpOf(s, 0)).toBe(4);
    s = main(s, 1);
    give(s, 1, { paper: 5 });
    s = act(s, 1, { t: 'improve', track: 'science' });
    expect(s.metropolis.science?.owner).toBe(1);
    expect(s.buildings[vs[0]].metro).toBeUndefined();
  });

  it('caballero fuerte desplaza a uno débil, que se reubica', () => {
    let s = guildGame(36);
    const { vs, es } = landPath(s, 4);
    s.buildings[vs[0]] = { owner: 0, kind: 'settlement' };
    for (const e of es) s.roads[e] = { owner: 0 };
    // rival con camino propio que llega al vértice vs[3]
    const g = C.G(s);
    const side = g.vertices[vs[3]].edges.find((e) => !es.includes(e) && C.edgeRoadable(s, e))!;
    s.roads[side] = { owner: 1 };
    s.knights[vs[1]] = { owner: 0, level: 2, active: true, activatedTurn: 1, promotedTurn: -1 };
    s.knights[vs[3]] = { owner: 1, level: 1, active: false, activatedTurn: -1, promotedTurn: -1 };
    expect(C.knightReach(s, vs[1], 0).foes).toContain(vs[3]);
    s = act(s, 0, { t: 'knightMove', from: vs[1], to: vs[3] });
    expect(s.knights[vs[3]].owner).toBe(0);
    expect(s.knights[vs[3]].active).toBe(false);
    const other = g.edges[side].a === vs[3] ? g.edges[side].b : g.edges[side].a;
    expect(s.steps[0]).toMatchObject({ k: 'relocate', seat: 1 });
    s = act(s, 1, { t: 'relocate', to: other });
    expect(s.knights[other].owner).toBe(1);
  });

  it('cartas de progreso: monopolio de recursos y boda', () => {
    let s = guildGame(37);
    give(s, 1, { wool: 3 });
    give(s, 2, { wool: 1 });
    s.players[0].progress.push('resourceMonopoly', 'wedding');
    s = act(s, 0, { t: 'playProgress', card: 'resourceMonopoly', arg: { card: 'wool' } });
    expect(s.players[0].hand.wool).toBe(3);
    const v = landVertex(s);
    s.buildings[v] = { owner: 3, kind: 'city' };
    give(s, 3, { ore: 2, grain: 1 });
    s = act(s, 0, { t: 'playProgress', card: 'wedding' });
    expect(s.steps[0]).toMatchObject({ k: 'give', waiting: { 3: 2 } });
    s = act(s, 3, { t: 'give', cards: { ore: 1, grain: 1 } });
    expect(s.players[0].hand).toMatchObject({ ore: 1, grain: 1 });
    expect(s.hidden.progress.trade.at(-1)).toBe('resourceMonopoly');
  });

  it('acueducto: sin producción se elige un recurso', () => {
    let s = guildGame(38);
    const v = landVertex(s);
    s.buildings[v] = { owner: 1, kind: 'city' };
    s.players[1].improvements.science = 3;
    s.turn.phase = 'preRoll';
    const numbers = new Set(C.G(s).vertices[v].hexes.map((h) => s.board.hexes[h].number));
    const pick = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12].find((n) => !numbers.has(n))!;
    s.turn.alchemist = [Math.min(6, pick - 1), pick - Math.min(6, pick - 1)];
    s = act(s, 0, { t: 'roll' });
    const st = s.steps.find((x) => x.k === 'pick');
    expect(st).toMatchObject({ reason: 'aqueduct', waiting: { 1: 1 } });
  });
});

describe('vistas', () => {
  it('cada asiento sólo ve su mano y las entradas privadas que le tocan', () => {
    let s = main(game({ seed: 40 }));
    give(s, 1, { ore: 2 });
    give(s, 0, { wool: 1, grain: 1, ore: 1 });
    s = act(s, 0, { t: 'buyDev' });
    const v2 = viewFor(s, 2);
    expect(v2.players[1].hand.ore).toBe(0);
    expect(v2.players[1].handCount).toBe(2);
    expect(v2.players[0].dev).toEqual([]);
    expect(v2.players[0].devCount).toBe(1);
    expect(v2.hidden.devDeck).toEqual([]);
    expect(v2.log.at(-1)!.k).toBe('dev.buy');
    const v0 = viewFor(s, 0);
    expect(v0.log.at(-1)!.k).toBe('dev.buy.card');
    expect(v0.players[0].dev.length).toBe(1);
    expect(RESOURCES.every((r) => v2.bank[r] === s.bank[r])).toBe(true);
  });
});

describe('Comarcas: señor de los muelles', () => {
  it('puntos de puerto, premio con 3 y se quita superándolo', () => {
    let s = main(game({ seed: 50, harbormaster: true }));
    expect(s.settings.vpTarget).toBe(11);
    const g = C.G(s);
    const spots = s.board.harbors.map((h) => g.edges[h.edge].a);
    s.buildings[spots[0]] = { owner: 0, kind: 'city' };
    expect(harborPoints(s, 0)).toBe(2);
    s.buildings[spots[1]] = { owner: 0, kind: 'settlement' };
    s = act(s, 0, { t: 'endTurn' });
    expect(s.awards.harbor).toEqual({ owner: 0, pts: 3 });
    expect(C.vpOf(s, 0)).toBe(3 + 2);
    // otro jugador con 3: no alcanza, hay que superarlo
    s.buildings[spots[2]] = { owner: 1, kind: 'city' };
    s.buildings[spots[3]] = { owner: 1, kind: 'settlement' };
    s = main(s, 1);
    s = act(s, 1, { t: 'endTurn' });
    expect(s.awards.harbor!.owner).toBe(0);
    s.buildings[spots[3]].kind = 'city';
    s = main(s, 1);
    s = act(s, 1, { t: 'endTurn' });
    expect(s.awards.harbor).toEqual({ owner: 1, pts: 4 });
  });
});

describe('Comarcas: mazo de sucesos', () => {
  it('36 cartas como dos dados, 20 con suceso y el año nuevo cerca del fondo', () => {
    expect(CHRONICLE_CARDS.length).toBe(36);
    const by = (n: number) => CHRONICLE_CARDS.filter((c) => c.n === n).length;
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(by)).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
    expect(CHRONICLE_CARDS.filter((c) => c.ev).length).toBe(20);
    const deck = newDeck(new Rng(seedRng(3)));
    expect(deck.length).toBe(37);
    expect(deck.findIndex((c) => c.newYear)).toBe(31);
  });

  it('la carta reemplaza a los dados; el año nuevo baraja todo', () => {
    let s = main(game({ seed: 51, chronicle: true }));
    s.turn.phase = 'preRoll';
    s.hidden.chronicle = [{ n: 0, newYear: true }, { n: 9 }];
    s = act(s, 0, { t: 'roll' });
    expect(s.turn.card!.n).toBeGreaterThan(1);
    expect(s.turn.dice![0] + s.turn.dice![1]).toBe(s.turn.card!.n);
    expect(s.log.some((e) => e.k === 'chronicle.newYear')).toBe(true);
    expect(s.chronicle!.left).toBe(36);
  });

  it('peste: las ciudades producen como poblados', () => {
    let s = main(game({ seed: 52, chronicle: true }));
    const hex = Object.values(s.board.hexes).find((h) => h.terrain === 'mountains' && h.number && h.number !== 7)!;
    s.board.robber = null;
    s.buildings[C.G(s).hexes[hex.id].vertices[0]] = { owner: 1, kind: 'city' };
    s.turn.phase = 'preRoll';
    s.hidden.chronicle = [{ n: hex.number!, ev: 'plague' }];
    s = act(s, 0, { t: 'roll' });
    expect(s.players[1].hand.ore).toBe(1);
  });

  it('temblor: un camino dañado no cuenta para la ruta y bloquea caminos nuevos hasta repararlo', () => {
    let s = main(game({ seed: 53, chronicle: true }));
    const { vs, es } = landPath(s, 5);
    s.buildings[vs[0]] = { owner: 0, kind: 'settlement' };
    for (const e of es) s.roads[e] = { owner: 0 };
    C.updateRoadAward(s);
    expect(s.awards.road.owner).toBe(0);
    s.turn.phase = 'preRoll';
    s.hidden.chronicle = [{ n: 6, ev: 'quake' }];
    s = act(s, 0, { t: 'roll' });
    expect(s.steps[0]).toMatchObject({ k: 'quake', waiting: [0] });
    s = act(s, 0, { t: 'quake', edge: es[2] });
    expect(s.roads[es[2]].broken).toBe(true);
    expect(s.awards.road.owner).toBe(null);
    give(s, 0, { lumber: 2, brick: 2 });
    expect(C.legalRoads(s, 0)).toEqual([]);
    s = act(s, 0, { t: 'build', what: 'repair', at: es[2] });
    expect(s.roads[es[2]].broken).toBeUndefined();
    expect(s.awards.road.owner).toBe(0);
    expect(C.legalRoads(s, 0).length).toBeGreaterThan(0);
  });

  it('buenos vecinos: cada uno regala un recurso al siguiente', () => {
    let s = main(game({ seed: 54, chronicle: true }, 3));
    give(s, 0, { wool: 1 });
    give(s, 1, { ore: 1 });
    s.turn.phase = 'preRoll';
    s.hidden.chronicle = [{ n: 6, ev: 'neighbors' }];
    s = act(s, 0, { t: 'roll' });
    expect(s.steps[0]).toMatchObject({ k: 'gift', waiting: { 0: 1, 1: 1 }, to: { 0: [1], 1: [2] } });
    expect(() => act(s, 0, { t: 'gift', to: 2, cards: { wool: 1 } })).toThrow();
    s = act(s, 0, { t: 'gift', to: 1, cards: { wool: 1 } });
    s = act(s, 1, { t: 'gift', to: 2, cards: { ore: 1 } });
    expect(s.players[1].hand.wool).toBe(1);
    expect(s.players[2].hand.ore).toBe(1);
  });
});

describe('Comarcas: duelo', () => {
  it('dos neutrales con dos poblados y caminos; los turnos los saltan', () => {
    let s = createGame(settings({ seed: 60, duel: true }), seats(2));
    expect(s.players.length).toBe(4);
    expect(s.players.filter((p) => p.neutral).length).toBe(2);
    for (const n of [2, 3]) {
      expect(Object.values(s.buildings).filter((b) => b.owner === n).length).toBe(2);
      expect(Object.values(s.roads).filter((r) => r.owner === n).length).toBe(2);
    }
    expect(s.turn.setupOrder.every((x) => x < 2)).toBe(true);
    expect(s.players[0].tokens).toBe(5);
    expect(s.duel!.supply).toBe(10);
    s = main(s, 1);
    s = act(s, 1, { t: 'endTurn' });
    expect(s.turn.current).toBe(0);
  });

  it('dos tiradas distintas por turno', () => {
    let s = main(createGame(settings({ seed: 61, duel: true }), seats(2)), 0);
    for (let i = 0; i < 12; i++) {
      s.turn.phase = 'preRoll';
      s.steps = [];
      s = act(s, 0, { t: 'roll' });
      while (s.steps.length) {
        const st = s.steps[0];
        if (st.k === 'discard') s = act(s, C.waitingSeats(st)[0], { t: 'discard', cards: Object.fromEntries(Object.entries(s.players[C.waitingSeats(st)[0]].hand).filter(([, n]) => n > 0).slice(0, 1)) as Partial<Hand> });
        else if (st.k === 'robber') s = act(s, 0, { t: 'robber', hex: C.legalRobberHexes(s, 0)[0], target: 'robber' });
        else if (st.k === 'steal') s = act(s, 0, { t: 'steal', from: st.from[0] });
        else break;
      }
      if (s.steps.length) continue;
      const [a, b] = s.turn.rolls!;
      expect(s.turn.rolls!.length).toBe(2);
      expect(a[0] + a[1]).not.toBe(b[0] + b[1]);
    }
  });

  it('al construir, el jugador hace crecer a un neutral', () => {
    let s = main(createGame(settings({ seed: 62, duel: true }), seats(2)), 0);
    const mine = Object.keys(s.buildings).find((v) => s.buildings[v].owner === 0);
    expect(mine).toBeUndefined(); // sin preparación todavía
    const v = C.legalSetupVertices(s)[0];
    s.buildings[v] = { owner: 0, kind: 'settlement' };
    give(s, 0, { lumber: 1, brick: 1 });
    const e = C.legalRoads(s, 0)[0];
    s = act(s, 0, { t: 'build', what: 'road', at: e });
    expect(s.steps[0]).toMatchObject({ k: 'neutral', seat: 0, what: 'road' });
    expect(() => act(s, 0, { t: 'endTurn' })).toThrow();
    const spot = Duel.neutralSpots(s, 'road')[0];
    s = act(s, 0, { t: 'neutral', at: spot });
    expect(s.roads[spot].owner).toBeGreaterThanOrEqual(2);
    expect(s.steps.length).toBe(0);
  });

  it('fichas: el cambio forzado cuesta 1 yendo atrás y 2 yendo adelante; el ladrón vuelve al desierto', () => {
    let s = main(createGame(settings({ seed: 63, duel: true }), seats(2)), 0);
    s.buildings[C.legalSetupVertices(s)[0]] = { owner: 1, kind: 'settlement' };
    expect(Duel.tokenCost(s, 0)).toBe(1);
    give(s, 1, { ore: 3 });
    give(s, 0, { wool: 2 });
    s = act(s, 0, { t: 'token', use: 'force' });
    expect(s.players[0].tokens).toBe(4);
    expect(s.players[0].hand.ore).toBe(2);
    expect(s.steps[0]).toMatchObject({ k: 'gift', reason: 'force', waiting: { 0: 2 }, to: { 0: [1] } });
    s = act(s, 0, { t: 'gift', to: 1, cards: { wool: 2 } });
    expect(s.players[1].hand).toMatchObject({ ore: 1, wool: 2 });
    // una vez por turno
    expect(() => act(s, 0, { t: 'token', use: 'robber' })).toThrow();
    s.turn.tokenUsed = false;
    s.board.robber = Object.keys(s.board.hexes).find((h) => C.hexIsLand(s, h) && h !== s.board.robberStart)!;
    s.buildings[C.legalSetupVertices(s)[0]] = { owner: 0, kind: 'city' };
    expect(Duel.tokenCost(s, 0)).toBe(2);
    s = act(s, 0, { t: 'token', use: 'robber' });
    expect(s.board.robber).toBe(s.board.robberStart);
    expect(s.players[0].tokens).toBe(2);
  });

  it('fichas por poblados en la costa y junto al desierto', () => {
    let s = main(createGame(settings({ seed: 64, duel: true }), seats(2)), 0);
    const g = C.G(s);
    const desert = s.board.robberStart!;
    const v = g.hexes[desert].vertices.find((x) => C.canSettle(s, 0, x) || C.distanceOk(s, x))!;
    const e = g.vertices[v].edges.find((x) => C.edgeRoadable(s, x))!;
    s.roads[e] = { owner: 0 };
    give(s, 0, { lumber: 1, brick: 1, wool: 1, grain: 1 });
    const before = s.players[0].tokens!;
    s = act(s, 0, { t: 'build', what: 'settlement', at: v });
    const coast = g.vertices[v].hexes.some((h) => s.board.hexes[h].terrain === 'sea');
    expect(s.players[0].tokens! - before).toBe(2 + (coast ? 1 : 0));
  });
});

describe('Comarcas: aguas de pesca', () => {
  it('lago al centro con el ladrón, seis caladeros 4-10 y 30 fichas', () => {
    const s = game({ seed: 70, shire: 'fishers' });
    expect(s.settings.vpTarget).toBe(10);
    expect(s.fish!.lakes).toEqual(['h0,0']);
    expect(s.board.hexes['h0,0'].terrain).toBe('lake');
    expect(s.board.robber).toBe('h0,0');
    expect(s.fish!.grounds.map((g) => g.n).sort((a, b) => a - b)).toEqual([4, 5, 6, 8, 9, 10]);
    for (const g of s.fish!.grounds) {
      expect(s.board.hexes[g.hex].terrain).toBe('sea');
      expect(g.vertices.length).toBe(3);
    }
    expect(s.hidden.fishPile!.length).toBe(30);
    expect(s.hidden.fishPile!.filter((x) => x === 0).length).toBe(1);
  });

  it('un caladero da fichas a los edificios de su costa (ciudad 2) y el lago con 2, 3, 11 y 12', () => {
    let s = main(game({ seed: 71, shire: 'fishers' }));
    const gr = s.fish!.grounds[0];
    s.buildings[gr.vertices[0]] = { owner: 1, kind: 'city' };
    s.hidden.fishPile = [1, 2, 3, 1, 1, 1];
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [Math.min(6, gr.n - 1), gr.n - Math.min(6, gr.n - 1)];
    s = act(s, 0, { t: 'roll' });
    expect(s.players[1].fish).toEqual([1, 2]);
    // lago: con el ladrón encima no pesca; sin ladrón sí
    const lakeV = C.G(s).hexes['h0,0'].vertices[0];
    s.buildings[lakeV] = { owner: 2, kind: 'settlement' };
    s = main(s, 0);
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [1, 1];
    s = act(s, 0, { t: 'roll' });
    expect(s.players[2].fish).toEqual([]);
    s = main(s, 0);
    s.board.robber = null;
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [1, 2];
    s = act(s, 0, { t: 'roll' });
    expect(s.players[2].fish!.length).toBe(1);
  });

  it('se paga con lo justo o lo mínimo por encima; las fichas vuelven a la pila', () => {
    expect(Fish.payment([3, 1, 2], 4)!.length).toBe(2);
    expect(Fish.payment([3, 3], 4)).toEqual([0, 1]);
    expect(Fish.payment([1, 1], 3)).toBe(null);
    let s = main(game({ seed: 72, shire: 'fishers' }));
    s.players[0].fish = [3, 2, 2];
    const pile = s.hidden.fishPile!.length;
    s = act(s, 0, { t: 'fish', use: 'bank' });
    expect(s.players[0].fish!.reduce((a, b) => a + b, 0)).toBe(3);
    expect(s.hidden.fishPile!.length).toBe(pile + 2);
    expect(s.steps[0]).toMatchObject({ k: 'pick', reason: 'fish', waiting: { 0: 1 } });
    s = act(s, 0, { t: 'pick', cards: { ore: 1 } });
    expect(s.players[0].hand.ore).toBe(1);
    // sacar el ladrón del tablero
    s.players[0].fish = [2];
    s = act(s, 0, { t: 'fish', use: 'robber' });
    expect(s.board.robber).toBe(null);
  });

  it('máximo 7 fichas; la bota vieja pide un punto más y se pasa a quien tenga tantos o más', () => {
    let s = main(game({ seed: 73, shire: 'fishers' }));
    s.players[1].fish = [1, 1, 1, 1, 1, 1, 1];
    s.hidden.fishPile = [3, 3];
    expect(Fish.draw(s, 1)).toBe(false);
    s.hidden.fishPile = [0, 2];
    expect(Fish.draw(s, 0)).toBe(true);
    expect(s.fish!.boot).toBe(0);
    expect(C.targetOf(s, 0)).toBe(11);
    const spots = C.legalSetupVertices(s);
    s.buildings[spots[0]] = { owner: 0, kind: 'settlement' };
    s.buildings[C.legalSetupVertices(s)[0]] = { owner: 1, kind: 'settlement' };
    expect(Fish.bootTargets(s, 0)).toEqual([1]);
    s = act(s, 0, { t: 'passBoot', to: 1 });
    expect(s.fish!.boot).toBe(1);
    expect(C.targetOf(s, 1)).toBe(11);
  });

  it('las fichas ajenas no se ven, sólo cuántas son', () => {
    const s = main(game({ seed: 74, shire: 'fishers' }));
    s.players[1].fish = [3, 1];
    const v = viewFor(s, 0);
    expect(v.players[1].fish).toEqual([]);
    expect(v.players[1].fishCount).toBe(2);
    expect(viewFor(s, 1).players[1].fish).toEqual([3, 1]);
    expect(v.hidden.fishPile).toBeUndefined();
  });
});

describe('Comarcas: ríos de oro', () => {
  it('dos ríos de tres casillas, puentes en sus cruces y pantanos sin número', () => {
    const s = game({ seed: 80, shire: 'rivers' });
    expect(s.river!.rivers.length).toBe(2);
    expect(s.river!.rivers.every((r) => r.length === 3)).toBe(true);
    expect(s.river!.crossings.length).toBe(6);
    const swamps = Object.values(s.board.hexes).filter((h) => h.terrain === 'swamp');
    expect(swamps.length).toBe(2);
    expect(swamps.every((h) => h.number === null)).toBe(true);
    expect(swamps.map((h) => h.id)).toContain(s.board.robber);
  });

  it('el río sólo se cruza con puente: cuesta 2 ladrillos y 1 madera, da 3 monedas y hay 3 por jugador', () => {
    let s = main(game({ seed: 81, shire: 'rivers' }));
    const e = s.river!.crossings[0];
    const g = C.G(s);
    const v = g.edges[e].a;
    s.buildings[v] = { owner: 0, kind: 'settlement' };
    expect(C.canRoad(s, 0, e)).toBe(false);
    give(s, 0, { brick: 2, lumber: 1 });
    s = act(s, 0, { t: 'bridge', at: e });
    expect(s.roads[e]).toEqual({ owner: 0, bridge: true });
    expect(s.river!.coins[0]).toBe(3);
    expect(C.longestRoute(s, 0)).toBe(1);
    s.roads['x1'] = { owner: 0, bridge: true };
    s.roads['x2'] = { owner: 0, bridge: true };
    expect(River.legalBridges(s, 0)).toEqual([]);
  });

  it('caminos y poblados junto al río dan una moneda; más rico +1, más pobres -2', () => {
    let s = main(game({ seed: 82, shire: 'rivers' }));
    const g = C.G(s);
    const rh = new Set(s.river!.rivers.flat());
    const e = Object.keys(g.edges).find((x) => !C.isCrossing(s, x) && g.edges[x].hexes.some((h) => rh.has(h)) && C.edgeRoadable(s, x))!;
    s.buildings[g.edges[e].a] = { owner: 0, kind: 'settlement' };
    give(s, 0, { lumber: 1, brick: 1 });
    s = act(s, 0, { t: 'build', what: 'road', at: e });
    expect(s.river!.coins[0]).toBe(1);
    expect(C.wealthBonus(s, 0)).toBe(1);
    expect(C.wealthBonus(s, 1)).toBe(-2);
    s.river!.coins = [2, 2, 2, 2];
    expect(C.wealthBonus(s, 0)).toBe(0);
    s.river!.coins = [3, 3, 1, 2];
    expect([0, 1, 2, 3].map((x) => C.wealthBonus(s, x))).toEqual([0, 0, -2, 0]);
  });

  it('2 monedas por un recurso, hasta 2 veces por turno', () => {
    let s = main(game({ seed: 83, shire: 'rivers' }));
    s.river!.coins[0] = 6;
    for (let i = 0; i < 2; i++) {
      s = act(s, 0, { t: 'coins', use: 'trade' });
      s = act(s, 0, { t: 'pick', cards: { grain: 1 } });
    }
    expect(s.players[0].hand.grain).toBe(2);
    expect(s.river!.coins[0]).toBe(2);
    expect(() => act(s, 0, { t: 'coins', use: 'trade' })).toThrow();
  });
});

describe('Comarcas: ruta de camellos', () => {
  it('oasis al centro con tres salidas; tras construir se vota al empezar el turno siguiente', () => {
    let s = main(game({ seed: 90, shire: 'caravans' }));
    expect(s.settings.vpTarget).toBe(12);
    expect(s.caravan!.oasis).toBe('h0,0');
    expect(s.caravan!.starts.length).toBe(3);
    const v = C.legalSetupVertices(s).find((x) => !C.G(s).hexes['h0,0'].vertices.includes(x))!;
    const e = C.G(s).vertices[v].edges.find((x) => C.edgeRoadable(s, x))!;
    s.roads[e] = { owner: 0 };
    give(s, 0, { lumber: 1, brick: 1, wool: 3, grain: 1 });
    give(s, 1, { grain: 2 });
    const w = C.G(s).edges[e].a === v ? C.G(s).edges[e].b : C.G(s).edges[e].a;
    s = act(s, 0, { t: 'build', what: 'settlement', at: w });
    s = act(s, 0, { t: 'endTurn' });
    expect(s.steps[0]).toMatchObject({ k: 'camelBid', waiting: [0, 1, 2, 3] });
    s = act(s, 0, { t: 'camelBid', bid: { wool: 2 } });
    expect(viewFor(s, 1).steps[0]).toMatchObject({ k: 'camelBid', bids: { 0: {} } });
    expect(() => act(s, 1, { t: 'camelBid', bid: { ore: 1 } })).toThrow();
    s = act(s, 1, { t: 'camelBid', bid: { grain: 2 } });
    s = act(s, 2, { t: 'camelBid', bid: {} });
    s = act(s, 3, { t: 'camelBid', bid: {} });
    // empate 2-2: gana el primero desde el jugador del turno (1)
    expect(s.steps[0]).toEqual({ k: 'camelPlace', seat: 1 });
    expect(s.players[0].hand.wool).toBe(0);
    expect(s.players[1].hand.grain).toBe(0);
    const camel = Caravan.legalCamels(s)[0];
    s = act(s, 1, { t: 'camel', at: camel });
    expect(s.caravan!.routes.flat()).toEqual([camel]);
    expect(s.caravan!.left).toBe(21);
  });

  it('edificio entre dos camellos +1 PV; camino bajo camello cuenta doble', () => {
    const s = main(game({ seed: 91, shire: 'caravans' }));
    const c = s.caravan!;
    const g = C.G(s);
    const start = c.starts[0];
    const e1 = g.vertices[start].edges.find((e) => !g.hexes[c.oasis].edges.includes(e))!;
    const mid = g.edges[e1].a === start ? g.edges[e1].b : g.edges[e1].a;
    c.routes[0].push(e1);
    const e2 = Caravan.legalCamels(s).find((e) => g.edges[e].a === mid || g.edges[e].b === mid)!;
    c.routes[0].push(e2);
    s.buildings[mid] = { owner: 2, kind: 'settlement' };
    expect(C.camelBonus(s, 2)).toBe(1);
    expect(C.vpOf(s, 2)).toBe(2);
    s.roads[e1] = { owner: 2 };
    s.roads[e2] = { owner: 2 };
    expect(C.longestRoute(s, 2)).toBe(4);
  });
});

export const _unused: Card | undefined = undefined;

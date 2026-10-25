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
import * as Tribe from '../src/engine/mods/tribe';
import * as Looms from '../src/engine/mods/looms';
import * as Bastions from '../src/engine/mods/bastions';
import * as Works from '../src/engine/mods/works';
import * as Raid from '../src/engine/mods/raid';
import * as Gold from '../src/engine/mods/gold';
import * as Traders from '../src/engine/mods/traders';
import * as X from '../src/engine/mods/expedition';
import { otherEnd } from '../src/engine/geometry';
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

describe('Comarcas: invasión en la costa', () => {
  it('castillo en la costa, un bárbaro en el 2 y otro en el 12, sin ladrón; la segunda colocación es ciudad', () => {
    let s = game({ seed: 95, shire: 'raid' }, 3);
    const r = s.raid!;
    expect(s.settings.vpTarget).toBe(12);
    expect(s.board.hexes[r.castle].terrain).toBe('castle');
    expect(r.coast.length).toBe(10);
    expect(r.coast.map((h) => s.board.hexes[h].number!).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 8, 9, 10, 11, 12]);
    const on = (n: number) => r.coast.find((h) => s.board.hexes[h].number === n)!;
    expect(r.barbs).toEqual({ [on(2)]: 1, [on(12)]: 1 });
    expect(r.supply).toBe(28);
    expect(s.board.robber).toBeNull();
    expect(s.hidden.devDeck.length).toBe(0);
    expect(s.hidden.raidDeck!.length).toBe(26);
    expect(s.gold).toEqual([0, 0, 0]);
    const order = s.turn.setupOrder;
    for (let i = 0; i < order.length; i++) {
      const v = C.legalSetupVertices(s)[0];
      s = act(s, order[i], { t: 'setupBuild', vertex: v });
      expect(s.buildings[v].kind).toBe(i < 3 ? 'settlement' : 'city');
      s = act(s, order[i], { t: 'setupRoute', edge: C.legalSetupRoutes(s, v).roads[0] });
    }
    expect(s.turn.phase).toBe('preRoll');
    expect(Object.values(s.raid!.barbs).reduce((a, b) => a + b, 0)).toBe(2); // la preparación no atrae bárbaros
    const big = game({ seed: 96, shire: 'raid' }, 5);
    expect(big.raid!.coast.length).toBe(14);
    expect(big.raid!.supply).toBe(38);
  });

  it('cada edificio nuevo trae bárbaros: tres tiradas distintas sin 7', () => {
    let s = main(game({ seed: 97, shire: 'raid' }));
    const { vs, es } = landPath(s, 2);
    s.buildings[vs[0]] = { owner: 0, kind: 'settlement' };
    for (const e of es) s.roads[e] = { owner: 0 };
    give(s, 0, { lumber: 1, brick: 1, wool: 1, grain: 3, ore: 3 });
    const before = s.raid!.supply;
    s = act(s, 0, { t: 'build', what: 'settlement', at: vs[2] });
    const landed = s.log.filter((l) => l.k === 'raid.land').pop()!;
    const rolls = String(landed.p!.rolls).split(', ').map(Number);
    expect(new Set(rolls).size).toBe(3);
    expect(rolls.includes(7)).toBe(false);
    const sum = Object.values(s.raid!.barbs).reduce((a, b) => a + b, 0);
    expect(sum).toBe(2 + Number(landed.p!.n));
    expect(s.raid!.supply).toBe(before - Number(landed.p!.n));
    s = act(s, 0, { t: 'build', what: 'city', at: vs[2] });
    expect(s.log.filter((l) => l.k === 'raid.land').length).toBe(2);
  });

  it('tres bárbaros toman la casilla: no produce, no se construye al lado y los edificios rodeados no valen', () => {
    let s = main(game({ seed: 98, shire: 'raid' }));
    const r = s.raid!;
    const g = C.G(s);
    const hex = r.coast.find((h) => !r.barbs[h] && g.hexes[h].vertices.some((v) => g.vertices[v].hexes.filter((x) => C.hexIsLand(s, x)).length === 1))!;
    const lone = g.hexes[hex].vertices.find((v) => g.vertices[v].hexes.filter((x) => C.hexIsLand(s, x)).length === 1)!;
    s.buildings[lone] = { owner: 1, kind: 'city' };
    expect(C.vpOf(s, 1)).toBe(2);
    r.barbs[hex] = 3;
    expect(Raid.conquered(s, hex)).toBe(true);
    expect(Raid.fallen(s, lone)).toBe(true);
    expect(C.vpOf(s, 1)).toBe(0);
    // no produce
    const n = s.board.hexes[hex].number!;
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [Math.min(6, n - 1), n - Math.min(6, n - 1)];
    s = act(s, 0, { t: 'roll' });
    expect(handTotal(s.players[1].hand)).toBe(0);
    // ni poblados ni caminos junto a la casilla tomada
    const free = g.hexes[hex].vertices.filter((v) => !s.buildings[v] && !g.vertices[v].neighbors.some((x) => s.buildings[x]));
    for (const v of free) expect(C.canSettle(s, 0, v)).toBe(false);
  });

  it('caballero: se pone junto al castillo, hay que sacarlo antes de terminar y se mueve 3 lados (5 pagando trigo)', () => {
    let s = main(game({ seed: 99, shire: 'raid' }));
    s.hidden.raidDeck = ['knighthood', 'knighthood'];
    give(s, 0, { wool: 2, grain: 3, ore: 2 });
    s = act(s, 0, { t: 'buyDev' });
    expect(s.steps[0]).toEqual({ k: 'raidKnight', seat: 0, anywhere: false });
    const spot = Raid.knightSpots(s, false)[0];
    expect(Raid.castleEdges(s)).toContain(spot);
    s = act(s, 0, { t: 'raidPlace', edge: spot });
    expect(s.raid!.knights[spot]).toEqual({ owner: 0, moved: false });
    expect(() => act(s, 0, { t: 'endTurn' })).toThrow('knightsAtCastle');
    const near = Raid.reach(s, spot, false);
    const far = Raid.reach(s, spot, true).filter((e) => !near.includes(e));
    expect(near.length).toBeGreaterThan(0);
    expect(far.length).toBeGreaterThan(0);
    expect(near.some((e) => Raid.castleEdges(s).includes(e))).toBe(false);
    const grain = s.players[0].hand.grain;
    s = act(s, 0, { t: 'raidMove', from: spot, to: far[0], far: true });
    expect(s.players[0].hand.grain).toBe(grain - 1);
    expect(s.raid!.knights[far[0]]).toEqual({ owner: 0, moved: true });
    expect(() => act(s, 0, { t: 'raidMove', from: far[0], to: Raid.reach(s, far[0], false)[0] })).toThrow();
    s = act(s, 0, { t: 'endTurn' });
    expect(s.raid!.knights[far[0]].moved).toBe(false);
    expect(Raid.knightsOf(s, 0)).toEqual([far[0]]);
  });

  it('batalla al final del turno: más caballeros que bárbaros; prisioneros, oro y un par de lados cae', () => {
    let s = main(game({ seed: 100, shire: 'raid' }));
    const r = s.raid!;
    const hex = r.coast.find((h) => s.board.hexes[h].number === 2)!;
    expect(r.barbs[hex]).toBe(1);
    const sides = C.G(s).hexes[hex].edges;
    r.knights[sides[0]] = { owner: 0, moved: false };
    r.knights[sides[1]] = { owner: 0, moved: false };
    r.knights[sides[2]] = { owner: 1, moved: false };
    s = act(s, 0, { t: 'endTurn' });
    expect(s.raid!.barbs[hex]).toBe(0);
    expect(s.raid!.prisoners.slice(0, 2)).toEqual([1, 0]);
    const last = s.raid!.last!;
    expect(last).toMatchObject({ hex, barbs: 1, knights: 3 });
    // el dado se lleva exactamente un caballero (lados 0, 1 o 2), que paga 3 de oro a su dueño
    expect(Object.keys(s.raid!.knights).length).toBe(2);
    expect(last.lost.length).toBe(1);
    const gold = [0, 0];
    gold[1] += 3; // el que no recibe prisionero cobra 3
    gold[last.lost[0]] += 3;
    expect(s.gold!.slice(0, 2)).toEqual(gold);
    // con más bárbaros que caballeros no hay batalla
    s = main(s, 1);
    const h12 = r.coast.find((h) => s.board.hexes[h].number === 12)!;
    s.raid!.barbs[h12] = 2;
    const sides12 = C.G(s).hexes[h12].edges;
    s.raid!.knights[sides12[3]] = { owner: 1, moved: false };
    s.raid!.knights[sides12[4]] = { owner: 1, moved: false };
    s = act(s, 1, { t: 'endTurn' });
    expect(s.raid!.barbs[h12]).toBe(2);
    expect(Raid.prisonerPoints(s, 0)).toBe(0);
    s.raid!.prisoners[0] = 5;
    expect(C.vpBreakdown(s, 0).prisoners).toBe(2);
  });

  it('intriga y traición', () => {
    let s = main(game({ seed: 101, shire: 'raid' }));
    const r = s.raid!;
    const on = (n: number) => r.coast.find((h) => s.board.hexes[h].number === n)!;
    s.hidden.raidDeck = ['intrigue', 'treason'];
    give(s, 0, { wool: 2, grain: 2, ore: 2 });
    s = act(s, 0, { t: 'buyDev' });
    expect(s.steps[0]).toEqual({ k: 'raidTake', seat: 0 });
    expect(() => act(s, 0, { t: 'raidTake', hex: on(3) })).toThrow();
    s = act(s, 0, { t: 'raidTake', hex: on(2) });
    expect(s.raid!.barbs[on(2)]).toBe(0);
    expect(s.raid!.prisoners[0]).toBe(1);
    s = act(s, 0, { t: 'buyDev' });
    expect(s.gold![0]).toBe(2);
    expect(s.steps[0]).toMatchObject({ k: 'raidShift', left: 2 });
    s = act(s, 0, { t: 'raidShift', hex: on(12) });
    s = act(s, 0, { t: 'raidShift', hex: on(6) });
    expect(s.raid!.barbs[on(12)]).toBe(0);
    expect(s.raid!.barbs[on(6)]).toBe(1);
    // el 12 ya se usó como origen: el segundo sale del 6
    expect(() => act(s, 0, { t: 'raidShift', hex: on(12) })).toThrow();
    s = act(s, 0, { t: 'raidShift', hex: on(6) });
    s = act(s, 0, { t: 'raidShift', hex: on(8) });
    expect(s.raid!.barbs[on(8)]).toBe(1);
    expect(s.steps.length).toBe(0);
  });

  it('oro: dos compran un recurso (dos veces por turno); cuatro iguales, o tres con puerto 3:1, dan uno', () => {
    let s = main(game({ seed: 102, shire: 'raid' }));
    s.gold![0] = 6;
    s = act(s, 0, { t: 'gold', use: 'buy' });
    expect(s.steps[0]).toEqual({ k: 'pick', reason: 'gold2', waiting: { 0: 1 } });
    s = act(s, 0, { t: 'pick', cards: { ore: 1 } });
    s = act(s, 0, { t: 'gold', use: 'buy' });
    s = act(s, 0, { t: 'pick', cards: { brick: 1 } });
    expect(s.gold![0]).toBe(2);
    expect(s.players[0].hand).toMatchObject({ ore: 1, brick: 1 });
    expect(Gold.canBuy(s, 0)).toBe(false);
    expect(() => act(s, 0, { t: 'gold', use: 'buy' })).toThrow();
    give(s, 0, { wool: 7 });
    s = act(s, 0, { t: 'sellGold', give: 'wool' });
    expect(s.gold![0]).toBe(3);
    expect(s.players[0].hand.wool).toBe(3);
    const any = s.board.harbors.find((h) => h.kind === 'any')!;
    s.buildings[C.G(s).edges[any.edge].a] = { owner: 0, kind: 'settlement' };
    expect(Gold.sellRatio(s, 0)).toBe(3);
    s = act(s, 0, { t: 'sellGold', give: 'wool' });
    expect(s.players[0].hand.wool).toBe(0);
    // el oro no se roba ni se descarta: no es un recurso
    expect(handTotal(s.players[0].hand)).toBe(2);
  });
});

describe('Comarcas: carretas y peajes', () => {
  it('mercados en la costa sin número, sin 2 ni 12, sin ladrón; ciudad en la segunda colocación con la carreta', () => {
    let s = game({ seed: 120, shire: 'traders' }, 3);
    const tr = s.traders!;
    expect(s.settings.vpTarget).toBe(13);
    const markets = Object.keys(tr.markets);
    expect(markets.length).toBe(3);
    expect(new Set(Object.values(tr.markets)).size).toBe(3);
    for (const h of markets) {
      expect(s.board.hexes[h].number).toBeNull();
      expect(C.G(s).hexes[h].neighbors.some((n) => !n || s.board.hexes[n]?.terrain === 'sea')).toBe(true);
      expect(tr.left[h]).toBe(12);
      expect(tr.next[h]).toBe(s.hidden.goods![h][0]);
    }
    const nums = Object.values(s.board.hexes).map((h) => h.number).filter((n): n is number => n !== null);
    expect(nums.length).toBe(16);
    expect(nums.includes(2) || nums.includes(12)).toBe(false);
    expect(Object.values(s.board.hexes).some((h) => h.terrain === 'desert')).toBe(false);
    expect(s.board.robber).toBeNull();
    expect(tr.barbs.length).toBe(3);
    expect(s.gold).toEqual([5, 5, 5]);
    expect(s.hidden.devDeck.length).toBe(24);
    expect(s.hidden.devDeck.filter((d) => d === 'haul').length).toBe(3);
    const order = s.turn.setupOrder;
    for (let i = 0; i < order.length; i++) {
      const v = C.legalSetupVertices(s).find((x) => !Traders.marketAt(s, x))!;
      s = act(s, order[i], { t: 'setupBuild', vertex: v });
      if (i >= 3) {
        expect(s.buildings[v].kind).toBe('city');
        expect(s.traders!.wagons[order[i]].at).toBe(v);
      }
      s = act(s, order[i], { t: 'setupRoute', edge: C.legalSetupRoutes(s, v).roads[0] });
    }
    expect(s.turn.phase).toBe('preRoll');
    expect(s.traders!.wagons.every((w) => w.mp === 4)).toBe(true);
    const big = game({ seed: 121, shire: 'traders' }, 6);
    expect(Object.keys(big.traders!.markets).length).toBe(6);
    expect(big.traders!.barbs.length).toBe(4);
    const bigNums = Object.values(big.board.hexes).map((h) => h.number).filter((n) => n !== null);
    expect(bigNums.length).toBe(24);
  });

  it('viaje: 2 por lado sin camino, 1 por camino, peaje en caminos ajenos y +2 con bárbaro', () => {
    const s = main(game({ seed: 122, shire: 'traders' }));
    const tr = s.traders!;
    const g = C.G(s);
    tr.barbs = [];
    const { vs, es } = landPath(s, 3);
    const w = tr.wagons[0];
    w.at = vs[0];
    w.mp = 4;
    expect(Traders.edgeCost(s, 0, es[0])).toEqual({ mp: 2, toll: null });
    s.roads[es[0]] = { owner: 0 };
    s.roads[es[1]] = { owner: 1 };
    expect(Traders.edgeCost(s, 0, es[0])).toEqual({ mp: 1, toll: null });
    expect(Traders.edgeCost(s, 0, es[1])).toEqual({ mp: 1, toll: 1 });
    tr.barbs = [es[2]];
    expect(Traders.edgeCost(s, 0, es[2]).mp).toBe(4);
    const trips = Traders.trips(s, 0);
    expect(trips.get(vs[2])).toMatchObject({ mp: 2, tolls: [1] });
    expect(trips.has(vs[3])).toBe(false); // 2 + 4 > 4
    // sin oro no hay peaje que pagar
    s.gold![0] = 0;
    expect(Traders.trips(s, 0).has(vs[2])).toBe(false);
    s.gold![0] = 3;
    const before = s.gold![1];
    const t2 = act(s, 0, { t: 'wagon', to: vs[2] });
    expect(t2.traders!.wagons[0]).toMatchObject({ at: vs[2], mp: 2 });
    expect(t2.gold![0]).toBe(2);
    expect(t2.gold![1]).toBe(before + 1);
    void g;
  });

  it('cargar en un mercado, entregar en el destino (punto y oro) y quedarse quieta hasta el turno siguiente', () => {
    let s = main(game({ seed: 123, shire: 'traders' }));
    const tr = s.traders!;
    const g = C.G(s);
    tr.barbs = [];
    const [h0] = Object.keys(tr.markets);
    // un cruce a un lado de un cruce del mercado
    const mv = g.hexes[h0].vertices.find((v) => C.vertexLand(s, v) && g.vertices[v].edges.some((e) => C.edgeRoadable(s, e) && !g.hexes[h0].vertices.includes(otherEnd(g, e, v))))!;
    const e = g.vertices[mv].edges.find((x) => C.edgeRoadable(s, x) && !g.hexes[h0].vertices.includes(otherEnd(g, x, mv)))!;
    const w = tr.wagons[0];
    w.at = otherEnd(g, e, mv);
    w.mp = 4;
    const top = tr.next[h0]!;
    s = act(s, 0, { t: 'wagon', to: mv });
    expect(s.traders!.wagons[0]).toMatchObject({ cargo: top, stopped: true });
    expect(s.traders!.left[h0]).toBe(11);
    expect(Traders.trips(s, 0).size).toBe(0);
    expect(() => act(s, 0, { t: 'wagonBoost' })).toThrow();
    // entrega: un mercado del destino
    const dest = Object.keys(tr.markets).find((h) => tr.markets[h] === Traders.DEST[top])!;
    const dv = g.hexes[dest].vertices.find((v) => C.vertexLand(s, v) && g.vertices[v].edges.some((x) => C.edgeRoadable(s, x)))!;
    const de = g.vertices[dv].edges.find((x) => C.edgeRoadable(s, x))!;
    s = main(s, 0);
    Traders.newTurn(s);
    const w2 = s.traders!.wagons[0];
    w2.at = otherEnd(g, de, dv);
    const gold = s.gold![0];
    const vp = C.vpOf(s, 0);
    s = act(s, 0, { t: 'wagon', to: dv });
    expect(s.traders!.delivered[0]).toBe(1);
    expect(s.gold![0]).toBe(gold + 1);
    expect(C.vpOf(s, 0)).toBe(vp + 1);
    expect(C.vpBreakdown(s, 0).goods).toBe(1);
    expect(s.traders!.wagons[0].cargo).not.toBeNull();
    expect(Traders.DEST[s.traders!.wagons[0].cargo!]).not.toBe(tr.markets[dest]);
  });

  it('niveles: el costo, el oro por entrega y el movimiento desde el turno siguiente; el nivel 5 vale un punto', () => {
    let s = main(game({ seed: 124, shire: 'traders' }));
    const w = s.traders!.wagons[0];
    w.at = landVertex(s);
    Traders.newTurn(s);
    expect(w.mp).toBe(4);
    give(s, 0, { lumber: 2, wool: 2, grain: 3, brick: 3, ore: 5 });
    s = act(s, 0, { t: 'wagonUp' });
    expect(s.traders!.wagons[0]).toMatchObject({ level: 2, mp: 4 });
    s = act(s, 0, { t: 'wagonUp' });
    s = act(s, 0, { t: 'wagonUp' });
    const vp = C.vpOf(s, 0);
    s = act(s, 0, { t: 'wagonUp' });
    expect(s.traders!.wagons[0].level).toBe(5);
    expect(C.vpOf(s, 0)).toBe(vp + 1);
    expect(() => act(s, 0, { t: 'wagonUp' })).toThrow();
    expect(s.players[0].hand).toMatchObject({ lumber: 0, wool: 0, grain: 0, brick: 0, ore: 0 });
    Traders.newTurn(s);
    expect(s.traders!.wagons[0].mp).toBe(7);
    // trigo: +2 una vez por turno
    give(s, 0, { grain: 2 });
    s = act(s, 0, { t: 'wagonBoost' });
    expect(s.traders!.wagons[0].mp).toBe(9);
    expect(() => act(s, 0, { t: 'wagonBoost' })).toThrow();
  });

  it('bárbaros: el 7 mueve uno y roba en un camino ajeno; ahuyentar con el dado del nivel', () => {
    let s = main(game({ seed: 125, shire: 'traders' }));
    const tr = s.traders!;
    const g = C.G(s);
    // el 7: descartes y mover un bárbaro
    s.turn.phase = 'preRoll';
    s.turn.alchemist = [3, 4];
    const road = Object.keys(g.edges).find((e) => C.edgeRoadable(s, e) && !tr.barbs.includes(e))!;
    s.roads[road] = { owner: 2 };
    give(s, 2, { ore: 1 });
    s = act(s, 0, { t: 'roll' });
    expect(s.steps[0]).toEqual({ k: 'barbMove', seat: 0, from: null, steal: true });
    const from = s.traders!.barbs[0];
    s = act(s, 0, { t: 'barbPlace', edge: from });
    s = act(s, 0, { t: 'barbPlace', edge: road });
    expect(s.traders!.barbs).toContain(road);
    expect(s.traders!.barbs).not.toContain(from);
    expect(s.players[0].hand.ore).toBe(1);
    expect(s.players[2].hand.ore).toBe(0);
    // ahuyentar: la carreta en un cruce del lado del bárbaro, nivel 5 (3 a 6)
    s = main(s, 1);
    Traders.newTurn(s);
    const w = s.traders!.wagons[1];
    w.level = 1;
    w.at = g.edges[road].a;
    expect(Traders.drivable(s, 1)).toEqual([]); // el nivel 1 no ahuyenta
    w.level = 5;
    expect(Traders.drivable(s, 1)).toEqual([road]);
    s = act(s, 1, { t: 'drive', edge: road });
    expect(s.traders!.wagons[1].tried).toEqual([road]);
    const log = s.log[s.log.length - 1];
    expect(['wagon.driveOk', 'wagon.driveFail']).toContain(log.k);
    if (log.k === 'wagon.driveOk') {
      expect(s.steps[0]).toEqual({ k: 'barbMove', seat: 1, from: road, steal: false });
      const to = Traders.barbSpots(s, s.steps[0] as Extract<GameState['steps'][number], { k: 'barbMove' }>)[0];
      s = act(s, 1, { t: 'barbPlace', edge: to });
      expect(s.traders!.barbs).toContain(to);
    }
    expect(() => act(s, 1, { t: 'drive', edge: road })).toThrow();
  });

  it('cartas: el caballero mueve un bárbaro sin mayor ejército; viaje rápido; sin ruta más larga', () => {
    let s = main(game({ seed: 126, shire: 'traders' }));
    const p = s.players[0];
    p.dev = [{ type: 'soldier', turn: 1 }, { type: 'haul', turn: 1 }];
    s = act(s, 0, { t: 'playDev', card: 'soldier' });
    expect(s.steps[0]).toMatchObject({ k: 'barbMove', steal: true });
    expect(s.players[0].soldiers).toBe(0);
    const from = s.traders!.barbs[0];
    s = act(s, 0, { t: 'barbPlace', edge: from });
    const to = Object.keys(C.G(s).edges).find((e) => C.edgeRoadable(s, e) && !s.traders!.barbs.includes(e))!;
    s = act(s, 0, { t: 'barbPlace', edge: to });
    s.turn.n++;
    s.players[0].devPlayedTurn = -1;
    const w = s.traders!.wagons[0];
    w.at = landVertex(s);
    w.mp = 0;
    w.stopped = true;
    s = act(s, 0, { t: 'playDev', card: 'haul' });
    expect(s.traders!.wagons[0]).toMatchObject({ mp: 4, stopped: false });
    // sin premio por la ruta más larga
    const { es } = landPath(s, 6);
    for (const e of es) s.roads[e] = { owner: 0 };
    C.updateRoadAward(s);
    expect(s.awards.road.owner).toBeNull();
  });
});

// ---------- Expediciones ----------

const XP = { fish: true, spice: true, lairs: true };

/** Destapa una casilla como lo haría un barco (sin dar recursos). */
function uncover(s: GameState, h: string) {
  const f = s.hidden.fog[h];
  if (!f) return;
  s.board.hexes[h] = { ...s.board.hexes[h], terrain: f.terrain, number: f.number };
  delete s.hidden.fog[h];
  X.onReveal(s, h);
}

describe('Expediciones', () => {
  it('isla de origen visible con el Consejo; islas, bancos, aldeas y guaridas bajo la niebla; meta según misiones', () => {
    const s = game({ seed: 140, expedition: XP }, 4);
    const xp = s.expedition!;
    expect(s.settings.openSea).toBe(false);
    expect(s.settings.vpTarget).toBe(13);
    expect(game({ seed: 141, expedition: { fish: false, spice: false, lairs: false } }).settings.vpTarget).toBe(10);
    expect(s.board.hexes[xp.council].terrain).toBe('castle');
    expect(s.board.hexes[xp.council].number).toBeNull();
    const marks = Object.values(s.hidden.xmarks!);
    expect(marks.filter((m) => m.k === 'shoal').length).toBe(4);
    expect(marks.filter((m) => m.k === 'village').length).toBe(3);
    expect(marks.filter((m) => m.k === 'lair').length).toBe(3);
    for (const h of Object.keys(s.hidden.xmarks!)) expect(s.board.hexes[h].terrain).toBe('fog');
    expect(Object.keys(xp.shoals).length + Object.keys(xp.villages).length + Object.keys(xp.lairs).length).toBe(0);
    // sólo se puede empezar en la isla de origen (lo demás está tapado)
    for (const v of C.legalSetupVertices(s)) expect(C.G(s).vertices[v].hexes.some((h) => s.board.hexes[h].region === 0 && C.hexIsLand(s, h))).toBe(true);
    // sin bancos ni guaridas si no se eligen
    const only = game({ seed: 142, expedition: { fish: false, spice: true, lairs: false } });
    expect(Object.values(only.hidden.xmarks!).map((m) => m.k).sort()).toEqual(['village', 'village', 'village']);
  });

  it('al terminar la preparación cada uno recibe un barco junto al Consejo; botar más cuesta madera y lana', () => {
    let s = game({ seed: 143, expedition: XP }, 3);
    const order = s.turn.setupOrder;
    for (let i = 0; i < order.length; i++) {
      const v = C.legalSetupVertices(s)[0];
      s = act(s, order[i], { t: 'setupBuild', vertex: v });
      s = act(s, order[i], { t: 'setupRoute', edge: C.legalSetupRoutes(s, v).roads[0] });
    }
    const xp = s.expedition!;
    expect(xp.ships.length).toBe(3);
    expect(new Set(xp.ships.map((sh) => sh.at)).size).toBe(3);
    expect(xp.ships.every((sh) => sh.mp === X.MOVE && X.seaEdge(s, sh.at))).toBe(true);
    s = main(s, 0);
    give(s, 0, { lumber: 1, wool: 1 });
    const before = { ...s.players[0].hand };
    const spot = X.shipSpots(s, 0)[0];
    s = act(s, 0, { t: 'xship', at: spot });
    expect(X.shipsOf(s, 0).length).toBe(2);
    expect(s.players[0].hand).toMatchObject({ lumber: before.lumber - 1, wool: before.wool - 1 });
  });

  it('navegar descubre la niebla y da el recurso; el pionero funda sin camino y da el bono de isla', () => {
    let s = main(game({ seed: 144, expedition: XP }, 3));
    const g = C.G(s);
    // un barco propio junto a la niebla: buscar un lado de mar con una casilla tapada al lado de un lado vecino
    const xp = s.expedition!;
    const start = Object.keys(g.edges).find((e) => X.seaEdge(s, e) && g.vertices[g.edges[e].a].edges.some((n) => n !== e && X.seaEdge(s, n) && g.edges[n].hexes.some((h) => s.board.hexes[h].terrain === 'fog')))!;
    xp.ships.push({ id: 99, owner: 0, at: start, cargo: ['pioneer'], mp: 4, fished: false });
    const reach = X.reach(s, 99);
    const [to, path] = [...reach].find(([, p]) => p.some((e) => g.edges[e].hexes.some((h) => s.board.hexes[h].terrain === 'fog')))!;
    const fogBefore = Object.keys(s.hidden.fog).length;
    s = act(s, 0, { t: 'sail', ship: 99, to });
    expect(Object.keys(s.hidden.fog).length).toBeLessThan(fogBefore);
    expect(X.shipById(s, 99)).toMatchObject({ at: to, mp: 4 - path.length });
    // fundar en una isla nueva: poner el barco junto a una costa descubierta de otra región
    const isl = Object.keys(s.hidden.fog).find((h) => (s.hidden.fog[h].terrain !== 'sea') && (s.board.hexes[h].region ?? 0) > 0)!;
    for (const n of g.hexes[isl].neighbors) if (n && s.hidden.fog[n]) uncover(s, n);
    uncover(s, isl);
    const coast = g.hexes[isl].edges.find((e) => X.seaEdge(s, e) && !X.shipOn(s, e) && [g.edges[e].a, g.edges[e].b].some((v) => C.vertexLand(s, v) && !s.buildings[v] && C.distanceOk(s, v)));
    expect(coast).toBeTruthy();
    X.shipById(s, 99)!.at = coast!;
    const v = X.foundSpots(s, 99)[0];
    const vp = C.vpOf(s, 0);
    s.players[0].homeRegions = [0];
    s = act(s, 0, { t: 'found', ship: 99, at: v });
    expect(s.buildings[v]).toEqual({ owner: 0, kind: 'settlement' });
    expect(X.shipById(s, 99)!.cargo).toEqual([]);
    expect(C.vpOf(s, 0)).toBe(vp + 2); // poblado + isla nueva
  });

  it('en puerto se suben pioneros y tripulaciones; cada barco lleva 2', () => {
    let s = main(game({ seed: 145, expedition: XP }, 3));
    const xp = s.expedition!;
    const e = C.G(s).hexes[xp.council].edges.find((x) => X.seaEdge(s, x))!;
    xp.ships.push({ id: 50, owner: 1, at: e, cargo: [], mp: 4, fished: false });
    s = main(s, 1);
    give(s, 1, { lumber: 2, brick: 2, wool: 3, grain: 2, ore: 1 });
    s = act(s, 1, { t: 'xload', ship: 50, what: 'pioneer' });
    s = act(s, 1, { t: 'xload', ship: 50, what: 'crew' });
    expect(X.shipById(s, 50)!.cargo).toEqual(['pioneer', 'crew']);
    expect(() => act(s, 1, { t: 'xload', ship: 50, what: 'pioneer' })).toThrow();
    // fuera de puerto no se carga
    const far = Object.keys(C.G(s).edges).find((x) => X.seaEdge(s, x) && !X.shipOn(s, x) && !C.G(s).edges[x].hexes.includes(xp.council) && ![C.G(s).edges[x].a, C.G(s).edges[x].b].some((v) => s.buildings[v]))!;
    xp.ships.push({ id: 51, owner: 1, at: far, cargo: [], mp: 4, fished: false });
    expect(X.canLoad(s, 1, 51, 'crew')).toBe(false);
  });

  it('pesca y entrega en el Consejo; aldea de especias con ventaja; guarida con tres tripulaciones', () => {
    let s = main(game({ seed: 146, expedition: XP }, 3));
    const xp = s.expedition!;
    const g = C.G(s);
    const shoal = Object.keys(s.hidden.xmarks!).find((h) => s.hidden.xmarks![h].k === 'shoal')!;
    uncover(s, shoal);
    expect(xp.shoals[shoal]).toBe(X.SHOAL_FISH);
    const se = g.hexes[shoal].edges[0];
    xp.ships.push({ id: 7, owner: 0, at: se, cargo: [], mp: 4, fished: false });
    s = act(s, 0, { t: 'xfish', ship: 7, hex: shoal });
    expect(s.expedition!.shoals[shoal]).toBe(X.SHOAL_FISH - 1);
    expect(() => act(s, 0, { t: 'xfish', ship: 7, hex: shoal })).toThrow(); // una vez por turno
    X.shipById(s, 7)!.fished = false;
    s = act(s, 0, { t: 'xfish', ship: 7, hex: shoal });
    const ce = g.hexes[s.expedition!.council].edges.find((x) => X.seaEdge(s, x) && !X.shipOn(s, x))!;
    X.shipById(s, 7)!.at = ce;
    const vp = C.vpOf(s, 0);
    s = act(s, 0, { t: 'xdeliver', ship: 7 });
    expect(s.expedition!.fish[0]).toBe(2);
    expect(C.vpOf(s, 0)).toBe(vp + 1);
    // aldea: ventaja y especia
    const vil = Object.keys(s.hidden.xmarks!).find((h) => s.hidden.xmarks![h].k === 'village')!;
    const adv = (s.hidden.xmarks![vil] as { adv: string }).adv;
    uncover(s, vil);
    for (const n of g.hexes[vil].neighbors) if (n && s.hidden.fog[n]) uncover(s, n);
    const ve = g.hexes[vil].edges.find((x) => X.seaEdge(s, x) && !X.shipOn(s, x))!;
    X.shipById(s, 7)!.at = ve;
    X.shipById(s, 7)!.cargo = ['crew'];
    s = act(s, 0, { t: 'xcrew', ship: 7, hex: vil });
    expect(s.expedition!.adv[0]).toEqual([adv]);
    expect(X.shipById(s, 7)!.cargo).toEqual(['spice']);
    expect(X.crewSpots(s, 7)).toEqual([]);
    // guarida: tres tripulaciones de dos jugadores
    const lair = Object.keys(s.hidden.xmarks!).find((h) => s.hidden.xmarks![h].k === 'lair')!;
    uncover(s, lair);
    for (const n of g.hexes[lair].neighbors) if (n && s.hidden.fog[n]) uncover(s, n);
    const le = g.hexes[lair].edges.filter((x) => X.seaEdge(s, x) && !X.shipOn(s, x));
    X.shipById(s, 7)!.at = le[0];
    X.shipById(s, 7)!.cargo = ['crew', 'crew'];
    s = act(s, 0, { t: 'xcrew', ship: 7, hex: lair });
    s = act(s, 0, { t: 'xcrew', ship: 7, hex: lair });
    expect(s.expedition!.lairs[lair]).toEqual({ crews: [0, 0], taken: false });
    s.expedition!.ships.push({ id: 8, owner: 1, at: le[1] ?? le[0], cargo: ['crew'], mp: 4, fished: false });
    if (!le[1]) X.shipById(s, 7)!.at = Object.keys(g.edges).find((x) => X.seaEdge(s, x) && !X.shipOn(s, x))!;
    s = main(s, 1);
    s = act(s, 1, { t: 'xcrew', ship: 8, hex: lair });
    expect(s.expedition!.lairs[lair].taken).toBe(true);
    expect(s.expedition!.lairVp.slice(0, 2)).toEqual([2, 2]); // dos tripulaciones; la última, uno más
  });

  it('el pirata va al mar y roba a los dueños de barcos de al lado; las ventajas cambian el banco y el barco', () => {
    let s = main(game({ seed: 147, expedition: XP }, 3));
    const xp = s.expedition!;
    const g = C.G(s);
    const sea = Object.keys(s.board.hexes).find((h) => s.board.hexes[h].terrain === 'sea' && g.hexes[h].edges.some((e) => X.seaEdge(s, e)))!;
    xp.ships.push({ id: 60, owner: 2, at: g.hexes[sea].edges[0], cargo: [], mp: 4, fished: false });
    give(s, 2, { ore: 1 });
    expect(C.legalPirateHexes(s)).toContain(sea);
    s.steps = [{ k: 'robber', seat: 0, robber: true, pirate: true, mode: 'steal1' }];
    s = act(s, 0, { t: 'robber', hex: sea, target: 'pirate' });
    if (s.steps[0]?.k === 'steal') s = act(s, 0, { t: 'steal', from: 2 });
    expect(s.players[0].hand.ore).toBe(1);
    // el pirata cierra los lados de su casilla
    expect([...X.reach(s, 60).keys()].some((e) => g.edges[e].hexes.includes(sea))).toBe(false);
    // ventajas
    s.expedition!.adv[0] = ['sails', 'holds', 'trade'];
    expect(X.moveOf(s, 0)).toBe(5);
    expect(X.holdOf(s, 0)).toBe(3);
    expect(C.ratioFor(s, 0, 'brick')).toBe(3);
  });
});

export const _unused: Card | undefined = undefined;

// ---------- Mar Abierto: escenarios especiales ----------

/** Pone un barco propio junto a `e` (que comparta un cruce) para poder construir en `e`. */
function shipNext(s: GameState, seat: number, e: string) {
  const g = C.G(s);
  for (const v of [g.edges[e].a, g.edges[e].b]) {
    const e2 = g.vertices[v].edges.find((x) => x !== e && C.edgeShippable(s, x) && !s.ships[x]);
    if (e2) {
      s.ships[e2] = { owner: seat };
      return;
    }
  }
  throw new Error('sin lugar para el barco');
}

describe('Mar Abierto: pueblo isleño', () => {
  it('islitas sin números ni edificios; 18 regalos (8 puntos, 4 cartas, 6 puertos) y sin puertos al empezar', () => {
    const s = game({ seed: 300, openSea: true, scenario: 'tribe' });
    expect(s.settings.vpTarget).toBe(13);
    expect(s.tribe!.hexes.length).toBe(10);
    expect(s.tribe!.hexes.every((h) => s.board.hexes[h].number === null)).toBe(true);
    const kinds = s.tribe!.gifts.map((x) => x.kind);
    expect(kinds.filter((k) => k === 'vp').length).toBe(8);
    expect(kinds.filter((k) => k === 'dev').length).toBe(4);
    expect(s.tribe!.gifts.filter((x) => x.kind === 'harbor').map((x) => x.harbor).sort()).toEqual(['any', 'brick', 'grain', 'lumber', 'ore', 'wool']);
    expect(s.hidden.tribeDev!.length).toBe(4);
    expect(s.board.harbors).toEqual([]);
    // en las islitas no se funda, ni siquiera llegando en barco
    const g = C.G(s);
    const v = g.hexes[s.tribe!.hexes[0]].vertices[0];
    const e = g.vertices[v].edges.find((x) => C.edgeShippable(s, x))!;
    s.ships[e] = { owner: 0 };
    expect(C.canSettle(s, 0, v)).toBe(false);
    // el ladrón no entra en las islitas ni vuelve al desierto
    const hexes = C.legalRobberHexes(s, 0);
    expect(hexes.some((h) => s.tribe!.hexes.includes(h) || s.board.hexes[h].terrain === 'desert')).toBe(false);
  });

  it('un barco en el lado del regalo se lo lleva: punto, carta de desarrollo o puerto', () => {
    let s = main(game({ seed: 301, openSea: true, scenario: 'tribe' }));
    const vp = s.tribe!.gifts.find((x) => x.kind === 'vp')!;
    shipNext(s, 0, vp.edge);
    give(s, 0, { lumber: 1, wool: 1 });
    const before = C.vpOf(s, 0);
    s = act(s, 0, { t: 'build', what: 'ship', at: vp.edge });
    expect(C.vpOf(s, 0)).toBe(before + 1);
    expect(s.tribe!.gifts.some((x) => x.edge === vp.edge)).toBe(false);
    expect(C.vpBreakdown(s, 0).gifts).toBe(1);
    const dev = s.tribe!.gifts.find((x) => x.kind === 'dev')!;
    shipNext(s, 0, dev.edge);
    give(s, 0, { lumber: 1, wool: 1 });
    s = act(s, 0, { t: 'build', what: 'ship', at: dev.edge });
    expect(s.players[0].dev.length).toBe(1);
    expect(s.players[0].dev[0].turn).toBe(s.turn.n);
    expect(s.hidden.tribeDev!.length).toBe(3);
  });

  it('el puerto regalado se pone junto a un poblado de la costa; sin poblado en la costa, queda guardado', () => {
    let s = main(game({ seed: 302, openSea: true, scenario: 'tribe' }));
    const gift = s.tribe!.gifts.find((x) => x.kind === 'harbor' && x.harbor !== 'any')!;
    shipNext(s, 0, gift.edge);
    give(s, 0, { lumber: 1, wool: 1 });
    s = act(s, 0, { t: 'build', what: 'ship', at: gift.edge });
    expect(s.tribe!.held[0]).toEqual([gift.harbor]);
    expect(s.steps).toEqual([]);
    // un poblado en la costa de la isla grande: aparece el paso para ponerlo
    const g = C.G(s);
    const coastV = Object.keys(g.vertices).find((v) => C.vertexLand(s, v) && C.distanceOk(s, v)
      && g.vertices[v].hexes.some((h) => s.board.hexes[h].region === 0)
      && g.vertices[v].edges.some((e) => g.edges[e].hexes.length === 2 && g.edges[e].hexes.some((h) => C.hexIsSea(s, h))))!;
    const road = g.vertices[coastV].edges.find((e) => C.edgeRoadable(s, e))!;
    s.roads[road] = { owner: 0 };
    give(s, 0, { lumber: 1, brick: 1, wool: 1, grain: 1 });
    s = act(s, 0, { t: 'build', what: 'settlement', at: coastV });
    expect(s.steps[0]).toMatchObject({ k: 'placeHarbor', seat: 0, kind: gift.harbor });
    const spot = Tribe.harborSpots(s, 0)[0];
    s = act(s, 0, { t: 'placeHarbor', edge: spot });
    expect(s.board.harbors.length).toBe(1);
    expect(C.ratioFor(s, 0, gift.harbor as Card)).toBe(2);
    expect(s.tribe!.held[0]).toEqual([]);
  });
});

describe('Mar Abierto: aldeas tejedoras', () => {
  it('ocho aldeas con número y cinco telas; tercera ronda de preparación que da los recursos', () => {
    let s = game({ seed: 310, openSea: true, scenario: 'looms' });
    expect(s.settings.vpTarget).toBe(14);
    expect(s.looms!.villages.length).toBe(8);
    expect(new Set(s.looms!.villages.map((x) => x.n)).size).toBe(8);
    expect(s.looms!.villages.every((x) => x.cloth === 5 && x.n !== 7)).toBe(true);
    expect(s.looms!.hexes.every((h) => s.board.hexes[h].number === null)).toBe(true);
    expect(s.turn.setupOrder.length).toBe(12);
    // con bots hasta terminar la preparación: sólo la tercera ronda da recursos
    let guard = 0;
    while (s.turn.phase === 'setup' && guard++ < 100) {
      const seat = C.actorOf(s);
      if (s.turn.setupAwait === 'building') {
        const before = handTotal(s.players[seat].hand);
        const round = Math.floor(s.turn.setupIndex / 4);
        const v = C.legalSetupVertices(s).sort((a, b) => C.G(s).vertices[b].hexes.filter((h) => s.board.hexes[h].number).length - C.G(s).vertices[a].hexes.filter((h) => s.board.hexes[h].number).length)[0];
        s = act(s, seat, { t: 'setupBuild', vertex: v });
        const got = handTotal(s.players[seat].hand) - before;
        if (round < 2) expect(got).toBe(0);
        else expect(got).toBeGreaterThan(0);
      } else {
        const r = C.legalSetupRoutes(s, s.turn.setupVertex!);
        s = act(s, seat, r.roads.length ? { t: 'setupRoute', edge: r.roads[0] } : { t: 'setupRoute', edge: r.ships[0], ship: true });
      }
    }
    expect(Object.values(s.buildings).filter((b) => b.owner === 0).length).toBe(3);
  });

  it('llegar en barco a una aldea da una tela; su número da una a cada uno; dos telas valen un punto', () => {
    let s = main(game({ seed: 311, openSea: true, scenario: 'looms' }));
    const vil = s.looms!.villages[0];
    const g = C.G(s);
    const e = g.vertices[vil.v].edges.find((x) => C.edgeShippable(s, x))!;
    shipNext(s, 0, e);
    give(s, 0, { lumber: 1, wool: 1 });
    s = act(s, 0, { t: 'build', what: 'ship', at: e });
    expect(s.looms!.villages[0].linked).toEqual([0]);
    expect(s.looms!.cloth[0]).toBe(1);
    expect(s.looms!.villages[0].cloth).toBe(4);
    // la ruta que llega a una aldea no se mueve
    expect(C.movableShips(s, 0)).not.toContain(e);
    s.looms!.villages[0].linked.push(1);
    Looms.produce(s, vil.n);
    expect(s.looms!.cloth[0]).toBe(2);
    expect(s.looms!.cloth[1]).toBe(1);
    expect(C.clothPoints(s, 0)).toBe(1);
    // aldea con una sola tela y dos unidos: la segunda sale de la reserva
    s.looms!.villages[0].cloth = 1;
    const supply = s.looms!.supply;
    Looms.produce(s, vil.n);
    expect(s.looms!.villages[0].cloth).toBe(0);
    expect(s.looms!.supply).toBe(supply - 1);
    // vacía: ya no da nada
    const before = [...s.looms!.cloth];
    Looms.produce(s, vil.n);
    expect(s.looms!.cloth).toEqual(before);
  });

  it('sin premio por la ruta más larga; el pirata sólo lo mueve quien llegó a una aldea y puede robar una tela', () => {
    let s = main(game({ seed: 312, openSea: true, scenario: 'looms' }));
    const { es } = landPath(s, 6);
    for (const e of es) s.roads[e] = { owner: 0 };
    C.updateRoadAward(s);
    expect(s.awards.road.owner).toBeNull();
    // un siete: sin aldea propia, sólo el ladrón
    s.steps = [];
    s.turn.dice = [3, 4];
    s.steps.push({ k: 'robber', seat: 0, robber: true, pirate: Looms.linked(s, 0), mode: 'steal1' });
    expect(s.steps[0]).toMatchObject({ pirate: false });
    s.looms!.villages[0].linked = [0];
    expect(Looms.linked(s, 0)).toBe(true);
    // robar tela con el pirata
    const g = C.G(s);
    const seaHex = Object.keys(s.board.hexes).find((h) => C.hexIsSea(s, h) && g.hexes[h].edges.some((e) => C.edgeShippable(s, e)))!;
    const e1 = g.hexes[seaHex].edges.find((e) => C.edgeShippable(s, e))!;
    s.ships[e1] = { owner: 1 };
    s.looms!.cloth[1] = 3;
    s.steps = [{ k: 'robber', seat: 0, robber: true, pirate: true, mode: 'steal1' }];
    s = act(s, 0, { t: 'robber', hex: seaHex, target: 'pirate' });
    expect(s.steps[0]).toMatchObject({ k: 'steal', on: 'pirate' });
    s = act(s, 0, { t: 'steal', from: 1, cloth: true });
    expect(s.looms!.cloth).toEqual([1, 2, 0, 0]);
  });

  it('termina cuando quedan tres aldeas o menos con telas: gana quien tiene más puntos (y si empatan, más telas)', () => {
    let s = main(game({ seed: 313, openSea: true, scenario: 'looms' }));
    for (const v of s.looms!.villages.slice(0, 4)) v.cloth = 0;
    const g = C.G(s);
    s.buildings[landVertex(s, (v) => g.vertices[v].hexes.some((h) => s.board.hexes[h].region === 0))] = { owner: 2, kind: 'city' };
    s.looms!.cloth = [0, 0, 1, 4];
    const vil = s.looms!.villages[4];
    vil.linked = [1];
    vil.cloth = 1;
    s = act(s, 0, { t: 'endTurn' }); // cualquier acción revisa el final
    expect(s.winner).toBeNull();
    s.looms!.villages[5].cloth = 0;
    s.turn.phase = 'main';
    s = act(s, s.turn.current, { t: 'endTurn' });
    // jugador 2 (ciudad, 2 PV) y jugador 3 (4 telas, 2 PV) empatan en puntos: gana el de más telas
    expect(s.winner).toBe(3);
  });
});

describe('Mar Abierto: bastiones corsarios', () => {
  /** Construye la ruta de `seat` hasta el bastión con barcos puestos directamente. */
  function fullRoute(s: GameState, seat: number) {
    const f = s.bastions!.forts.find((x) => x.seat === seat)!;
    for (let i = 0; i < 40 && C.bastionRoute(s, seat).head !== f.v; i++) {
      const e = C.legalShips(s, seat)[0];
      if (!e) throw new Error('ruta trabada');
      s.ships[e] = { owner: seat };
    }
  }

  it('cada uno empieza con poblado y barco hacia su desembarco; sin ladrón; las cartas de punto son soldados', () => {
    const s = game({ seed: 320, openSea: true, scenario: 'bastions' });
    expect(s.settings.vpTarget).toBe(10);
    expect(s.board.robber).toBeNull();
    expect(s.bastions!.forts.length).toBe(4);
    for (const f of s.bastions!.forts) {
      expect(s.buildings[f.start]).toEqual({ owner: f.seat, kind: 'settlement' });
      expect(f.chips).toBe(3);
      expect(C.bastionRoute(s, f.seat).edges.length).toBe(1);
    }
    expect(s.hidden.devDeck.filter((d) => d === 'point').length).toBe(0);
    expect(s.hidden.devDeck.filter((d) => d === 'soldier').length).toBe(19);
    // en la preparación no hay barcos
    expect(C.setupRouteOk(s, s.bastions!.forts[0].start, C.bastionRoute(s, 0).edges[0], true)).toBe(false);
  });

  it('cada ruta tiene su carril: del puerto al desembarco y al bastión, sin tocar los de otros ni llevar caminos', () => {
    for (const n of [3, 4, 5, 6]) {
      const s = game({ seed: 330 + n, openSea: true, scenario: 'bastions' }, n);
      const g = C.G(s);
      const seen = new Map<string, number>();
      const lens: number[] = [];
      for (const f of s.bastions!.forts) {
        const vs = new Set(f.plan.flatMap((e) => [g.edges[e].a, g.edges[e].b]));
        expect(vs.has(f.start) && vs.has(f.landing) && vs.has(f.v)).toBe(true);
        expect(s.ships[f.plan[0]]).toEqual({ owner: f.seat });
        for (const v of vs) {
          expect(seen.get(v) ?? f.seat).toBe(f.seat);
          seen.set(v, f.seat);
        }
        for (const e of f.plan) expect(C.canRoad(s, f.seat, e)).toBe(false);
        lens.push(f.plan.length);
      }
      // rutas parejas
      expect(Math.max(...lens) - Math.min(...lens)).toBeLessThanOrEqual(2);
    }
  });

  it('una sola ruta: sólo se alarga por la punta, acercándose al desembarco y luego al bastión; no se mueven', () => {
    let s = main(game({ seed: 321, openSea: true, scenario: 'bastions' }));
    const f = s.bastions!.forts.find((x) => x.seat === 0)!;
    const r = C.bastionRoute(s, 0);
    const legal = C.legalShips(s, 0);
    expect(legal.length).toBeGreaterThan(0);
    const g = C.G(s);
    const d0 = C.shipDistances(s, f.landing, 0).get(r.head)!;
    for (const e of legal) expect(C.shipDistances(s, f.landing, 0).get(otherEnd(g, e, r.head))).toBe(d0 - 1);
    // un barco que sale del poblado por otro lado sería una rama
    const branch = g.vertices[f.start].edges.find((e) => C.edgeShippable(s, e) && !s.ships[e]);
    if (branch) expect(C.canShip(s, 0, branch)).toBe(false);
    give(s, 0, { lumber: 1, wool: 1 });
    s = act(s, 0, { t: 'build', what: 'ship', at: legal[0] });
    expect(C.bastionRoute(s, 0).edges.length).toBe(2);
    expect(C.movableShips(s, 0)).toEqual([]);
    fullRoute(s, 0);
    expect(C.bastionRoute(s, 0).landed).toBe(true);
    expect(C.legalShips(s, 0)).toEqual([]);
    // en el desembarco se puede fundar; en otra parte de las islas corsarias, no
    expect(C.canSettle(s, 0, f.landing) || !C.distanceOk(s, f.landing)).toBe(true);
    const other = s.bastions!.forts.find((x) => x.seat === 1)!;
    expect(C.canSettle(s, 0, other.landing)).toBe(false);
  });

  it('el soldado arma el barco más cercano al puerto; la flota ataca según el dado menor', () => {
    let s = main(game({ seed: 322, openSea: true, scenario: 'bastions' }));
    s.players[0].dev.push({ type: 'soldier', turn: 1 });
    s = act(s, 0, { t: 'playDev', card: 'soldier' });
    expect(s.steps).toEqual([]);
    expect(Bastions.warships(s, 0)).toBe(1);
    expect(s.ships[C.bastionRoute(s, 0).edges[0]].war).toBe(true);
    expect(s.awards.army.owner).toBeNull();
    // sin barcos para armar, el soldado no se puede jugar
    s.players[0].dev.push({ type: 'soldier', turn: 1 });
    s.players[0].devPlayedTurn = -1;
    expect(() => act(s, 0, { t: 'playDev', card: 'soldier' })).toThrow();
    // la flota: se detiene junto a una ciudad del jugador 1 con fuerza 2 y él no tiene barcos de guerra
    const g = C.G(s);
    const b = s.bastions!;
    const i = b.loop.findIndex((h) => g.hexes[h].vertices.some((v) => C.vertexLand(s, v) && C.distanceOk(s, v)));
    const v = g.hexes[b.loop[i]].vertices.find((x) => C.vertexLand(s, x) && C.distanceOk(s, x))!;
    s.buildings[v] = { owner: 1, kind: 'city' };
    give(s, 1, { ore: 3 });
    b.fleet = (i - 2 + b.loop.length) % b.loop.length;
    s.turn.dice = [2, 5];
    Bastions.sail(s, new Rng(seedRng(5)));
    expect(b.fleet).toBe(i);
    expect(s.players[1].hand.ore).toBe(1); // pierde 1 + 1 por la ciudad
    expect(b.last).toMatchObject({ strength: 2, lost: [1] });
    // con tres barcos de guerra le gana a la flota y elige un recurso
    for (const e of Object.keys(s.ships).filter((x) => s.ships[x].owner === 1)) s.ships[e] = { owner: 1, war: true };
    s.ships['x1'] = { owner: 1, war: true };
    s.ships['x2'] = { owner: 1, war: true };
    b.fleet = (i - 2 + b.loop.length) % b.loop.length;
    Bastions.sail(s, new Rng(seedRng(5)));
    expect(s.steps[0]).toMatchObject({ k: 'pick', reason: 'fleet', waiting: { 1: 1 } });
  });

  it('con un siete no hay ladrón: quien tira le roba a cualquiera', () => {
    const s = main(game({ seed: 323, openSea: true, scenario: 'bastions' }));
    give(s, 2, { grain: 2 });
    s.turn.phase = 'preRoll';
    let r: GameState = s;
    for (let k = 0; k < 60; k++) {
      r = act(s, 0, { t: 'roll' });
      if (r.turn.dice![0] + r.turn.dice![1] === 7) break;
      s.hidden.rng = r.hidden.rng;
    }
    expect(r.turn.dice![0] + r.turn.dice![1]).toBe(7);
    expect(r.steps.find((x) => x.k === 'steal')).toMatchObject({ k: 'steal', on: 'event', from: [2] });
    expect(r.steps.some((x) => x.k === 'robber')).toBe(false);
  });

  it('el ataque al bastión cierra el turno: si gana, una muesca menos; si pierde, dos barcos; con tres, es suyo y gana con la meta', () => {
    let s = main(game({ seed: 324, openSea: true, scenario: 'bastions', vpTarget: 2 }));
    fullRoute(s, 0);
    const f = s.bastions!.forts.find((x) => x.seat === 0)!;
    const len = C.bastionRoute(s, 0).edges.length;
    // sin barcos de guerra pierde siempre: se van los dos barcos más cercanos al bastión
    s = act(s, 0, { t: 'assault' });
    expect(C.bastionRoute(s, 0).edges.length).toBe(len - 2);
    expect(s.turn.current).not.toBe(0);
    // con siete barcos de guerra gana siempre
    s = main(s);
    fullRoute(s, 0);
    for (const e of C.bastionRoute(s, 0).edges) s.ships[e] = { owner: 0, war: true };
    while (Bastions.warships(s, 0) < 7) s.ships[`w${Bastions.warships(s, 0)}`] = { owner: 0, war: true };
    s = act(s, 0, { t: 'assault' });
    expect(s.bastions!.forts.find((x) => x.seat === 0)!.chips).toBe(2);
    s = main(s);
    s.bastions!.forts.find((x) => x.seat === 0)!.chips = 1;
    expect(s.winner).toBeNull();
    s = act(s, 0, { t: 'assault' });
    expect(s.buildings[f.v]).toEqual({ owner: 0, kind: 'settlement' });
    expect(s.winner).toBe(0);
  });

  it('con la meta de puntos pero sin el bastión no se gana', () => {
    let s = main(game({ seed: 325, openSea: true, scenario: 'bastions', vpTarget: 1 }));
    s = act(s, 0, { t: 'endTurn' });
    expect(s.winner).toBeNull();
  });
});

describe('Mar Abierto: grandes obras', () => {
  it('el estrecho y el páramo no se ocupan en la preparación; las islitas dan un punto', () => {
    const s = game({ seed: 330, openSea: true, scenario: 'works' });
    expect(s.settings.vpTarget).toBe(10);
    expect(s.works!.wonders.length).toBe(5);
    expect(s.works!.strait.length).toBeGreaterThan(1);
    expect(s.works!.waste.length).toBeGreaterThan(1);
    const legal = C.legalSetupVertices(s);
    expect(legal.some((v) => s.works!.strait.includes(v) || s.works!.waste.includes(v))).toBe(false);
    expect(s.board.regionBonus).toBe(1);
    expect(Object.values(s.board.hexes).filter((h) => h.terrain === 'desert').length).toBe(3);
  });

  it('una obra por jugador: se empieza cumpliendo el requisito y cada nivel cuesta lo mismo', () => {
    let s = main(game({ seed: 331, openSea: true, scenario: 'works' }));
    const g = C.G(s);
    const spots = Object.keys(g.vertices).filter((v) => C.vertexLand(s, v)).filter((v, i, all) => all.slice(0, i).every((w) => w !== v && !g.vertices[w].neighbors.includes(v)));
    s.buildings[spots[0]] = { owner: 0, kind: 'city' };
    give(s, 0, { ore: 4, grain: 4, brick: 2 });
    expect(Works.canBuild(s, 0, 'observatory')).toBe(false); // hacen falta dos ciudades
    s.buildings[spots[1]] = { owner: 0, kind: 'city' };
    expect(Works.canBuild(s, 0, 'observatory')).toBe(true);
    s = act(s, 0, { t: 'wonder', id: 'observatory' });
    expect(s.works!.wonders.find((w) => w.id === 'observatory')).toEqual({ id: 'observatory', owner: 0, level: 1 });
    expect(s.players[0].hand).toMatchObject({ ore: 2, grain: 2, brick: 1 });
    s = act(s, 0, { t: 'wonder', id: 'observatory' });
    expect(Works.levelOf(s, 0)).toBe(2);
    // ya tiene una: no puede empezar otra; otro jugador no puede tomar la suya
    give(s, 0, { lumber: 2, wool: 2, grain: 1 });
    expect(Works.canBuild(s, 0, 'library')).toBe(false);
    s.buildings[spots[2]] = { owner: 1, kind: 'city' };
    s.buildings[spots[3]] = { owner: 1, kind: 'city' };
    s = main(s, 1);
    give(s, 1, { ore: 2, grain: 2, brick: 1 });
    expect(Works.canBuild(s, 1, 'observatory')).toBe(false);
  });

  it('gana con el cuarto nivel, o con la meta y un nivel más alto que todos', () => {
    let s = main(game({ seed: 332, openSea: true, scenario: 'works' }));
    const w = s.works!.wonders.find((x) => x.id === 'library')!;
    w.owner = 0;
    w.level = 3;
    give(s, 0, { lumber: 2, wool: 2, grain: 1 });
    s = act(s, 0, { t: 'wonder', id: 'library' });
    expect(s.winner).toBe(0);
    // meta de puntos: hace falta estar más alto que todos
    s = main(game({ seed: 333, openSea: true, scenario: 'works', vpTarget: 2 }));
    const g = C.G(s);
    const vs = Object.keys(g.vertices).filter((v) => C.vertexLand(s, v)).filter((v, i, all) => all.slice(0, i).every((x) => !g.vertices[x].neighbors.includes(v)));
    s.buildings[vs[0]] = { owner: 0, kind: 'city' };
    s.works!.wonders[0].owner = 1;
    s.works!.wonders[0].level = 1;
    s.works!.wonders[1].owner = 0;
    s.works!.wonders[1].level = 1;
    expect(Works.wins(s, 0)).toBe(false); // empatados en nivel
    give(s, 0, { lumber: 2, wool: 2, grain: 1 });
    s = act(s, 0, { t: 'wonder', id: s.works!.wonders[1].id });
    expect(s.winner).toBe(0);
  });
});

// Qué se puede tocar en el tablero ahora y qué acción produce cada toque.
import * as C from '../../engine/core';
import * as Guild from '../../engine/guilds';
import type { Action, GameState, ProgressType } from '../../engine/types';
import type { Targets } from '../Board';

export type Mode =
  | null
  | { k: 'build'; what: 'road' | 'ship' | 'settlement' | 'city' | 'wall' }
  | { k: 'recruit' }
  | { k: 'activate' }
  | { k: 'promote' }
  | { k: 'knight'; from?: string }
  | { k: 'ship'; from?: string }
  | { k: 'progress'; card: ProgressType; picked: string[] };

export interface Plan {
  targets: Targets | null;
  hint: string | null;
  hintParams?: Record<string, string | number>;
  pick?: (kind: 'vertex' | 'edge' | 'hex', id: string) => { act?: Action; mode?: Mode };
  toggle?: boolean; // elegir entre camino y barco
  skip?: Action;
  confirm?: Action | null; // confirmar selección múltiple
  chase?: { robber: boolean; pirate: boolean; from: string };
  cancel?: boolean;
}

const myKnights = (v: GameState, me: number) => Object.keys(v.knights).filter((k) => v.knights[k].owner === me);
const myCities = (v: GameState, me: number) => Object.keys(v.buildings).filter((k) => { const b = v.buildings[k]; return b.owner === me && b.kind === 'city' && !b.damaged; });

export function stepForMe(v: GameState, me: number | null) {
  const st = v.steps[0];
  if (!st || me === null || st.k === 'produce') return null;
  return C.waitingSeats(st).includes(me) ? st : null;
}

export function plan(v: GameState, me: number | null, mode: Mode, routeKind: 'road' | 'ship'): Plan {
  if (me === null || v.winner !== null) return { targets: null, hint: null };
  const st = stepForMe(v, me);
  if (st) {
    switch (st.k) {
      case 'robber': {
        const hexes = [...(st.robber ? C.legalRobberHexes(v, me) : []), ...(st.pirate ? C.legalPirateHexes(v) : [])];
        const hint = st.mode === 'stealAll' ? 'step.bishop' : st.robber && st.pirate ? 'step.robberOrPirate' : st.pirate ? 'step.pirate' : 'step.robber';
        return { targets: { hexes }, hint, pick: (_k, id) => ({ act: { t: 'robber', hex: id, target: C.hexIsSea(v, id) ? 'pirate' : 'robber' } }) };
      }
      case 'freeRoutes': {
        const left = C.piecesLeft(v, me);
        const roads = left.road > 0 ? C.legalRoads(v, me) : [];
        const ships = st.source !== 'diplomat' && left.ship > 0 ? C.legalShips(v, me) : [];
        const both = roads.length > 0 && ships.length > 0;
        const kind = both ? routeKind : ships.length && !roads.length ? 'ship' : 'road';
        return {
          targets: { edges: kind === 'ship' ? ships : roads },
          hint: st.source === 'diplomat' ? 'step.freeDiplomat' : 'step.freeRoutes',
          hintParams: { n: st.left },
          toggle: both,
          skip: { t: 'skipFree' },
          pick: (_k, e) => ({ act: { t: 'freeRoute', edge: e, ship: kind === 'ship' } }),
        };
      }
      case 'pillage':
        return { targets: { vertices: C.pillageable(v, me) }, hint: 'step.pillage', pick: (_k, id) => ({ act: { t: 'pillage', vertex: id } }) };
      case 'metropolis':
        return { targets: { vertices: C.defaultCity(v, me) }, hint: 'step.metropolis', hintParams: { track: `track.${st.track}` }, pick: (_k, id) => ({ act: { t: 'metropolis', vertex: id } }) };
      case 'relocate': {
        const opts = C.knightReach(v, st.from, me).empty.filter((x) => x !== st.from);
        return { targets: { vertices: opts }, hint: 'step.relocate', pick: (_k, id) => ({ act: { t: 'relocate', to: id } }), skip: opts.length ? undefined : { t: 'relocate', to: null } };
      }
      case 'deserterChoose':
        return { targets: { vertices: myKnights(v, me) }, hint: 'step.deserterChoose', pick: (_k, id) => ({ act: { t: 'deserterChoose', vertex: id } }) };
      case 'deserterPlace':
        return { targets: { vertices: C.recruitSpots(v, me) }, hint: 'step.deserterPlace', hintParams: { n: st.level }, pick: (_k, id) => ({ act: { t: 'deserterPlace', vertex: id } }), skip: { t: 'deserterPlace', vertex: null } };
      default:
        return { targets: null, hint: null };
    }
  }
  if (v.steps.length) return { targets: null, hint: null };
  const t = v.turn;
  if (t.phase === 'setup') {
    if (C.actorOf(v) !== me) return { targets: null, hint: null };
    if (t.setupAwait === 'building') {
      const round2 = t.setupIndex >= v.players.length;
      return {
        targets: { vertices: C.legalSetupVertices(v) },
        hint: v.settings.guilds && round2 ? 'phase.setupCity' : 'phase.setupBuilding',
        pick: (_k, id) => ({ act: { t: 'setupBuild', vertex: id } }),
      };
    }
    const r = C.legalSetupRoutes(v, t.setupVertex!);
    const both = r.roads.length > 0 && r.ships.length > 0;
    const kind = both ? routeKind : r.ships.length && !r.roads.length ? 'ship' : 'road';
    return {
      targets: { edges: kind === 'ship' ? r.ships : r.roads, selected: [t.setupVertex!] },
      hint: v.settings.seafarers ? 'phase.setupRouteShip' : 'phase.setupRoute',
      toggle: both,
      pick: (_k, e) => ({ act: { t: 'setupRoute', edge: e, ship: kind === 'ship' } }),
    };
  }
  if (!mode || C.actorOf(v) !== me) return { targets: null, hint: null };
  const done = { mode: null as Mode };
  switch (mode.k) {
    case 'build': {
      const lists = {
        road: () => C.legalRoads(v, me),
        ship: () => C.legalShips(v, me),
        settlement: () => C.legalSettlements(v, me),
        city: () => C.legalCities(v, me),
        wall: () => myCities(v, me).filter((x) => !v.buildings[x].wall),
      };
      const ids = lists[mode.what]();
      const isEdge = mode.what === 'road' || mode.what === 'ship';
      return {
        targets: isEdge ? { edges: ids } : { vertices: ids },
        hint: ids.length ? `pick.${mode.what}` : 'pick.none',
        cancel: true,
        pick: (_k, id) => ({ act: { t: 'build', what: mode.what, at: id }, ...done }),
      };
    }
    case 'recruit': {
      const ids = C.recruitSpots(v, me);
      return { targets: { vertices: ids }, hint: ids.length ? 'pick.recruit' : 'pick.none', cancel: true, pick: (_k, id) => ({ act: { t: 'recruit', at: id }, ...done }) };
    }
    case 'activate': {
      const ids = myKnights(v, me).filter((x) => !v.knights[x].active);
      return { targets: { vertices: ids }, hint: ids.length ? 'pick.activate' : 'pick.none', cancel: true, pick: (_k, id) => ({ act: { t: 'activate', at: id }, ...done }) };
    }
    case 'promote': {
      const ids = myKnights(v, me).filter((x) => Guild.canPromote(v, me, x));
      return { targets: { vertices: ids }, hint: ids.length ? 'pick.promote' : 'pick.none', cancel: true, pick: (_k, id) => ({ act: { t: 'promote', at: id }, ...done }) };
    }
    case 'knight': {
      if (!mode.from) {
        const ids = myKnights(v, me).filter((x) => C.canKnightAct(v, x, me));
        return { targets: { vertices: ids }, hint: ids.length ? 'pick.knight' : 'pick.none', cancel: true, pick: (_k, id) => ({ mode: { k: 'knight', from: id } }) };
      }
      const from = mode.from;
      const k = v.knights[from];
      const reach = C.knightReach(v, from, me);
      const foes = reach.foes.filter((x) => v.knights[x].level < k.level);
      const g = C.G(v);
      const robber = C.robberActive(v) && !!v.board.robber && g.hexes[v.board.robber].vertices.includes(from);
      const pirate = v.settings.seafarers && C.robberActive(v) && !!v.board.pirate && g.hexes[v.board.pirate].vertices.includes(from);
      return {
        targets: { vertices: [...reach.empty, ...foes], selected: [from] },
        hint: 'pick.knightTarget',
        cancel: true,
        chase: { robber, pirate, from },
        pick: (_k, id) => ({ act: { t: 'knightMove', from, to: id }, ...done }),
      };
    }
    case 'ship': {
      if (!mode.from) {
        const ids = t.shipMoved.includes(me) ? [] : C.movableShips(v, me);
        return { targets: { edges: ids }, hint: ids.length ? 'pick.shipFrom' : 'pick.none', cancel: true, pick: (_k, id) => ({ mode: { k: 'ship', from: id } }) };
      }
      const from = mode.from;
      const ids = C.shipTargets(v, me, from);
      return { targets: { edges: ids, selected: [from] }, hint: 'pick.shipTo', cancel: true, pick: (_k, id) => ({ act: { t: 'moveShip', from, to: id }, ...done }) };
    }
    case 'progress':
      return progressPlan(v, me, mode);
  }
  return { targets: null, hint: null };
}

function progressPlan(v: GameState, me: number, mode: Extract<Mode, { k: 'progress' }>): Plan {
  const g = C.G(v);
  const card = mode.card;
  const play = (arg: object) => ({ act: { t: 'playProgress', card, arg } as Action, mode: null as Mode });
  switch (card) {
    case 'engineer': {
      const ids = myCities(v, me).filter((x) => !v.buildings[x].wall);
      return { targets: { vertices: ids }, hint: 'pick.cityOwn', cancel: true, pick: (_k, id) => play({ vertex: id }) };
    }
    case 'medicine': {
      const ids = Object.keys(v.buildings).filter((x) => v.buildings[x].owner === me && v.buildings[x].kind === 'settlement');
      return { targets: { vertices: ids }, hint: 'pick.settlementOwn', cancel: true, pick: (_k, id) => play({ vertex: id }) };
    }
    case 'inventor': {
      const ids = Object.keys(v.board.hexes).filter((h) => { const n = v.board.hexes[h].number; return !!n && ![2, 6, 8, 12].includes(n); });
      return {
        targets: { hexes: ids, selected: mode.picked }, hint: 'pick.hexes2', cancel: true,
        pick: (_k, id) => {
          const picked = mode.picked.includes(id) ? mode.picked.filter((x) => x !== id) : [...mode.picked, id];
          if (picked.length === 2) return play({ hexes: picked });
          return { mode: { ...mode, picked } };
        },
      };
    }
    case 'smith': {
      const ids = myKnights(v, me).filter((x) => Guild.canPromote(v, me, x));
      return {
        targets: { vertices: ids, selected: mode.picked }, hint: 'pick.knightsOwn', cancel: true,
        confirm: mode.picked.length ? { t: 'playProgress', card, arg: { vertices: mode.picked } } : null,
        pick: (_k, id) => {
          const picked = mode.picked.includes(id) ? mode.picked.filter((x) => x !== id) : [...mode.picked, id].slice(-2);
          return { mode: { ...mode, picked } };
        },
      };
    }
    case 'diplomat': {
      const ids = Object.keys(v.roads).filter((e) => C.isOpenRoad(v, e));
      return { targets: { edges: ids }, hint: 'pick.openRoad', cancel: true, pick: (_k, id) => play({ edge: id }) };
    }
    case 'intrigue': {
      const ids = Object.keys(v.knights).filter((x) => v.knights[x].owner !== me
        && g.vertices[x].edges.some((e) => v.roads[e]?.owner === me || (v.settings.seafarers && v.ships[e]?.owner === me)));
      return { targets: { vertices: ids }, hint: 'pick.foeKnight', cancel: true, pick: (_k, id) => play({ vertex: id }) };
    }
    case 'merchant': {
      const ids = Object.keys(v.board.hexes).filter((h) => ['forest', 'hills', 'pasture', 'fields', 'mountains'].includes(v.board.hexes[h].terrain)
        && g.hexes[h].vertices.some((x) => v.buildings[x]?.owner === me));
      return { targets: { hexes: ids }, hint: 'pick.merchantHex', cancel: true, pick: (_k, id) => play({ hex: id }) };
    }
    default:
      return { targets: null, hint: null };
  }
}

/** Cartas de progreso que se juegan eligiendo en el tablero. */
export const BOARD_PROGRESS: ProgressType[] = ['engineer', 'medicine', 'inventor', 'smith', 'diplomat', 'intrigue', 'merchant'];

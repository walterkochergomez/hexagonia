// Bot simple que sólo elige acciones legales. Sirve para simulaciones masivas y para completar mesa.
import type { Rng } from './rng';
import * as C from './core';
import * as Guild from './guilds';
import {
  CARDS, COMMODITIES, COST, RESOURCES, TRACKS, TRACK_COMMODITY, emptyHand, handTotal,
  type Action, type Card, type GameState, type Hand, type Resource,
} from './types';

/** Asiento que debe actuar ahora (paso pendiente, respuesta a oferta o jugador activo). */
export function whoActs(s: GameState): number | null {
  if (s.winner !== null) return null;
  const st = s.steps[0];
  if (st && st.k !== 'produce') return C.waitingSeats(st)[0] ?? null;
  if (s.trade) {
    const pending = s.trade.to.find((x) => !s.trade!.replies[x]);
    if (pending !== undefined) return pending;
  }
  return C.actorOf(s);
}

function randomCards(rng: Rng, h: Hand, n: number, only?: readonly Card[]): Partial<Hand> {
  const pool: Card[] = [];
  for (const c of only ?? CARDS) for (let i = 0; i < h[c]; i++) pool.push(c);
  rng.shuffle(pool);
  const out: Partial<Hand> = {};
  for (const c of pool.slice(0, n)) out[c] = (out[c] ?? 0) + 1;
  return out;
}

function pickFromBank(rng: Rng, s: GameState, n: number): Partial<Hand> {
  const avail = RESOURCES.reduce((a, r) => a + s.bank[r], 0);
  const k = Math.min(n, avail);
  const out: Partial<Hand> = {};
  const left = { ...s.bank };
  for (let i = 0; i < k; i++) {
    const opts = RESOURCES.filter((r) => left[r] > 0);
    const r = rng.pick(opts);
    left[r]--;
    out[r] = (out[r] ?? 0) + 1;
  }
  return out;
}

const pips = (n: number | null) => (n ? 6 - Math.abs(7 - n) : 0);

function vertexScore(s: GameState, v: string): number {
  return C.G(s).vertices[v].hexes.reduce((a, h) => a + pips(s.board.hexes[h]?.number ?? null), 0);
}

function best<T>(rng: Rng, items: T[], score: (x: T) => number): T {
  let top = -Infinity;
  let out: T[] = [];
  for (const it of items) {
    const sc = score(it) + rng.float() * 0.5;
    if (sc > top) {
      top = sc;
      out = [it];
    }
  }
  return out[0];
}

export function botAction(s: GameState, seat: number, rng: Rng): Action | null {
  const st = s.steps[0];
  const p = s.players[seat];
  const h = p.hand;
  if (st && st.k !== 'produce') {
    if (!C.waitingSeats(st).includes(seat)) return null;
    switch (st.k) {
      case 'discard': return { t: 'discard', cards: randomCards(rng, h, st.waiting[seat]) };
      case 'robber': {
        const usePirate = st.pirate && (!st.robber || rng.float() < 0.3) && C.legalPirateHexes(s).length > 0;
        if (usePirate) return { t: 'robber', hex: rng.pick(C.legalPirateHexes(s)), target: 'pirate' };
        const hexes = C.legalRobberHexes(s, seat);
        return { t: 'robber', hex: best(rng, hexes, (x) => C.robberVictims(s, seat, x).length * 3 + pips(s.board.hexes[x].number)), target: 'robber' };
      }
      case 'steal': return { t: 'steal', from: rng.pick(st.from) };
      case 'pick': return { t: 'pick', cards: pickFromBank(rng, s, st.waiting[seat]) };
      case 'monopoly': return { t: 'monopoly', card: rng.pick(RESOURCES) };
      case 'freeRoutes': {
        const left = C.piecesLeft(s, seat);
        const roads = left.road > 0 ? C.legalRoads(s, seat) : [];
        const ships = st.source !== 'diplomat' && left.ship > 0 ? C.legalShips(s, seat) : [];
        if (!roads.length && !ships.length) return { t: 'skipFree' };
        if (ships.length && (!roads.length || rng.float() < 0.4)) return { t: 'freeRoute', edge: rng.pick(ships), ship: true };
        return { t: 'freeRoute', edge: rng.pick(roads) };
      }
      case 'pillage': return { t: 'pillage', vertex: rng.pick(C.pillageable(s, seat)) };
      case 'defenderPick': return { t: 'defenderPick', track: rng.pick(TRACKS.filter((t) => s.hidden.progress[t].length > 0)) };
      case 'progressLimit': return { t: 'progressDiscard', card: rng.pick(p.progress) };
      case 'metropolis': return { t: 'metropolis', vertex: rng.pick(C.defaultCity(s, seat)) };
      case 'relocate': {
        const opts = C.knightReach(s, st.from, seat).empty.filter((v) => v !== st.from);
        return { t: 'relocate', to: opts.length ? rng.pick(opts) : null };
      }
      case 'deserterChoose': return { t: 'deserterChoose', vertex: rng.pick(Object.keys(s.knights).filter((v) => s.knights[v].owner === seat)) };
      case 'deserterPlace': {
        const opts = C.recruitSpots(s, seat);
        return { t: 'deserterPlace', vertex: opts.length ? rng.pick(opts) : null };
      }
      case 'spy': return { t: 'spyTake', card: st.cards.length && rng.float() < 0.9 ? rng.pick(st.cards) : null };
      case 'masterMerchant': return { t: 'masterTake', cards: randomCards(rng, s.players[st.target].hand, 2) };
      case 'give': return { t: 'give', cards: randomCards(rng, h, st.waiting[seat]) };
      case 'harborOffer': {
        const offers: Record<number, Resource> = {};
        const left = { ...h };
        for (const t of st.targets) {
          const opts = RESOURCES.filter((r) => left[r] > 0);
          if (!opts.length || rng.float() < 0.3) continue;
          const r = rng.pick(opts);
          left[r]--;
          offers[t] = r;
        }
        return { t: 'harborOffer', offers };
      }
      case 'harborReply': return { t: 'harborReply', card: rng.pick(COMMODITIES.filter((c) => h[c] > 0)) };
      default: return null;
    }
  }
  const t = s.turn;
  // respuestas a ofertas
  if (s.trade && s.trade.to.includes(seat) && !s.trade.replies[seat]) {
    const can = C.hasCards(h, s.trade.want);
    const r = rng.float();
    if (can && r < 0.35) return { t: 'reply', id: s.trade.id, status: 'accept' };
    if (r < 0.45) {
      const give = randomCards(rng, h, 1);
      const want = { [rng.pick(RESOURCES.filter((x) => !give[x]))]: 1 } as Partial<Hand>;
      if (handTotal(give) > 0) return { t: 'counter', id: s.trade.id, give, want };
    }
    return { t: 'reply', id: s.trade.id, status: 'decline' };
  }
  if (C.actorOf(s) !== seat) return null;
  if (t.phase === 'setup') {
    if (t.setupAwait === 'building') {
      return { t: 'setupBuild', vertex: best(rng, C.legalSetupVertices(s), (v) => vertexScore(s, v)) };
    }
    const r = C.legalSetupRoutes(s, t.setupVertex!);
    if (r.ships.length && (!r.roads.length || rng.float() < 0.3)) return { t: 'setupRoute', edge: rng.pick(r.ships), ship: true };
    return { t: 'setupRoute', edge: rng.pick(r.roads) };
  }
  if (t.phase === 'preRoll') {
    if (s.settings.guilds && p.progress.includes('alchemist') && rng.float() < 0.3) {
      return { t: 'playProgress', card: 'alchemist', arg: { dice: [rng.int(6) + 1, rng.int(6) + 1] } };
    }
    if (!s.settings.guilds && p.devPlayedTurn !== t.n && p.dev.some((d) => d.type === 'soldier' && d.turn !== t.n) && rng.float() < 0.4) {
      return { t: 'playDev', card: 'soldier' };
    }
    return { t: 'roll' };
  }
  if (s.trade && s.trade.from === seat) {
    const ok = Object.entries(s.trade.replies).find(([, r]) => r.status !== 'decline');
    if (ok && rng.float() < 0.8) {
      const w = Number(ok[0]);
      const r = ok[1];
      const fromGives = r.status === 'counter' ? r.want! : s.trade.give;
      const withGives = r.status === 'counter' ? r.give! : s.trade.want;
      if (C.hasCards(h, fromGives) && C.hasCards(s.players[w].hand, withGives)) return { t: 'confirmTrade', id: s.trade.id, with: w };
    }
    return { t: 'cancelTrade' };
  }
  const sbp = t.phase === 'specialBuild';
  const left = C.piecesLeft(s, seat);
  const can = (cost: Partial<Hand>) => C.hasCards(h, cost);
  // construir
  if (can(COST.city) && left.city > 0) {
    const cities = C.legalCities(s, seat);
    if (cities.length) return { t: 'build', what: 'city', at: best(rng, cities, (v) => vertexScore(s, v)) };
  }
  const damaged = Object.values(s.buildings).some((b) => b.owner === seat && b.damaged);
  if (can(COST.settlement) && left.settlement > 0 && !damaged) {
    const spots = C.legalSettlements(s, seat);
    if (spots.length) return { t: 'build', what: 'settlement', at: best(rng, spots, (v) => vertexScore(s, v)) };
  }
  if (s.settings.guilds) {
    for (const tr of rng.shuffle([...TRACKS])) {
      if (Guild.canImprove(s, seat, tr) && rng.float() < 0.7) return { t: 'improve', track: tr };
    }
    if (can(COST.knight) && left.knights[1] > 0 && rng.float() < 0.5) {
      const spots = C.recruitSpots(s, seat);
      if (spots.length) return { t: 'recruit', at: rng.pick(spots) };
    }
    const mine = Object.keys(s.knights).filter((v) => s.knights[v].owner === seat);
    const inactive = mine.filter((v) => !s.knights[v].active);
    if (can(COST.activate) && inactive.length && rng.float() < 0.6) return { t: 'activate', at: rng.pick(inactive) };
    const promotable = mine.filter((v) => Guild.canPromote(s, seat, v));
    if (can(COST.promote) && promotable.length && rng.float() < 0.3) return { t: 'promote', at: rng.pick(promotable) };
    if (can(COST.wall) && left.wall > 0 && rng.float() < 0.3) {
      const walls = Object.keys(s.buildings).filter((v) => { const b = s.buildings[v]; return b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall; });
      if (walls.length) return { t: 'build', what: 'wall', at: rng.pick(walls) };
    }
  }
  const wantRoad = rng.float() < (C.legalSettlements(s, seat).length ? 0.25 : 0.8);
  if (wantRoad) {
    if (s.settings.seafarers && can(COST.ship) && left.ship > 0 && rng.float() < 0.5) {
      const ships = C.legalShips(s, seat);
      if (ships.length) return { t: 'build', what: 'ship', at: rng.pick(ships) };
    }
    if (can(COST.road) && left.road > 0) {
      const roads = C.legalRoads(s, seat);
      if (roads.length) return { t: 'build', what: 'road', at: rng.pick(roads) };
    }
  }
  if (!s.settings.guilds && can(COST.dev) && s.hidden.devDeck.length && rng.float() < 0.5) return { t: 'buyDev' };
  if (sbp) return { t: 'endTurn' };
  // cartas
  if (!s.settings.guilds && p.devPlayedTurn !== t.n) {
    const playable = p.dev.filter((d) => d.turn !== t.n && d.type !== 'point').map((d) => d.type);
    if (playable.length && rng.float() < 0.5) {
      const card = rng.pick(playable) as 'soldier' | 'roads' | 'plenty' | 'monopoly';
      return { t: 'playDev', card } as Action;
    }
  }
  if (s.settings.guilds && p.progress.length && rng.float() < 0.5) {
    const a = progressAttempt(s, seat, rng);
    if (a) return a;
  }
  // caballeros
  if (s.settings.guilds && rng.float() < 0.3) {
    const ready = Object.keys(s.knights).filter((v) => C.canKnightAct(s, v, seat));
    if (ready.length) {
      const from = rng.pick(ready);
      const k = s.knights[from];
      if (C.robberActive(s) && s.board.robber && C.G(s).hexes[s.board.robber].vertices.includes(from) && rng.float() < 0.5) {
        return { t: 'chase', from, target: 'robber' };
      }
      const reach = C.knightReach(s, from, seat);
      const foes = reach.foes.filter((v) => s.knights[v].level < k.level);
      if (foes.length) return { t: 'knightMove', from, to: rng.pick(foes) };
      if (reach.empty.length && rng.float() < 0.3) return { t: 'knightMove', from, to: rng.pick(reach.empty) };
    }
  }
  // barcos
  if (s.settings.seafarers && !t.shipMoved.includes(seat) && rng.float() < 0.15) {
    const movable = C.movableShips(s, seat);
    if (movable.length) {
      const from = rng.pick(movable);
      const targets = C.shipTargets(s, seat, from);
      if (targets.length) return { t: 'moveShip', from, to: rng.pick(targets) };
    }
  }
  // comercio con el banco
  const goal = rng.pick([COST.city, COST.settlement, COST.road, COST.dev, COST.knight]);
  const missing = CARDS.filter((c) => (goal[c] ?? 0) > h[c]);
  if (missing.length) {
    for (const c of rng.shuffle([...CARDS])) {
      const ratio = C.ratioFor(s, seat, c);
      if (!s.settings.guilds && !RESOURCES.includes(c as Resource)) continue;
      if (h[c] - (goal[c] ?? 0) >= ratio) {
        const get = rng.pick(missing.filter((m) => s.bank[m] > 0 && (s.settings.guilds || RESOURCES.includes(m as Resource))) as Card[]);
        if (get && get !== c) return { t: 'bank', give: c, get, count: 1 };
      }
    }
  }
  // oferta entre jugadores, de vez en cuando
  if (t.phase === 'main' && rng.float() < 0.1 && handTotal(h) > 0 && missing.length) {
    const give = randomCards(rng, h, 1, RESOURCES);
    const wantCard = rng.pick(missing.filter((m) => !give[m]));
    if (handTotal(give) && wantCard) return { t: 'offer', give, want: { [wantCard]: 1 } };
  }
  return { t: 'endTurn' };
}

function progressAttempt(s: GameState, seat: number, rng: Rng): Action | null {
  const p = s.players[seat];
  const card = rng.pick(p.progress);
  if (!Guild.canPlayProgress(s, seat, card)) return null;
  const g = C.G(s);
  const others = s.players.map((x) => x.seat).filter((x) => x !== seat);
  const myVp = C.vpOf(s, seat, false);
  const a = (arg: object = {}): Action => ({ t: 'playProgress', card, arg });
  switch (card) {
    case 'alchemist': return null;
    case 'crane': {
      const tr = TRACKS.filter((x) => Guild.canImprove(s, seat, x, 1));
      return tr.length ? a({ track: rng.pick(tr) }) : null;
    }
    case 'engineer': {
      if (C.piecesLeft(s, seat).wall <= 0) return null;
      const vs = Object.keys(s.buildings).filter((v) => { const b = s.buildings[v]; return b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall; });
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'inventor': {
      const hs = Object.keys(s.board.hexes).filter((x) => { const n = s.board.hexes[x].number; return !!n && ![2, 12, 6, 8].includes(n); });
      if (hs.length < 2) return null;
      rng.shuffle(hs);
      return a({ hexes: [hs[0], hs[1]] });
    }
    case 'medicine': {
      if (!C.hasCards(p.hand, COST.medicine) || C.piecesLeft(s, seat).city <= 0) return null;
      const vs = Object.keys(s.buildings).filter((v) => s.buildings[v].owner === seat && s.buildings[v].kind === 'settlement');
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'smith': {
      const vs = Object.keys(s.knights).filter((v) => Guild.canPromote(s, seat, v));
      return vs.length ? a({ vertices: [rng.pick(vs)] }) : null;
    }
    case 'bishop': return C.robberActive(s) ? a() : null;
    case 'deserter': {
      const t = others.filter((o) => Object.values(s.knights).some((k) => k.owner === o));
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'diplomat': {
      const es = Object.keys(s.roads).filter((e) => C.isOpenRoad(s, e));
      return es.length ? a({ edge: rng.pick(es) }) : null;
    }
    case 'intrigue': {
      const vs = Object.keys(s.knights).filter((v) => s.knights[v].owner !== seat
        && g.vertices[v].edges.some((e) => s.roads[e]?.owner === seat || (s.settings.seafarers && s.ships[e]?.owner === seat)));
      return vs.length ? a({ vertex: rng.pick(vs) }) : null;
    }
    case 'spy': {
      const t = others.filter((o) => s.players[o].progress.length > 0);
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'masterMerchant': {
      const t = others.filter((o) => C.vpOf(s, o, false) > myVp && handTotal(s.players[o].hand) > 0);
      return t.length ? a({ seat: rng.pick(t) }) : null;
    }
    case 'commercialHarbor': return RESOURCES.some((r) => p.hand[r] > 0) ? a() : null;
    case 'merchant': {
      const hs = Object.keys(s.board.hexes).filter((x) => {
        const tr = s.board.hexes[x].terrain;
        return ['forest', 'hills', 'pasture', 'fields', 'mountains'].includes(tr) && g.hexes[x].vertices.some((v) => s.buildings[v]?.owner === seat);
      });
      return hs.length ? a({ hex: rng.pick(hs) }) : null;
    }
    case 'merchantFleet': return a({ card: rng.pick(CARDS) });
    case 'resourceMonopoly': return a({ card: rng.pick(RESOURCES) });
    case 'tradeMonopoly': return a({ card: rng.pick(COMMODITIES) });
    default: return a();
  }
}

export const _test = { randomCards, emptyHand, TRACK_COMMODITY };

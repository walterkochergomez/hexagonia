// Módulo "Gremios y Guardianes": mercancías, mejoras, metrópolis, caballeros, bárbaros y cartas de progreso.
import type { Rng } from './rng';
import * as C from './core';
import {
  COMMODITIES, COST, GameError, PROGRESS_TRACK, PROGRESS_VP, RESOURCES, TERRAIN_RESOURCE, TRACKS, TRACK_COMMODITY,
  handTotal, isCommodity, isResource,
  type Action, type BarbarianResult, type GameState, type Hand, type Knight, type ProgressArg, type ProgressType,
  type Resource, type Step, type Track,
} from './types';

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

// ---------- dado de eventos y cartas de progreso ----------

export function resolveEvent(s: GameState, face: string, red: number) {
  if (face === 'ship') {
    s.barbarians.pos++;
    C.log(s, 'barbarians.advance', { pos: s.barbarians.pos });
    if (s.barbarians.pos >= 7) attack(s);
    return;
  }
  const track = face as Track;
  const n = s.players.length;
  for (let i = 0; i < n; i++) {
    const seat = (s.turn.current + i) % n;
    const lvl = s.players[seat].improvements[track];
    if (lvl >= 1 && red <= lvl + 1) drawProgress(s, seat, track);
  }
  limitCheck(s);
}

export function drawProgress(s: GameState, seat: number, track: Track): boolean {
  const card = s.hidden.progress[track].shift();
  if (!card) return false;
  const p = s.players[seat];
  if (PROGRESS_VP.includes(card)) {
    p.vpCards.push(card);
    C.log(s, 'progress.vp', { seat, card });
  } else {
    p.progress.push(card);
    C.log(s, 'progress.draw.card', { seat, track, card }, [seat], { k: 'progress.draw', p: { seat, track } });
  }
  return true;
}

/** Jugadores fuera de su turno con más de 4 cartas de progreso deben descartar ya. */
export function limitCheck(s: GameState) {
  const acting = new Set([s.turn.current]);
  if (s.turn.phase === 'paired' && s.turn.partner !== null) acting.add(s.turn.partner);
  const waiting: Record<number, number> = {};
  for (const p of s.players) {
    if (acting.has(p.seat)) continue;
    if (p.progress.length > 4) waiting[p.seat] = p.progress.length - 4;
  }
  if (!Object.keys(waiting).length) return;
  const existing = s.steps.find((st) => st.k === 'progressLimit') as Extract<Step, { k: 'progressLimit' }> | undefined;
  if (existing) Object.assign(existing.waiting, waiting);
  else s.steps.push({ k: 'progressLimit', waiting });
}

// ---------- bárbaros ----------

export function attack(s: GameState) {
  let strength = 0;
  for (const b of Object.values(s.buildings)) if (b.kind === 'city' && !b.damaged) strength++;
  const contributions = s.players.map(() => 0);
  for (const k of Object.values(s.knights)) if (k.active) contributions[k.owner] += k.level;
  const defense = contributions.reduce((a, b) => a + b, 0);
  const res: BarbarianResult = { strength, defense, contributions, won: defense >= strength, losers: [], defender: null, tied: [] };
  if (!res.won) {
    const cands = s.players.map((p) => p.seat).filter((seat) => C.pillageable(s, seat).length > 0);
    if (cands.length) {
      const min = Math.min(...cands.map((c) => contributions[c]));
      res.losers = cands.filter((c) => contributions[c] === min);
    }
    const waiting: number[] = [];
    for (const l of res.losers) {
      const cities = C.pillageable(s, l);
      if (cities.length === 1) pillage(s, l, cities[0]);
      else waiting.push(l);
    }
    if (waiting.length) s.steps.push({ k: 'pillage', waiting });
  } else {
    const max = Math.max(...contributions);
    if (max > 0) {
      const n = s.players.length;
      const top: number[] = [];
      for (let i = 0; i < n; i++) {
        const seat = (s.turn.current + i) % n;
        if (contributions[seat] === max) top.push(seat);
      }
      if (top.length === 1) {
        s.players[top[0]].defender++;
        res.defender = top[0];
      } else {
        res.tied = top;
        s.steps.push({ k: 'defenderPick', waiting: top });
      }
    }
  }
  s.barbarians.last = res;
  s.barbarians.pos = 0;
  s.barbarians.attacks++;
  for (const k of Object.values(s.knights)) k.active = false;
  C.log(s, 'barbarians.attack', { strength, defense, won: res.won, defender: res.defender });
  if (s.barbarians.attacks === 1) {
    if (s.board.robberStart && !s.board.robber) s.board.robber = s.board.robberStart;
    C.log(s, 'robber.enters');
  }
  C.updateRoadAward(s);
}

export function pillage(s: GameState, seat: number, v: string) {
  const b = s.buildings[v];
  need(b && b.owner === seat && b.kind === 'city' && !b.metro && !b.damaged, 'illegal');
  delete b.wall;
  if (C.piecesLeft(s, seat).settlement > 0) b.kind = 'settlement';
  else b.damaged = true;
  C.log(s, 'barbarians.pillage', { seat });
}

// ---------- mejoras y metrópolis ----------

export function hasCity(s: GameState, seat: number): boolean {
  return Object.values(s.buildings).some((b) => b.owner === seat && b.kind === 'city' && !b.damaged);
}

export function canImprove(s: GameState, seat: number, track: Track, discount = 0): boolean {
  const p = s.players[seat];
  const lvl = p.improvements[track];
  if (lvl >= 5 || !hasCity(s, seat)) return false;
  const target = lvl + 1;
  if (target >= 4 && s.metropolis[track]?.owner !== seat && !C.defaultCity(s, seat).length) return false;
  return p.hand[TRACK_COMMODITY[track]] >= Math.max(0, target - discount);
}

export function improve(s: GameState, seat: number, track: Track, discount = 0) {
  need(canImprove(s, seat, track, discount), 'illegal');
  const p = s.players[seat];
  const target = p.improvements[track] + 1;
  C.pay(s, seat, { [TRACK_COMMODITY[track]]: Math.max(0, target - discount) });
  p.improvements[track] = target;
  C.log(s, 'improve', { seat, track, level: target });
  const m = s.metropolis[track];
  if (target < 4 || m?.owner === seat) return;
  if (!m) {
    awardMetro(s, seat, track);
  } else if (target === 5 && s.players[m.owner].improvements[track] < 5) {
    delete s.buildings[m.vertex].metro;
    s.metropolis[track] = null;
    C.log(s, 'metro.lost', { seat: m.owner, track });
    awardMetro(s, seat, track);
  }
}

function awardMetro(s: GameState, seat: number, track: Track) {
  const cities = C.defaultCity(s, seat);
  if (cities.length === 1) placeMetro(s, seat, track, cities[0]);
  else if (cities.length > 1) s.steps.unshift({ k: 'metropolis', seat, track });
}

function placeMetro(s: GameState, seat: number, track: Track, v: string) {
  s.buildings[v].metro = track;
  s.metropolis[track] = { owner: seat, vertex: v };
  C.log(s, 'metro.gain', { seat, track });
}

// ---------- caballeros ----------

export function recruit(s: GameState, seat: number, v: string, free = false) {
  need(C.piecesLeft(s, seat).knights[1] > 0, 'noPieces');
  need(C.recruitSpots(s, seat).includes(v), 'illegal');
  if (!free) C.pay(s, seat, COST.knight);
  s.knights[v] = { owner: seat, level: 1, active: false, activatedTurn: -1, promotedTurn: -1 };
  C.log(s, 'knight.recruit', { seat });
  C.updateRoadAward(s);
}

export function activate(s: GameState, seat: number, v: string) {
  const k = s.knights[v];
  need(k && k.owner === seat && !k.active, 'illegal');
  C.pay(s, seat, COST.activate);
  k.active = true;
  k.activatedTurn = s.turn.n;
  C.log(s, 'knight.activate', { seat });
}

export function canPromote(s: GameState, seat: number, v: string): boolean {
  const k = s.knights[v];
  if (!k || k.owner !== seat || k.level >= 3 || k.promotedTurn === s.turn.n) return false;
  if (C.piecesLeft(s, seat).knights[k.level + 1] <= 0) return false;
  return !(k.level === 2 && s.players[seat].improvements.politics < 3);
}

export function promote(s: GameState, seat: number, v: string, free = false) {
  need(canPromote(s, seat, v), 'illegal');
  if (!free) C.pay(s, seat, COST.promote);
  const k = s.knights[v];
  k.level = (k.level + 1) as 2 | 3;
  k.promotedTurn = s.turn.n;
  C.log(s, 'knight.promote', { seat, level: k.level });
}

export function knightMove(s: GameState, seat: number, from: string, to: string) {
  need(C.canKnightAct(s, from, seat), 'knightCannotAct');
  const k = s.knights[from];
  const reach = C.knightReach(s, from, seat);
  if (reach.empty.includes(to)) {
    delete s.knights[from];
    s.knights[to] = { ...k, active: false };
    C.log(s, 'knight.move', { seat });
  } else if (reach.foes.includes(to)) {
    const foe = s.knights[to];
    need(foe.level < k.level, 'knightTooWeak');
    delete s.knights[from];
    s.knights[to] = { ...k, active: false };
    C.log(s, 'knight.displace', { seat, victim: foe.owner });
    startRelocate(s, foe, to);
  } else {
    throw new GameError('illegal');
  }
  C.updateRoadAward(s);
}

function startRelocate(s: GameState, foe: Knight, at: string) {
  const opts = C.knightReach(s, at, foe.owner).empty.filter((v) => v !== at);
  if (!opts.length) {
    C.log(s, 'knight.lost', { seat: foe.owner });
    return;
  }
  s.steps.unshift({ k: 'relocate', seat: foe.owner, from: at, level: foe.level, active: foe.active, activatedTurn: foe.activatedTurn });
}

export function chase(s: GameState, seat: number, from: string, target: 'robber' | 'pirate') {
  need(C.canKnightAct(s, from, seat), 'knightCannotAct');
  need(C.robberActive(s), 'robberInactive');
  const hex = target === 'robber' ? s.board.robber : s.board.pirate;
  need(hex && C.G(s).hexes[hex].vertices.includes(from), 'illegal');
  need(target === 'robber' || s.settings.seafarers, 'illegal');
  s.knights[from].active = false;
  C.log(s, 'knight.chase', { seat, target });
  s.steps.unshift({ k: 'robber', seat, robber: target === 'robber', pirate: target === 'pirate', mode: 'steal1' });
}

// ---------- cartas de progreso ----------

function bottom(s: GameState, card: ProgressType) {
  s.hidden.progress[PROGRESS_TRACK[card]].push(card);
}

function adjacentTerrainCount(s: GameState, seat: number, terrain: string): number {
  const g = C.G(s);
  let n = 0;
  for (const [id, h] of Object.entries(s.board.hexes)) {
    if (h.terrain !== terrain) continue;
    if (g.hexes[id].vertices.some((v) => s.buildings[v]?.owner === seat)) n++;
  }
  return n;
}

export function canPlayProgress(s: GameState, seat: number, card: ProgressType): boolean {
  const p = s.players[seat];
  if (!p.progress.includes(card) || s.steps.length) return false;
  if (card === 'alchemist') return s.turn.phase === 'preRoll' && s.turn.current === seat;
  return (s.turn.phase === 'main' && s.turn.current === seat) || (s.turn.phase === 'paired' && s.turn.partner === seat);
}

export function playProgress(s: GameState, seat: number, card: ProgressType, arg: ProgressArg = {}) {
  need(canPlayProgress(s, seat, card), 'cannotPlay');
  const p = s.players[seat];
  const others = s.players.map((x) => x.seat).filter((x) => x !== seat);
  const myVp = C.vpOf(s, seat, false);
  // validar antes de gastar la carta
  const run = progressEffect(s, seat, card, arg, others, myVp);
  p.progress.splice(p.progress.indexOf(card), 1);
  bottom(s, card);
  C.log(s, 'progress.play', { seat, card });
  run();
}

function progressEffect(s: GameState, seat: number, card: ProgressType, arg: ProgressArg, others: number[], myVp: number): () => void {
  const g = C.G(s);
  switch (card) {
    case 'alchemist': {
      const d = arg.dice;
      need(d && d.length === 2 && d.every((x) => Number.isInteger(x) && x >= 1 && x <= 6), 'badArg');
      return () => { s.turn.alchemist = [d![0], d![1]]; };
    }
    case 'crane':
      need(arg.track && canImprove(s, seat, arg.track, 1), 'illegal');
      return () => improve(s, seat, arg.track!, 1);
    case 'engineer': {
      const b = arg.vertex ? s.buildings[arg.vertex] : undefined;
      need(b && b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall && C.piecesLeft(s, seat).wall > 0, 'illegal');
      return () => { b!.wall = true; C.log(s, 'build.wall', { seat }); };
    }
    case 'inventor': {
      const hs = arg.hexes;
      const ok = (h: string) => { const n = s.board.hexes[h]?.number; return !!n && ![2, 12, 6, 8].includes(n); };
      need(hs && hs[0] !== hs[1] && ok(hs[0]) && ok(hs[1]), 'illegal');
      return () => {
        const [a, b] = hs!;
        const t = s.board.hexes[a].number;
        s.board.hexes[a].number = s.board.hexes[b].number;
        s.board.hexes[b].number = t;
        C.log(s, 'progress.inventor', { seat, a, b });
      };
    }
    case 'irrigation':
    case 'mining': {
      const terrain = card === 'irrigation' ? 'fields' : 'mountains';
      const res: Resource = card === 'irrigation' ? 'grain' : 'ore';
      return () => {
        const got = C.gain(s, seat, res, 2 * adjacentTerrainCount(s, seat, terrain));
        C.log(s, 'progress.gain', { seat, card: res, n: got });
      };
    }
    case 'medicine': {
      const b = arg.vertex ? s.buildings[arg.vertex] : undefined;
      need(b && b.owner === seat && b.kind === 'settlement' && C.piecesLeft(s, seat).city > 0, 'illegal');
      need(C.hasCards(s.players[seat].hand, COST.medicine), 'cost');
      return () => {
        C.pay(s, seat, COST.medicine);
        b!.kind = 'city';
        C.log(s, 'build.city', { seat });
      };
    }
    case 'roadBuilding':
      return () => { s.steps.unshift({ k: 'freeRoutes', seat, left: 2, source: 'progress' }); };
    case 'smith': {
      const vs = arg.vertices ?? [];
      need(vs.length >= 1 && vs.length <= 2 && new Set(vs).size === vs.length, 'badArg');
      need(vs.every((v) => canPromote(s, seat, v)), 'illegal');
      if (vs.length === 2) {
        // dos ascensos al mismo nivel requieren dos piezas libres
        const a = s.knights[vs[0]].level, b = s.knights[vs[1]].level;
        if (a === b) need(C.piecesLeft(s, seat).knights[a + 1] >= 2, 'noPieces');
      }
      return () => { for (const v of vs) promote(s, seat, v, true); };
    }
    case 'bishop':
      need(C.robberActive(s), 'robberInactive');
      return () => { s.steps.unshift({ k: 'robber', seat, robber: true, pirate: false, mode: 'stealAll' }); };
    case 'deserter': {
      const t = arg.seat;
      need(t !== undefined && others.includes(t) && Object.values(s.knights).some((k) => k.owner === t), 'illegal');
      return () => {
        const mine = Object.entries(s.knights).filter(([, k]) => k.owner === t);
        if (mine.length === 1) deserterRemove(s, t!, mine[0][0], seat);
        else s.steps.unshift({ k: 'deserterChoose', seat: t!, by: seat });
      };
    }
    case 'diplomat': {
      const e = arg.edge;
      need(e && C.isOpenRoad(s, e), 'illegal');
      return () => {
        const owner = s.roads[e!].owner;
        delete s.roads[e!];
        C.log(s, 'progress.diplomat', { seat, owner });
        if (owner === seat) s.steps.unshift({ k: 'freeRoutes', seat, left: 1, source: 'diplomat' });
        C.updateRoadAward(s);
      };
    }
    case 'intrigue': {
      const v = arg.vertex;
      const k = v ? s.knights[v] : undefined;
      const linked = v && g.vertices[v].edges.some((e) => s.roads[e]?.owner === seat || (s.settings.seafarers && s.ships[e]?.owner === seat));
      need(k && k.owner !== seat && linked, 'illegal');
      return () => {
        delete s.knights[v!];
        C.log(s, 'knight.displace', { seat, victim: k!.owner });
        startRelocate(s, k!, v!);
        C.updateRoadAward(s);
      };
    }
    case 'saboteur':
      return () => {
        const waiting: Record<number, number> = {};
        for (const o of others) {
          const n = Math.floor(handTotal(s.players[o].hand) / 2);
          if (n > 0 && C.vpOf(s, o, false) >= myVp) waiting[o] = n;
        }
        if (Object.keys(waiting).length) s.steps.unshift({ k: 'discard', reason: 'saboteur', waiting });
      };
    case 'spy': {
      const t = arg.seat;
      need(t !== undefined && others.includes(t) && s.players[t].progress.length > 0, 'illegal');
      return () => { s.steps.unshift({ k: 'spy', seat, target: t!, cards: [...s.players[t!].progress] }); };
    }
    case 'warlord':
      return () => {
        for (const k of Object.values(s.knights)) {
          if (k.owner === seat && !k.active) {
            k.active = true;
            k.activatedTurn = s.turn.n;
          }
        }
      };
    case 'wedding':
      return () => {
        const waiting: Record<number, number> = {};
        for (const o of others) {
          const h = handTotal(s.players[o].hand);
          if (h > 0 && C.vpOf(s, o, false) > myVp) waiting[o] = Math.min(2, h);
        }
        if (Object.keys(waiting).length) s.steps.unshift({ k: 'give', reason: 'wedding', to: seat, waiting });
      };
    case 'commercialHarbor':
      need(RESOURCES.some((r) => s.players[seat].hand[r] > 0), 'noCards');
      return () => { s.steps.unshift({ k: 'harborOffer', seat, targets: others }); };
    case 'masterMerchant': {
      const t = arg.seat;
      need(t !== undefined && others.includes(t) && C.vpOf(s, t, false) > myVp && handTotal(s.players[t].hand) > 0, 'illegal');
      return () => { s.steps.unshift({ k: 'masterMerchant', seat, target: t!, hand: { ...s.players[t!].hand } }); };
    }
    case 'merchant': {
      const h = arg.hex;
      const hx = h ? s.board.hexes[h] : undefined;
      need(hx && hx.terrain !== 'fog' && TERRAIN_RESOURCE[hx.terrain as keyof typeof TERRAIN_RESOURCE], 'illegal');
      need(g.hexes[h!].vertices.some((v) => s.buildings[v]?.owner === seat), 'illegal');
      return () => {
        s.board.merchant = { hex: h!, owner: seat };
        C.log(s, 'progress.merchant', { seat });
      };
    }
    case 'merchantFleet':
      need(arg.card && (isResource(arg.card) || isCommodity(arg.card)), 'badArg');
      return () => { s.turn.fleet = { seat, card: arg.card! }; };
    case 'resourceMonopoly':
    case 'tradeMonopoly': {
      const c = arg.card;
      need(c && (card === 'resourceMonopoly' ? isResource(c) : isCommodity(c)), 'badArg');
      return () => {
        let total = 0;
        for (const o of others) {
          const k = Math.min(card === 'resourceMonopoly' ? 2 : 1, s.players[o].hand[c!]);
          if (k) C.moveCards(s, o, seat, { [c!]: k });
          total += k;
        }
        C.log(s, 'monopoly', { seat, card: c!, n: total });
      };
    }
    default:
      throw new GameError('cannotPlay');
  }
}

function deserterRemove(s: GameState, owner: number, v: string, by: number) {
  const k = s.knights[v];
  delete s.knights[v];
  C.log(s, 'progress.deserter', { seat: by, victim: owner });
  C.updateRoadAward(s);
  const left = C.piecesLeft(s, by).knights;
  let level = 0;
  for (let l = k.level; l >= 1; l--) if (left[l] > 0) { level = l; break; }
  if (level && C.recruitSpots(s, by).length) s.steps.unshift({ k: 'deserterPlace', seat: by, level: level as 1 | 2 | 3, active: k.active });
}

// ---------- respuestas a pasos pendientes del módulo ----------

export function handleStep(s: GameState, seat: number, a: Action, st: Step, rng: Rng): boolean {
  void rng;
  switch (st.k) {
    case 'pillage': {
      need(a.t === 'pillage' && st.waiting.includes(seat), 'pending');
      if (a.t !== 'pillage') return true;
      pillage(s, seat, a.vertex);
      st.waiting = st.waiting.filter((x) => x !== seat);
      if (!st.waiting.length) s.steps.shift();
      return true;
    }
    case 'defenderPick': {
      need(a.t === 'defenderPick' && st.waiting.includes(seat), 'pending');
      if (a.t !== 'defenderPick') return true;
      const any = TRACKS.some((t) => s.hidden.progress[t].length > 0);
      if (any) need(s.hidden.progress[a.track].length > 0, 'emptyDeck');
      drawProgress(s, seat, a.track);
      st.waiting = st.waiting.filter((x) => x !== seat);
      if (!st.waiting.length) s.steps.shift();
      limitCheck(s);
      return true;
    }
    case 'progressLimit': {
      need(a.t === 'progressDiscard' && st.waiting[seat], 'pending');
      if (a.t !== 'progressDiscard') return true;
      const p = s.players[seat];
      const i = p.progress.indexOf(a.card);
      need(i >= 0, 'illegal');
      p.progress.splice(i, 1);
      bottom(s, a.card);
      C.log(s, 'progress.discard', { seat });
      st.waiting[seat]--;
      if (st.waiting[seat] <= 0) delete st.waiting[seat];
      if (!Object.keys(st.waiting).length) s.steps.shift();
      return true;
    }
    case 'metropolis': {
      need(a.t === 'metropolis' && seat === st.seat, 'pending');
      if (a.t !== 'metropolis') return true;
      need(C.defaultCity(s, seat).includes(a.vertex), 'illegal');
      s.steps.shift();
      placeMetro(s, seat, st.track, a.vertex);
      return true;
    }
    case 'relocate': {
      need(a.t === 'relocate' && seat === st.seat, 'pending');
      if (a.t !== 'relocate') return true;
      const opts = C.knightReach(s, st.from, seat).empty.filter((v) => v !== st.from);
      if (a.to === null) need(!opts.length, 'mustMove');
      else need(opts.includes(a.to), 'illegal');
      s.steps.shift();
      if (a.to) {
        s.knights[a.to] = { owner: seat, level: st.level, active: st.active, activatedTurn: st.activatedTurn, promotedTurn: -1 };
        C.log(s, 'knight.relocate', { seat });
      }
      C.updateRoadAward(s);
      return true;
    }
    case 'deserterChoose': {
      need(a.t === 'deserterChoose' && seat === st.seat, 'pending');
      if (a.t !== 'deserterChoose') return true;
      need(s.knights[a.vertex]?.owner === seat, 'illegal');
      s.steps.shift();
      deserterRemove(s, seat, a.vertex, st.by);
      return true;
    }
    case 'deserterPlace': {
      need(a.t === 'deserterPlace' && seat === st.seat, 'pending');
      if (a.t !== 'deserterPlace') return true;
      if (a.vertex !== null) {
        need(C.recruitSpots(s, seat).includes(a.vertex) && C.piecesLeft(s, seat).knights[st.level] > 0, 'illegal');
        s.knights[a.vertex] = { owner: seat, level: st.level, active: st.active, activatedTurn: st.active ? s.turn.n : -1, promotedTurn: -1 };
        C.log(s, 'knight.recruit', { seat });
        C.updateRoadAward(s);
      }
      s.steps.shift();
      return true;
    }
    case 'spy': {
      need(a.t === 'spyTake' && seat === st.seat, 'pending');
      if (a.t !== 'spyTake') return true;
      if (a.card) {
        const tp = s.players[st.target];
        const i = tp.progress.indexOf(a.card);
        need(i >= 0, 'illegal');
        tp.progress.splice(i, 1);
        s.players[seat].progress.push(a.card);
        C.log(s, 'progress.spy.card', { seat, victim: st.target, card: a.card }, [seat, st.target], { k: 'progress.spy', p: { seat, victim: st.target } });
      }
      s.steps.shift();
      return true;
    }
    case 'masterMerchant': {
      need(a.t === 'masterTake' && seat === st.seat, 'pending');
      if (a.t !== 'masterTake') return true;
      const want = Math.min(2, handTotal(s.players[st.target].hand));
      need(C.validHandPart(a.cards) && handTotal(a.cards) === want, 'badArg');
      C.moveCards(s, st.target, seat, a.cards);
      C.log(s, 'progress.master.cards', { seat, victim: st.target, cards: C.handText(a.cards) }, [seat, st.target], { k: 'progress.master', p: { seat, victim: st.target, n: want } });
      s.steps.shift();
      return true;
    }
    case 'give': {
      need(a.t === 'give' && st.waiting[seat], 'pending');
      if (a.t !== 'give') return true;
      need(C.validHandPart(a.cards) && handTotal(a.cards) === st.waiting[seat], 'badArg');
      C.moveCards(s, seat, st.to, a.cards);
      C.log(s, 'progress.give.cards', { seat, to: st.to, cards: C.handText(a.cards) }, [seat, st.to], { k: 'progress.give', p: { seat, to: st.to, n: st.waiting[seat] } });
      delete st.waiting[seat];
      if (!Object.keys(st.waiting).length) s.steps.shift();
      return true;
    }
    case 'harborOffer': {
      need(a.t === 'harborOffer' && seat === st.seat, 'pending');
      if (a.t !== 'harborOffer') return true;
      const offers: Record<number, Resource> = {};
      const used: Partial<Hand> = {};
      for (const [k, r] of Object.entries(a.offers)) {
        const t = Number(k);
        need(st.targets.includes(t) && isResource(r), 'badArg');
        used[r] = (used[r] ?? 0) + 1;
        if (COMMODITIES.some((c) => s.players[t].hand[c] > 0)) offers[t] = r;
      }
      need(C.hasCards(s.players[seat].hand, used), 'cards');
      s.steps.shift();
      if (Object.keys(offers).length) s.steps.unshift({ k: 'harborReply', seat, offers });
      return true;
    }
    case 'harborReply': {
      need(a.t === 'harborReply' && st.offers[seat] !== undefined, 'pending');
      if (a.t !== 'harborReply') return true;
      need(isCommodity(a.card) && s.players[seat].hand[a.card] > 0, 'illegal');
      const r = st.offers[seat];
      if (s.players[st.seat].hand[r] > 0) {
        C.moveCards(s, st.seat, seat, { [r]: 1 });
        C.moveCards(s, seat, st.seat, { [a.card]: 1 });
        C.log(s, 'progress.harbor', { seat: st.seat, with: seat });
      }
      delete st.offers[seat];
      if (!Object.keys(st.offers).length) s.steps.shift();
      return true;
    }
    default:
      return false;
  }
}

export function isGuildAction(a: Action): boolean {
  return ['improve', 'recruit', 'activate', 'promote', 'knightMove', 'chase', 'playProgress'].includes(a.t);
}

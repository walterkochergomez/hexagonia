// Reductor principal: crea partidas y aplica acciones. El anfitrión es la única fuente de verdad.
import { Rng, seedRng } from './rng';
import { seaMap, shireMap, standardMap, expeditionMap } from './maps';
import * as C from './core';
import * as Guild from './guilds';
import * as Harbor from './mods/harbor';
import * as Chron from './mods/chronicle';
import * as Duel from './mods/duel';
import * as Fish from './mods/fish';
import * as River from './mods/river';
import * as Caravan from './mods/caravan';
import * as Tribe from './mods/tribe';
import * as Looms from './mods/looms';
import * as Bastions from './mods/bastions';
import * as Works from './mods/works';
import * as Raid from './mods/raid';
import * as Gold from './mods/gold';
import * as Traders from './mods/traders';
import * as X from './mods/expedition';
import {
  CARDS, COST, EVENT_FACES, GameError, PROGRESS_DECKS, RESOURCES, SEA_SPECIAL, SHIRES, TERRAIN_COMMODITY, TERRAIN_RESOURCE, TRACKS,
  emptyHand, handTotal, isCard, isResource,
  type Action, type DevType, type GameState, type Hand, type PlayerState, type ProgressType, type SeaScenario,
  type Settings, type Step, type Track,
} from './types';

export interface SeatInfo { name: string; color: number }

const need = (cond: unknown, code: string): void => {
  if (!cond) throw new GameError(code);
};

const SHIRE_VP: Record<string, number> = { fishers: 10, rivers: 10, caravans: 12, raid: 12, traders: 13 };

export function defaultVp(o: Pick<Settings, 'openSea' | 'scenario' | 'guilds' | 'harbormaster' | 'shire' | 'expedition'>): number {
  const sea: Record<SeaScenario, number> = { islands: 13, archipelago: 12, fog: 12, desert: 12, newWorld: 12, tribe: 13, looms: 14, bastions: 10, works: 10 };
  let vp = 10;
  if (o.openSea && o.guilds) vp = sea[o.scenario] + 2;
  else if (o.openSea) vp = sea[o.scenario];
  else if (o.guilds) vp = 13;
  if (o.shire) vp = SHIRE_VP[o.shire];
  // expediciones: 10 y uno más por misión
  if (o.expedition) vp = 10 + Number(!!o.expedition.fish) + Number(!!o.expedition.spice) + Number(!!o.expedition.lairs);
  if (o.harbormaster) vp += 1;
  return vp;
}

/** Deja sólo combinaciones válidas (la sala ya las ofrece así, pero el motor no confía). */
export function normalizeSettings(st: Settings): Settings {
  const s: Settings = { ...st, shire: st.shire && SHIRES.includes(st.shire) ? st.shire : null, harbormaster: !!st.harbormaster, chronicle: !!st.chronicle, duel: !!st.duel };
  if (s.shire) {
    s.openSea = false;
    s.guilds = false;
  }
  // expediciones: un modo aparte, sin Mar Abierto, Gremios ni escenarios de Comarcas
  const xp = st.expedition;
  s.expedition = xp ? { fish: !!xp.fish, spice: !!xp.spice, lairs: !!xp.lairs } : null;
  if (s.expedition) {
    s.openSea = false;
    s.guilds = false;
    s.shire = null;
  }
  // los escenarios con reglas especiales no se combinan con Gremios
  if (s.openSea && SEA_SPECIAL.includes(s.scenario)) s.guilds = false;
  if (s.guilds) s.chronicle = false;
  if (s.seats !== 2 || s.openSea || s.guilds || s.shire || s.expedition) s.duel = false;
  return s;
}

export function createGame(input: Settings, seats: SeatInfo[]): GameState {
  const n = seats.length;
  need(n >= 2 && n <= 6, 'seats');
  const settings = normalizeSettings({ ...input, seats: n });
  const big = n > 4;
  const rng = new Rng(seedRng(settings.seed));
  const map = settings.expedition ? expeditionMap(rng, big, settings.expedition)
    : settings.shire ? shireMap(rng, settings.shire, big) : settings.openSea ? seaMap(rng, settings.scenario, big) : standardMap(rng, big);
  const resN = big ? 24 : 19;
  const comN = settings.guilds ? (big ? 15 : 12) : 0;
  const bank: Hand = { lumber: resN, brick: resN, wool: resN, grain: resN, ore: resN, paper: comN, cloth: comN, coin: comN };
  const devDeck: DevType[] = [];
  const bastions = settings.openSea && settings.scenario === 'bastions';
  const traders = settings.shire === 'traders';
  // la invasión trae su propio mazo
  if (!settings.guilds && settings.shire !== 'raid') {
    const add = (t: DevType, k: number) => { for (let i = 0; i < k; i++) devDeck.push(t); };
    // en los bastiones no hay cartas de punto: son soldiers que arman barcos
    if (traders) {
      // carretas: caballeros que mueven bárbaros, caminos, viaje rápido y puntos
      add('soldier', big ? 19 : 15);
      add('roads', big ? 4 : 3);
      add('haul', big ? 4 : 3);
      add('point', 3);
    } else {
      add('soldier', (big ? 20 : 14) + (bastions ? 5 : 0));
      add('point', bastions ? 0 : 5);
      add('roads', big ? 3 : 2);
      add('plenty', big ? 3 : 2);
      add('monopoly', big ? 3 : 2);
    }
    rng.shuffle(devDeck);
  }
  const progress: Record<Track, ProgressType[]> = { science: [], trade: [], politics: [] };
  if (settings.guilds) {
    for (const t of TRACKS) {
      for (const [card, k] of PROGRESS_DECKS[t]) for (let i = 0; i < k; i++) progress[t].push(card);
      rng.shuffle(progress[t]);
    }
  }
  const first = rng.int(n);
  const order = Array.from({ length: n }, (_, i) => (first + i) % n);
  // aldeas tejedoras: una tercera ronda de preparación, otra vez en el orden del primero
  const setupOrder = [...order, ...[...order].reverse(), ...(settings.openSea && settings.scenario === 'looms' ? order : [])];
  const players: PlayerState[] = seats.map((p, i) => ({
    seat: i, name: p.name, color: p.color, hand: emptyHand(), dev: [], devPlayedTurn: -1, soldiers: 0,
    progress: [], vpCards: [], improvements: { science: 0, trade: 0, politics: 0 }, defender: 0, bonus: [], homeRegions: [],
  }));
  const vpTarget = settings.vpTarget > 0 ? settings.vpTarget : defaultVp(settings);
  const s: GameState = {
    v: 0,
    settings: { ...settings, seats: n, vpTarget },
    board: {
      hexes: map.hexes, harbors: map.harbors,
      robber: settings.guilds ? null : map.robber,
      pirate: null, merchant: null, robberStart: map.robber,
      homeRegions: map.homeRegions, regionBonus: map.regionBonus, regionNames: map.regionNames,
    },
    hidden: { fog: map.fog, devDeck, progress, rng: rng.s },
    buildings: {}, roads: {}, ships: {}, knights: {},
    players, bank,
    decks: { dev: 0, science: 0, trade: 0, politics: 0 },
    turn: {
      n: 0, current: first, phase: 'setup', setupOrder, setupIndex: 0,
      setupAwait: 'building', setupVertex: null, dice: null, event: null, shipMoved: [], builtShips: [],
      sbpOrder: [], sbpIndex: 0, partner: null, fleet: null, alchemist: null,
    },
    steps: [], trade: null, tradeSeq: 0,
    awards: { road: { owner: null, len: 0 }, army: { owner: null, size: 0 } },
    barbarians: { pos: 0, attacks: 0, last: null },
    metropolis: { science: null, trade: null, politics: null },
    log: [], stats: { rolls: Array(13).fill(0), turns: 0 }, winner: null,
  };
  if (settings.harbormaster) s.awards.harbor = { owner: null, pts: 0 };
  if (settings.chronicle) {
    s.hidden.chronicle = Chron.newDeck(rng);
    s.chronicle = { left: s.hidden.chronicle.length, last: null };
  }
  if (settings.duel) Duel.setup(s, rng);
  if (settings.shire === 'fishers') Fish.setup(s, rng);
  if (settings.shire === 'rivers') River.setup(s, rng);
  if (settings.shire === 'caravans') Caravan.setup(s);
  if (settings.shire === 'raid') Raid.setup(s, rng, map.marks!.rock![0], map.marks!.loop!);
  if (traders) Traders.setup(s, rng);
  if (settings.expedition) X.setup(s, map.marks!.council!, map.marks!.xmarks ?? {});
  if (settings.openSea) {
    const m = map.marks ?? {};
    if (settings.scenario === 'tribe') Tribe.setup(s, rng, m.isles ?? []);
    if (settings.scenario === 'looms') Looms.setup(s, rng, m.isles ?? []);
    if (bastions) Bastions.setup(s, rng, m);
    if (settings.scenario === 'works') Works.setup(s, m);
  }
  s.hidden.rng = rng.s;
  s.decks = C.decksOf(s);
  C.log(s, 'game.start', { seat: first });
  return s;
}

export function applyAction(state: GameState, seat: number, a: Action): GameState {
  need(state.winner === null, 'over');
  need(seat >= 0 && seat < state.players.length, 'seat');
  const s = structuredClone(state);
  const rng = new Rng(s.hidden.rng);
  const st = s.steps[0];
  if (st && st.k !== 'produce') handleStep(s, seat, a, st, rng);
  else handle(s, seat, a, rng);
  settle(s, rng);
  s.decks = C.decksOf(s);
  s.v++;
  return s;
}

// ---------- flujo ----------

function settle(s: GameState, rng: Rng) {
  for (let guard = 0; guard < 100; guard++) {
    const st = s.steps[0];
    if (!st) break;
    if (st.k === 'produce') {
      s.steps.shift();
      produce(s, rng);
      continue;
    }
    if (st.k === 'duelRoll') {
      s.steps.shift();
      secondRoll(s, rng);
      continue;
    }
    if (st.k === 'fleet') {
      s.steps.shift();
      Bastions.sail(s, rng);
      continue;
    }
    if (stepDone(s, st)) {
      s.steps.shift();
      continue;
    }
    break;
  }
  Harbor.updateHarborAward(s);
  checkVictory(s);
}

function stepDone(s: GameState, st: Step): boolean {
  switch (st.k) {
    case 'discard':
    case 'progressLimit':
    case 'give':
      return !Object.keys(st.waiting).length;
    case 'pick':
      return !Object.keys(st.waiting).length || RESOURCES.every((r) => s.bank[r] === 0);
    case 'pillage':
    case 'defenderPick':
      return !st.waiting.length || (st.k === 'defenderPick' && TRACKS.every((t) => !s.hidden.progress[t].length));
    case 'harborReply':
      return !Object.keys(st.offers).length;
    case 'quake':
      return !st.waiting.length;
    case 'gift':
      // quien ya no tiene qué dar queda libre
      for (const k of Object.keys(st.waiting)) {
        const h = s.players[Number(k)].hand;
        if ((st.reason === 'force' ? handTotal(h) : C.resourcesIn(h)) < st.waiting[Number(k)]) delete st.waiting[Number(k)];
      }
      return !Object.keys(st.waiting).length;
    case 'neutral':
      return !Duel.neutralSpots(s, st.what).length;
    case 'camelBid':
      return !st.waiting.length;
    case 'camelPlace':
      return !Caravan.legalCamels(s).length;
    case 'placeHarbor':
      return Tribe.stuck(s, st);
    case 'raidKnight':
      return !Raid.knightSpots(s, st.anywhere).length || Raid.knightsLeft(s, st.seat) <= 0;
    case 'raidTake':
      return !s.raid!.coast.some((h) => Raid.barbsOn(s, h) > 0);
    case 'raidShift':
      return Raid.shiftDone(s, st);
    case 'barbMove':
      return !s.traders?.barbs.length;
    case 'steal':
      return !st.from.length;
    case 'freeRoutes':
      return st.left <= 0 || !freeOptions(s, st.seat, st.source).length;
    case 'robber':
      return !st.robber && !C.legalPirateHexes(s).length;
    default:
      return false;
  }
}

function freeOptions(s: GameState, seat: number, source: string): string[] {
  const left = C.piecesLeft(s, seat);
  const roads = left.road > 0 ? C.legalRoads(s, seat) : [];
  const ships = source !== 'diplomat' && left.ship > 0 ? C.legalShips(s, seat) : [];
  return [...roads, ...ships];
}

function checkVictory(s: GameState) {
  if (s.winner !== null || s.turn.phase === 'setup') return;
  const declare = (c: number) => {
    s.winner = c;
    s.turn.phase = 'over';
    s.steps = [];
    s.trade = null;
    C.log(s, 'win', { seat: c, vp: C.vpOf(s, c) });
  };
  const cands = [s.turn.current];
  const partner = C.pairedPartner(s);
  if (partner !== null) cands.push(partner);
  for (const c of cands) {
    if (wins(s, c)) {
      declare(c);
      return;
    }
  }
  // aldeas tejedoras: también termina cuando quedan pocas aldeas con telas
  if (Looms.exhausted(s)) {
    C.log(s, 'looms.over');
    declare(Looms.leader(s));
  }
}

function wins(s: GameState, c: number): boolean {
  if (s.works) return Works.wins(s, c);
  return C.vpOf(s, c) >= C.targetOf(s, c) && (!s.bastions || Bastions.taken(s, c));
}

/** ¿Se puede mover el pirata? (no hay en las obras ni en los bastiones; en las aldeas, sólo quien ya llegó a una) */
const pirateOk = (s: GameState, seat: number) => (s.settings.openSea || !!s.expedition) && !s.works && !s.bastions && (!s.looms || Looms.linked(s, seat));

function nextTurn(s: GameState) {
  const t = s.turn;
  const vote = !!s.caravan && !!t.built;
  do t.current = (t.current + 1) % s.players.length;
  while (s.players[t.current].neutral);
  t.n++;
  t.phase = 'preRoll';
  t.dice = null;
  t.event = null;
  t.rolls = [];
  t.card = null;
  t.cards = [];
  t.plague = false;
  t.tokenUsed = false;
  t.coinTrades = 0;
  t.goldBuys = 0;
  Traders.newTurn(s);
  X.newTurn(s);
  t.built = false;
  t.shipMoved = [];
  t.builtShips = [];
  t.partner = null;
  t.sbpOrder = [];
  t.sbpIndex = 0;
  t.fleet = null;
  t.alchemist = null;
  s.trade = null;
  s.stats.turns++;
  C.log(s, 'turn.start', { seat: t.current });
  if (vote) Caravan.startVote(s);
}

function finishSetup(s: GameState) {
  for (const p of s.players) {
    if (s.board.homeRegions) {
      p.homeRegions = [...s.board.homeRegions];
    } else {
      const regs = new Set<number>();
      for (const [v, b] of Object.entries(s.buildings)) if (b.owner === p.seat) for (const r of C.regionsOfVertex(s, v)) regs.add(r);
      p.homeRegions = [...regs];
    }
  }
  s.turn.phase = 'preRoll';
  s.turn.current = s.turn.setupOrder[0];
  s.turn.n = 1;
  Traders.newTurn(s); // las carretas salen con su movimiento
  X.startShips(s); // expediciones: un barco para cada uno junto al Consejo
  s.stats.turns = 1;
  C.updateRoadAward(s);
  C.log(s, 'turn.start', { seat: s.turn.current });
}

// ---------- producción ----------

function produce(s: GameState, rng: Rng) {
  void rng;
  const [d1, d2] = s.turn.dice!;
  const total = d1 + d2;
  if (total === 7) {
    seven(s);
    return;
  }
  if (s.turn.plague) C.log(s, 'chronicle.plague');
  const n = s.players.length;
  const gains: Hand[] = Array.from({ length: n }, emptyHand);
  const gold: Record<number, number> = {};
  const g = C.G(s);
  for (const [id, h] of Object.entries(s.board.hexes)) {
    if (h.number !== total || id === s.board.robber || !C.isLandTerrain(h.terrain) || h.terrain === 'desert') continue;
    if (s.raid && C.raidConquered(s, id)) continue; // casilla tomada por los bárbaros
    for (const v of g.hexes[id].vertices) {
      const b = s.buildings[v];
      if (!b || s.players[b.owner].neutral) continue;
      const city = b.kind === 'city' && !b.damaged && !s.turn.plague;
      if (h.terrain === 'gold') {
        gold[b.owner] = (gold[b.owner] ?? 0) + (city ? 2 : 1);
        continue;
      }
      const res = TERRAIN_RESOURCE[h.terrain]!;
      const com = TERRAIN_COMMODITY[h.terrain];
      if (city && s.settings.guilds && com) {
        gains[b.owner][res] += 1;
        gains[b.owner][com] += 1;
      } else {
        gains[b.owner][res] += city ? 2 : 1;
      }
    }
  }
  // escasez del banco: si no alcanza para todos, nadie cobra (salvo que afecte a uno solo)
  for (const c of CARDS) {
    const demand = gains.reduce((a, h) => a + h[c], 0);
    if (!demand || demand <= s.bank[c]) continue;
    const who = gains.map((h, i) => (h[c] > 0 ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < n; i++) {
      if (who.length === 1 && who[0] === i) gains[i][c] = s.bank[c];
      else gains[i][c] = 0;
    }
    C.log(s, 'bank.short', { card: c });
  }
  const received: boolean[] = [];
  for (let i = 0; i < n; i++) {
    let got = 0;
    for (const c of CARDS) got += C.gain(s, i, c, gains[i][c]);
    received[i] = got > 0 || (gold[i] ?? 0) > 0;
    if (got) C.log(s, 'produce', { seat: i, cards: C.handText(gains[i]) });
  }
  Fish.produce(s, total);
  Looms.produce(s, total);
  const steps: Step[] = [];
  if (Object.keys(gold).length) steps.push({ k: 'pick', reason: 'gold', waiting: gold });
  if (s.settings.guilds) {
    const aq: Record<number, number> = {};
    for (const p of s.players) if (p.improvements.science >= 3 && !received[p.seat]) aq[p.seat] = 1;
    if (Object.keys(aq).length) steps.push({ k: 'pick', reason: 'aqueduct', waiting: aq });
  }
  s.steps.unshift(...steps);
  s.turn.plague = false;
}

/** Tirar (o sacar carta de sucesos): registra, resuelve el suceso y deja la producción en la cola. */
function rollOnce(s: GameState, rng: Rng, seat: number, avoid?: number) {
  const t = s.turn;
  let d1: number, d2: number;
  if (s.settings.chronicle) {
    const card = Chron.draw(s, rng, avoid);
    [d1, d2] = Chron.diceOf(card.n);
    t.card = card;
    t.cards = [...(t.cards ?? []), card];
    t.dice = [d1, d2];
    s.stats.rolls[card.n]++;
    C.log(s, 'roll.card', { seat, n: card.n, ev: card.ev ?? null });
    if (s.bastions && s.bastions.fleet !== null) s.steps.push({ k: 'fleet' });
    s.steps.push(...Chron.resolve(s, card));
  } else {
    do {
      d1 = rng.die();
      d2 = rng.die();
    } while (avoid !== undefined && d1 + d2 === avoid);
    if (t.alchemist) {
      [d1, d2] = t.alchemist;
      t.alchemist = null;
    }
    t.dice = [d1, d2];
    s.stats.rolls[d1 + d2]++;
    // la flota corsaria se mueve antes que todo lo demás
    if (s.bastions && s.bastions.fleet !== null) s.steps.push({ k: 'fleet' });
    if (s.settings.guilds) {
      const face = rng.pick(EVENT_FACES);
      t.event = face;
      C.log(s, 'roll', { seat, d1, d2, event: face });
      Guild.resolveEvent(s, face, d1);
    } else {
      C.log(s, 'roll', { seat, d1, d2 });
    }
  }
  t.rolls = [...(t.rolls ?? []), t.dice!];
  s.steps.push({ k: 'produce' });
}

/** Duelo: la segunda tirada del turno, con un resultado distinto de la primera. */
function secondRoll(s: GameState, rng: Rng) {
  const first = s.turn.rolls?.[0];
  rollOnce(s, rng, s.turn.current, first ? first[0] + first[1] : undefined);
}

function seven(s: GameState) {
  const waiting: Record<number, number> = {};
  for (const p of s.players) {
    const tot = handTotal(p.hand);
    if (tot > C.handLimit(s, p.seat)) waiting[p.seat] = Math.floor(tot / 2);
  }
  const steps: Step[] = [];
  if (Object.keys(waiting).length) steps.push({ k: 'discard', reason: 'seven', waiting });
  if (s.bastions || s.raid) {
    // sin ladrón: quien tira le roba una carta a quien quiera
    const from = s.players.filter((p) => p.seat !== s.turn.current && !p.neutral && handTotal(p.hand) > 0).map((p) => p.seat);
    if (from.length) steps.push({ k: 'steal', seat: s.turn.current, hex: '', on: 'event', from });
  } else if (s.traders) steps.push({ k: 'barbMove', seat: s.turn.current, from: null, steal: true });
  else if (C.robberActive(s)) steps.push({ k: 'robber', seat: s.turn.current, robber: true, pirate: pirateOk(s, s.turn.current), mode: 'steal1' });
  else C.log(s, 'seven.calm');
  s.steps.unshift(...steps);
}

function stealRandom(s: GameState, rng: Rng, thief: number, victim: number) {
  const card = C.randomCard(s.players[victim].hand, rng.float());
  if (!card) return;
  C.moveCards(s, victim, thief, { [card]: 1 });
  C.log(s, 'steal.card', { seat: thief, victim, card }, [thief, victim], { k: 'steal', p: { seat: thief, victim } });
}

// ---------- construcción ----------

function revealAround(s: GameState, seat: number, e: string) {
  if (!Object.keys(s.hidden.fog).length) return;
  const g = C.G(s);
  const ed = g.edges[e];
  for (const v of [ed.a, ed.b]) {
    for (const h of g.vertices[v].hexes) {
      const f = s.hidden.fog[h];
      if (!f) continue;
      s.board.hexes[h] = { ...s.board.hexes[h], terrain: f.terrain, number: f.number };
      delete s.hidden.fog[h];
      X.onReveal(s, h);
      C.log(s, 'fog.reveal', { seat, terrain: f.terrain });
      const res = TERRAIN_RESOURCE[f.terrain];
      if (res) C.gain(s, seat, res, 1);
      else if (f.terrain === 'gold') s.steps.push({ k: 'pick', reason: 'fog', waiting: { [seat]: 1 } });
    }
  }
}

function regionBonus(s: GameState, seat: number, v: string) {
  if ((!s.settings.openSea && !s.expedition) || !s.board.regionBonus) return;
  const p = s.players[seat];
  for (const r of C.regionsOfVertex(s, v)) {
    if (p.homeRegions.includes(r) || p.bonus.some((b) => b.id === r)) continue;
    p.bonus.push({ kind: s.board.regionNames[r] === 'far' ? 'region' : 'island', id: r, vp: s.board.regionBonus });
    C.log(s, 'bonus.region', { seat, vp: s.board.regionBonus });
  }
}

function placeRoute(s: GameState, seat: number, e: string, ship: boolean, free: boolean) {
  const left = C.piecesLeft(s, seat);
  if (ship) {
    need(s.settings.openSea && left.ship > 0, 'noPieces');
    need(C.canShip(s, seat, e), 'illegal');
    if (!free) C.pay(s, seat, COST.ship);
    s.ships[e] = { owner: seat };
    s.turn.builtShips.push(e);
    Tribe.afterShip(s, seat, e);
    Looms.afterShip(s, seat, e);
  } else {
    need(left.road > 0, 'noPieces');
    need(C.canRoad(s, seat, e), 'illegal');
    if (!free) C.pay(s, seat, COST.road);
    s.roads[e] = { owner: seat };
  }
  C.log(s, ship ? 'build.ship' : 'build.road', { seat });
  revealAround(s, seat, e);
  C.updateRoadAward(s);
  if (!ship) {
    River.afterRoad(s, seat, e);
    Duel.afterBuild(s, seat, 'road');
  }
}

function build(s: GameState, seat: number, what: string, at: string, rng: Rng) {
  const left = C.piecesLeft(s, seat);
  switch (what) {
    case 'road':
    case 'ship':
      placeRoute(s, seat, at, what === 'ship', false);
      return;
    case 'settlement': {
      need(left.settlement > 0, 'noPieces');
      need(!Object.values(s.buildings).some((b) => b.owner === seat && b.damaged), 'repairFirst');
      need(C.canSettle(s, seat, at), 'illegal');
      C.pay(s, seat, COST.settlement);
      s.buildings[at] = { owner: seat, kind: 'settlement' };
      C.log(s, 'build.settlement', { seat });
      regionBonus(s, seat, at);
      C.updateRoadAward(s);
      Duel.earnForSettlement(s, seat, at);
      Duel.afterBuild(s, seat, 'settlement');
      River.afterSettlement(s, seat, at);
      Tribe.offerHeld(s, seat);
      Raid.land(s, rng, seat);
      s.turn.built = true;
      return;
    }
    case 'city': {
      need(C.canCity(s, seat, at), 'illegal');
      const b = s.buildings[at];
      if (!b.damaged) need(left.city > 0, 'noPieces');
      C.pay(s, seat, COST.city);
      b.kind = 'city';
      delete b.damaged;
      C.log(s, 'build.city', { seat });
      Raid.land(s, rng, seat);
      s.turn.built = true;
      return;
    }
    case 'repair': {
      const r = s.roads[at];
      need(r && r.owner === seat && r.broken, 'illegal');
      C.pay(s, seat, COST.road);
      delete r.broken;
      C.log(s, 'road.repair', { seat });
      C.updateRoadAward(s);
      return;
    }
    case 'wall': {
      need(s.settings.guilds && left.wall > 0, 'noPieces');
      const b = s.buildings[at];
      need(b && b.owner === seat && b.kind === 'city' && !b.damaged && !b.wall, 'illegal');
      C.pay(s, seat, COST.wall);
      b.wall = true;
      C.log(s, 'build.wall', { seat });
      return;
    }
    default:
      throw new GameError('badAction');
  }
}

// ---------- acciones ----------

const BUILD_PHASES = ['main', 'specialBuild', 'paired'];
const ACTION_PHASES = ['main', 'paired'];

function handle(s: GameState, seat: number, a: Action, rng: Rng) {
  const t = s.turn;
  const actor = C.actorOf(s);
  switch (a.t) {
    case 'setupBuild': {
      need(t.phase === 'setup' && seat === actor && t.setupAwait === 'building', 'notYourTurn');
      need(C.setupVertexOk(s, a.vertex), 'illegal');
      const round = Math.floor(t.setupIndex / s.players.length);
      const lastRound = round === t.setupOrder.length / s.players.length - 1;
      // con Gremios, en la invasión y en las carretas, la segunda colocación es una ciudad
      const kind = (s.settings.guilds || s.raid || s.traders || s.expedition) && round === 1 ? 'city' : 'settlement';
      s.buildings[a.vertex] = { owner: seat, kind };
      C.log(s, 'setup.build', { seat, kind });
      if (kind === 'city') Traders.placeWagon(s, seat, a.vertex);
      // los recursos iniciales los da el último edificio de la preparación
      if (lastRound) {
        let picks = 0;
        const got = emptyHand();
        for (const h of C.G(s).vertices[a.vertex].hexes) {
          const tr = s.board.hexes[h].terrain;
          if (tr === 'gold') picks++;
          else if (C.isLandTerrain(tr) && TERRAIN_RESOURCE[tr]) got[TERRAIN_RESOURCE[tr]!] += C.gain(s, seat, TERRAIN_RESOURCE[tr]!, 1);
        }
        if (handTotal(got)) C.log(s, 'produce', { seat, cards: C.handText(got) });
        if (picks) s.steps.push({ k: 'pick', reason: 'gold', waiting: { [seat]: picks } });
        Fish.setupBonus(s, seat, a.vertex);
      }
      if (kind === 'settlement') River.afterSettlement(s, seat, a.vertex);
      t.setupVertex = a.vertex;
      t.setupAwait = 'route';
      return;
    }
    case 'setupRoute': {
      need(t.phase === 'setup' && seat === actor && t.setupAwait === 'route' && t.setupVertex, 'notYourTurn');
      need(C.setupRouteOk(s, t.setupVertex!, a.edge, !!a.ship), 'illegal');
      if (a.ship) s.ships[a.edge] = { owner: seat };
      else s.roads[a.edge] = { owner: seat };
      C.log(s, a.ship ? 'build.ship' : 'build.road', { seat });
      if (!a.ship) River.afterRoad(s, seat, a.edge);
      else {
        Tribe.afterShip(s, seat, a.edge);
        Looms.afterShip(s, seat, a.edge);
      }
      revealAround(s, seat, a.edge);
      t.setupIndex++;
      t.setupAwait = 'building';
      t.setupVertex = null;
      if (t.setupIndex >= t.setupOrder.length) finishSetup(s);
      return;
    }
    case 'roll': {
      need(t.phase === 'preRoll' && seat === t.current, 'notYourTurn');
      t.phase = 'main';
      t.rolls = [];
      t.cards = [];
      rollOnce(s, rng, seat);
      if (Duel.isDuel(s)) s.steps.push({ k: 'duelRoll' });
      return;
    }
    case 'endTurn':
      endTurn(s, seat, rng);
      return;
    case 'build': {
      need(BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      build(s, seat, a.what, a.at, rng);
      return;
    }
    case 'moveShip': {
      need(ACTION_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      need(!t.shipMoved.includes(seat), 'shipMoved');
      need(C.movableShips(s, seat).includes(a.from), 'illegal');
      need(C.shipTargets(s, seat, a.from).includes(a.to), 'illegal');
      delete s.ships[a.from];
      s.ships[a.to] = { owner: seat };
      t.shipMoved.push(seat);
      C.log(s, 'ship.move', { seat });
      revealAround(s, seat, a.to);
      Tribe.afterShip(s, seat, a.to);
      Looms.afterShip(s, seat, a.to);
      C.updateRoadAward(s);
      return;
    }
    case 'buyDev': {
      need(!s.settings.guilds, 'badAction');
      need(BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      if (s.raid) {
        // invasión: la carta se resuelve al comprarla
        C.pay(s, seat, COST.dev);
        Raid.draw(s, seat, rng);
        return;
      }
      // bastiones: los soldados jugados vuelven al mazo cuando se acaba
      if (!s.hidden.devDeck.length && s.hidden.devDiscard?.length) {
        s.hidden.devDeck = rng.shuffle(s.hidden.devDiscard);
        s.hidden.devDiscard = [];
      }
      need(s.hidden.devDeck.length > 0, 'emptyDeck');
      C.pay(s, seat, COST.dev);
      const card = s.hidden.devDeck.shift()!;
      s.players[seat].dev.push({ type: card, turn: t.n });
      C.log(s, 'dev.buy.card', { seat, card }, [seat], { k: 'dev.buy', p: { seat } });
      return;
    }
    case 'playDev': {
      need(!s.settings.guilds, 'badAction');
      const ok = ((t.phase === 'preRoll' || t.phase === 'main') && seat === t.current) || (t.phase === 'paired' && seat === t.partner);
      need(ok, 'notYourTurn');
      const p = s.players[seat];
      need(p.devPlayedTurn !== t.n, 'oneDevPerTurn');
      const idx = p.dev.findIndex((d) => d.type === a.card && d.turn !== t.n);
      need(idx >= 0, 'noCard');
      // bastiones: el soldado arma un barco de la ruta (hace falta uno sin armar)
      if (a.card === 'soldier' && s.bastions) need(Bastions.canArm(s, seat), 'noShipToArm');
      p.dev.splice(idx, 1);
      p.devPlayedTurn = t.n;
      C.log(s, 'dev.play', { seat, card: a.card });
      if (a.card === 'soldier' && s.bastions) {
        Bastions.arm(s, seat);
        s.hidden.devDiscard = [...(s.hidden.devDiscard ?? []), 'soldier'];
      } else if (a.card === 'soldier' && s.traders) {
        // carretas: el caballero mueve un bárbaro (y roba si cae en un camino ajeno)
        s.steps.unshift({ k: 'barbMove', seat, from: null, steal: true });
      } else if (a.card === 'haul') {
        Traders.haul(s, seat);
      } else if (a.card === 'soldier') {
        p.soldiers++;
        C.updateArmyAward(s);
        s.steps.unshift({ k: 'robber', seat, robber: true, pirate: pirateOk(s, seat), mode: 'steal1' });
      } else if (a.card === 'roads') {
        s.steps.unshift({ k: 'freeRoutes', seat, left: 2, source: 'dev' });
      } else if (a.card === 'plenty') {
        s.steps.unshift({ k: 'pick', reason: 'plenty', waiting: { [seat]: 2 } });
      } else if (a.card === 'monopoly') {
        s.steps.unshift({ k: 'monopoly', seat });
      }
      return;
    }
    case 'offer': {
      need(t.phase === 'main' && seat === t.current, 'notYourTurn');
      need(C.validHandPart(a.give) && C.validHandPart(a.want), 'badArg');
      need(handTotal(a.give) > 0 && handTotal(a.want) > 0, 'emptyTrade');
      need(!CARDS.some((c) => (a.give[c] ?? 0) > 0 && (a.want[c] ?? 0) > 0), 'sameCard');
      need(C.hasCards(s.players[seat].hand, a.give), 'cards');
      const others = s.players.map((p) => p.seat).filter((x) => x !== seat);
      const to = a.to?.length ? a.to.filter((x) => others.includes(x)) : others;
      need(to.length > 0, 'badArg');
      s.trade = { id: ++s.tradeSeq, from: seat, give: clean(a.give), want: clean(a.want), to, replies: {} };
      C.log(s, 'trade.offer', { seat, give: C.handText(a.give), want: C.handText(a.want) });
      return;
    }
    case 'reply': {
      const tr = s.trade;
      need(tr && tr.id === a.id && tr.to.includes(seat), 'noTrade');
      if (a.status === 'accept') need(C.hasCards(s.players[seat].hand, tr!.want), 'cards');
      tr!.replies[seat] = { status: a.status };
      return;
    }
    case 'counter': {
      const tr = s.trade;
      need(tr && tr.id === a.id && tr.to.includes(seat), 'noTrade');
      need(C.validHandPart(a.give) && C.validHandPart(a.want) && handTotal(a.give) > 0 && handTotal(a.want) > 0, 'emptyTrade');
      need(!CARDS.some((c) => (a.give[c] ?? 0) > 0 && (a.want[c] ?? 0) > 0), 'sameCard');
      need(C.hasCards(s.players[seat].hand, a.give), 'cards');
      tr!.replies[seat] = { status: 'counter', give: clean(a.give), want: clean(a.want) };
      return;
    }
    case 'confirmTrade': {
      const tr = s.trade;
      need(tr && tr.id === a.id && tr.from === seat && t.phase === 'main' && seat === t.current, 'noTrade');
      const r = tr!.replies[a.with];
      need(r && r.status !== 'decline', 'noTrade');
      const fromGives = r!.status === 'counter' ? r!.want! : tr!.give;
      const withGives = r!.status === 'counter' ? r!.give! : tr!.want;
      need(C.hasCards(s.players[seat].hand, fromGives) && C.hasCards(s.players[a.with].hand, withGives), 'cards');
      C.moveCards(s, seat, a.with, fromGives);
      C.moveCards(s, a.with, seat, withGives);
      C.log(s, 'trade.done', { seat, with: a.with, give: C.handText(fromGives), get: C.handText(withGives) });
      s.trade = null;
      return;
    }
    case 'cancelTrade': {
      need(s.trade && s.trade.from === seat, 'noTrade');
      s.trade = null;
      return;
    }
    case 'bank': {
      need(ACTION_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      need(isCard(a.give) && isCard(a.get) && a.give !== a.get, 'badArg');
      if (!s.settings.guilds) need(isResource(a.give) && isResource(a.get), 'badArg');
      need(Number.isInteger(a.count) && a.count >= 1 && a.count <= 20, 'badArg');
      const ratio = C.ratioFor(s, seat, a.give);
      need(s.bank[a.get] >= a.count, 'bankEmpty');
      C.pay(s, seat, { [a.give]: ratio * a.count });
      C.gain(s, seat, a.get, a.count);
      C.log(s, 'bank', { seat, give: a.give, n: ratio * a.count, get: a.get, m: a.count });
      return;
    }
    // ---- Gremios y Guardianes ----
    case 'improve':
      need(s.settings.guilds && BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.improve(s, seat, a.track);
      return;
    case 'recruit':
      need(s.settings.guilds && BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.recruit(s, seat, a.at);
      return;
    case 'activate':
      need(s.settings.guilds && BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.activate(s, seat, a.at);
      return;
    case 'promote':
      need(s.settings.guilds && BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.promote(s, seat, a.at);
      return;
    case 'knightMove':
      need(s.settings.guilds && ACTION_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.knightMove(s, seat, a.from, a.to);
      return;
    case 'chase':
      need(s.settings.guilds && ACTION_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      Guild.chase(s, seat, a.from, a.target);
      return;
    case 'playProgress':
      need(s.settings.guilds, 'badAction');
      Guild.playProgress(s, seat, a.card, a.arg);
      return;
    // ---- Comarcas ----
    case 'token':
      Duel.useToken(s, seat, a.use, rng);
      return;
    case 'cashSoldier':
      Duel.cashSoldier(s, seat);
      return;
    case 'fish':
      Fish.spend(s, seat, a.use, rng);
      return;
    case 'passBoot':
      Fish.passBoot(s, seat, a.to);
      return;
    case 'bridge':
      need(BUILD_PHASES.includes(t.phase) && seat === actor, 'notYourTurn');
      River.buildBridge(s, seat, a.at);
      Duel.afterBuild(s, seat, 'road');
      return;
    case 'coins':
      River.tradeCoins(s, seat);
      return;
    case 'buyCoin':
      River.buyCoin(s, seat, a.give);
      return;
    // ---- Mar Abierto: escenarios especiales ----
    case 'assault': {
      Bastions.assault(s, seat, rng);
      // el ataque cierra el turno, salvo que con él gane
      if (!wins(s, seat)) endTurn(s, seat, rng);
      return;
    }
    case 'wonder':
      Works.build(s, seat, a.id);
      return;
    case 'raidMove':
      need(!!s.raid && t.phase === 'main' && seat === t.current, 'notYourTurn');
      Raid.move(s, seat, a.from, a.to, !!a.far);
      return;
    case 'wagon':
      Traders.move(s, seat, a.to);
      return;
    case 'wagonUp':
      Traders.upgrade(s, seat);
      return;
    case 'wagonBoost':
      Traders.boost(s, seat);
      return;
    case 'drive':
      Traders.drive(s, seat, a.edge, rng);
      return;
    case 'xship':
      X.buildShip(s, seat, a.at);
      return;
    case 'xload':
      X.load(s, seat, a.ship, a.what);
      return;
    case 'sail':
      X.sail(s, seat, a.ship, a.to, (e) => revealAround(s, seat, e));
      return;
    case 'found':
      need(C.piecesLeft(s, seat).settlement > 0, 'noPieces');
      X.found(s, seat, a.ship, a.at);
      regionBonus(s, seat, a.at);
      C.updateRoadAward(s);
      s.turn.built = true;
      return;
    case 'xfish':
      X.fish(s, seat, a.ship, a.hex);
      return;
    case 'xdeliver':
      X.deliver(s, seat, a.ship);
      return;
    case 'xcrew':
      X.crewTo(s, seat, a.ship, a.hex);
      return;
    case 'gold':
      Gold.buy(s, seat);
      return;
    case 'sellGold':
      Gold.sell(s, seat, a.give);
      return;
    default:
      throw new GameError('pendingOrBad');
  }
}

function clean(h: Partial<Hand>): Partial<Hand> {
  const out: Partial<Hand> = {};
  for (const c of CARDS) if ((h[c] ?? 0) > 0) out[c] = h[c];
  return out;
}

function endTurn(s: GameState, seat: number, rng: Rng) {
  const t = s.turn;
  const n = s.players.length;
  if (t.phase === 'main') {
    need(seat === t.current, 'notYourTurn');
    if (s.raid) {
      // nadie queda junto al castillo; después, las batallas contra los bárbaros
      need(!Raid.stuckAtCastle(s, seat).length, 'knightsAtCastle');
      Raid.battles(s, rng);
    }
    if (s.settings.guilds && s.players[seat].progress.length > 4) {
      s.steps.push({ k: 'progressLimit', waiting: { [seat]: s.players[seat].progress.length - 4 } });
      return;
    }
    s.trade = null;
    t.fleet = null;
    if (n >= 5 && s.settings.turnMode === 'specialBuild') {
      t.phase = 'specialBuild';
      t.sbpOrder = Array.from({ length: n - 1 }, (_, i) => (t.current + 1 + i) % n);
      t.sbpIndex = 0;
      C.log(s, 'sbp.start', { seat: t.sbpOrder[0] });
    } else if (n >= 5 && s.settings.turnMode === 'paired') {
      t.phase = 'paired';
      t.partner = (t.current + 3) % n;
      C.log(s, 'paired.start', { seat: t.partner });
    } else {
      nextTurn(s);
    }
    return;
  }
  if (t.phase === 'specialBuild') {
    need(seat === t.sbpOrder[t.sbpIndex], 'notYourTurn');
    t.sbpIndex++;
    if (t.sbpIndex >= t.sbpOrder.length) nextTurn(s);
    else C.log(s, 'sbp.next', { seat: t.sbpOrder[t.sbpIndex] });
    return;
  }
  if (t.phase === 'paired') {
    need(seat === t.partner, 'notYourTurn');
    if (s.settings.guilds && s.players[seat].progress.length > 4) {
      s.steps.push({ k: 'progressLimit', waiting: { [seat]: s.players[seat].progress.length - 4 } });
      return;
    }
    t.fleet = null;
    nextTurn(s);
    return;
  }
  throw new GameError('notYourTurn');
}

// ---------- pasos pendientes ----------

function handleStep(s: GameState, seat: number, a: Action, st: Step, rng: Rng) {
  switch (st.k) {
    case 'discard': {
      need(a.t === 'discard' && st.waiting[seat] !== undefined, 'pending');
      if (a.t !== 'discard') return;
      need(C.validHandPart(a.cards) && handTotal(a.cards) === st.waiting[seat], 'badArg');
      C.pay(s, seat, a.cards);
      C.log(s, 'discard', { seat, n: st.waiting[seat] });
      delete st.waiting[seat];
      if (!Object.keys(st.waiting).length) s.steps.shift();
      return;
    }
    case 'robber': {
      need(a.t === 'robber' && seat === st.seat, 'pending');
      if (a.t !== 'robber') return;
      let victims: number[];
      if (a.target === 'robber') {
        need(st.robber && C.legalRobberHexes(s, seat).includes(a.hex), 'illegal');
        s.board.robber = a.hex;
        victims = C.robberVictims(s, seat, a.hex);
      } else {
        need(st.pirate && C.legalPirateHexes(s).includes(a.hex), 'illegal');
        s.board.pirate = a.hex;
        victims = C.pirateVictims(s, seat, a.hex);
      }
      C.log(s, a.target === 'robber' ? 'robber.move' : 'pirate.move', { seat });
      s.steps.shift();
      // aldeas tejedoras: con el pirata se elige entre una carta y una tela
      const choose = !!s.looms && a.target === 'pirate';
      if (st.mode === 'stealAll') for (const v of victims) stealRandom(s, rng, seat, v);
      else if (victims.length === 1 && !choose) stealRandom(s, rng, seat, victims[0]);
      else if (victims.length) s.steps.unshift({ k: 'steal', seat, hex: a.hex, on: a.target, from: victims });
      return;
    }
    case 'steal': {
      need(a.t === 'steal' && seat === st.seat, 'pending');
      if (a.t !== 'steal') return;
      need(st.from.includes(a.from), 'illegal');
      if (a.cloth) need(!!s.looms && st.on === 'pirate' && s.looms.cloth[a.from] > 0, 'illegal');
      s.steps.shift();
      if (a.cloth) Looms.stealCloth(s, seat, a.from);
      else stealRandom(s, rng, seat, a.from);
      return;
    }
    case 'pick': {
      need(a.t === 'pick' && st.waiting[seat] !== undefined, 'pending');
      if (a.t !== 'pick') return;
      need(C.validHandPart(a.cards), 'badArg');
      need(Object.keys(a.cards).every((c) => isResource(c) || !(a.cards as Record<string, number>)[c]), 'badArg');
      const available = RESOURCES.reduce((x, r) => x + s.bank[r], 0);
      const required = Math.min(st.waiting[seat], available);
      need(handTotal(a.cards) === required, 'badArg');
      need(RESOURCES.every((r) => (a.cards[r] ?? 0) <= s.bank[r]), 'bankEmpty');
      for (const r of RESOURCES) C.gain(s, seat, r, a.cards[r] ?? 0);
      C.log(s, 'pick', { seat, reason: st.reason, cards: C.handText(a.cards) });
      delete st.waiting[seat];
      if (!Object.keys(st.waiting).length) s.steps.shift();
      return;
    }
    case 'monopoly': {
      need(a.t === 'monopoly' && seat === st.seat, 'pending');
      if (a.t !== 'monopoly') return;
      need(isResource(a.card), 'badArg');
      let total = 0;
      for (const p of s.players) {
        if (p.seat === seat) continue;
        const k = p.hand[a.card];
        if (k) C.moveCards(s, p.seat, seat, { [a.card]: k });
        total += k;
      }
      C.log(s, 'monopoly', { seat, card: a.card, n: total });
      s.steps.shift();
      return;
    }
    case 'freeRoutes': {
      need((a.t === 'freeRoute' || a.t === 'skipFree') && seat === st.seat, 'pending');
      if (a.t === 'skipFree') {
        s.steps.shift();
        return;
      }
      if (a.t !== 'freeRoute') return;
      if (st.source === 'diplomat') need(!a.ship, 'illegal');
      placeRoute(s, seat, a.edge, !!a.ship, true);
      st.left--;
      if (st.left <= 0) s.steps.splice(s.steps.indexOf(st), 1);
      return;
    }
    case 'quake': {
      need(a.t === 'quake' && st.waiting.includes(seat), 'pending');
      if (a.t !== 'quake') return;
      const r = s.roads[a.edge];
      need(r && r.owner === seat && !r.broken, 'illegal');
      r.broken = true;
      C.log(s, 'road.broken', { seat });
      st.waiting = st.waiting.filter((x) => x !== seat);
      if (!st.waiting.length) s.steps.shift();
      C.updateRoadAward(s);
      return;
    }
    case 'gift': {
      need(a.t === 'gift' && st.waiting[seat] !== undefined, 'pending');
      if (a.t !== 'gift') return;
      need(st.to[seat].includes(a.to), 'illegal');
      need(C.validHandPart(a.cards) && handTotal(a.cards) === st.waiting[seat], 'badArg');
      if (st.reason !== 'force') need(Object.keys(a.cards).every((c) => isResource(c) || !(a.cards as Record<string, number>)[c]), 'badArg');
      C.moveCards(s, seat, a.to, a.cards);
      C.log(s, 'gift.cards', { seat, to: a.to, cards: C.handText(a.cards) }, [seat, a.to], { k: 'gift', p: { seat, to: a.to, n: st.waiting[seat] } });
      delete st.waiting[seat];
      if (!Object.keys(st.waiting).length) s.steps.splice(s.steps.indexOf(st), 1);
      return;
    }
    case 'neutral': {
      need(a.t === 'neutral' && seat === st.seat, 'pending');
      if (a.t !== 'neutral') return;
      s.steps.shift();
      Duel.placeNeutral(s, st, a.at);
      return;
    }
    case 'camelBid': {
      need(a.t === 'camelBid' && st.waiting.includes(seat), 'pending');
      if (a.t !== 'camelBid') return;
      Caravan.bid(s, st, seat, a.bid);
      return;
    }
    case 'camelPlace': {
      need(a.t === 'camel' && seat === st.seat, 'pending');
      if (a.t !== 'camel') return;
      Caravan.place(s, seat, a.at);
      s.steps.shift();
      return;
    }
    case 'raidKnight': {
      need(a.t === 'raidPlace' && seat === st.seat, 'pending');
      if (a.t !== 'raidPlace') return;
      Raid.placeKnight(s, st, a.edge);
      s.steps.shift();
      return;
    }
    case 'raidTake': {
      need(a.t === 'raidTake' && seat === st.seat, 'pending');
      if (a.t !== 'raidTake') return;
      Raid.take(s, seat, a.hex);
      s.steps.shift();
      return;
    }
    case 'raidShift': {
      need(a.t === 'raidShift' && seat === st.seat, 'pending');
      if (a.t !== 'raidShift') return;
      if (Raid.shift(s, st, a.hex)) s.steps.shift();
      return;
    }
    case 'barbMove': {
      need(a.t === 'barbPlace' && seat === st.seat, 'pending');
      if (a.t !== 'barbPlace') return;
      const r = Traders.placeBarb(s, st, a.edge);
      if (!r.done) return;
      s.steps.shift();
      if (r.victim !== null) stealRandom(s, rng, seat, r.victim);
      return;
    }
    case 'placeHarbor': {
      need(a.t === 'placeHarbor' && seat === st.seat, 'pending');
      if (a.t !== 'placeHarbor') return;
      Tribe.placeHarbor(s, seat, st, a.edge);
      s.steps.shift();
      Tribe.offerHeld(s, seat);
      return;
    }
    default:
      if (Guild.handleStep(s, seat, a, st, rng)) return;
      throw new GameError('pending');
  }
}

export { C as rules };

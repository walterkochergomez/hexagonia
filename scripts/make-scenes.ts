// Escenas concretas para revisar diálogos y estados de la interfaz.
import { writeFileSync } from 'node:fs';
import { applyAction, createGame } from '../src/engine/game';
import { botAction, whoActs } from '../src/engine/bot';
import { Rng, seedRng } from '../src/engine/rng';
import * as C from '../src/engine/core';
import type { GameState, Settings } from '../src/engine/types';

const names = ['Walter', 'Lenga', 'Coihue', 'Ñirre'];
const seats = names.map((name, i) => ({ name, color: i, bot: i !== 0 }));
function base(over: Partial<Settings> = {}, turns = 12): GameState {
  const st: Settings = { seats: 4, openSea: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 777, ...over };
  let s = createGame(st, names.map((name, i) => ({ name, color: i })));
  const rng = new Rng(seedRng(5));
  for (let i = 0; i < 20000; i++) {
    const seat = whoActs(s);
    if (seat === null) break;
    if (s.turn.n >= turns && seat === 0 && s.turn.phase === 'main' && !s.steps.length && !s.trade) break;
    try { s = applyAction(s, seat, botAction(s, seat, rng)!); } catch { try { s = applyAction(s, seat, { t: 'endTurn' }); } catch { /* */ } }
  }
  return s;
}
const out = (name: string, game: GameState, extraSeats = seats, hint?: string) => writeFileSync(`e2e/out/scene-${name}.json`, JSON.stringify({ seats: extraSeats, game, ...(hint ? { hint } : {}) }));

// 1. descarte
let s = base();
s.players[0].hand = { lumber: 3, brick: 2, wool: 2, grain: 1, ore: 1, paper: 0, cloth: 0, coin: 0 };
s.steps = [{ k: 'discard', reason: 'seven', waiting: { 0: 4 } }];
out('discard', s);
// 2. mover ladrón
s = base();
s.steps = [{ k: 'robber', seat: 0, robber: true, pirate: false, mode: 'steal1' }];
out('robber', s);
// 3. preparación
s = createGame({ seats: 4, openSea: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 31 }, names.map((name, i) => ({ name, color: i })));
s.turn.setupOrder = [0, 1, 2, 3, 3, 2, 1, 0];
s.turn.current = 0;
out('setup', s);
// 4. con cartas de desarrollo y mano llena
s = base();
s.players[0].hand = { lumber: 2, brick: 2, wool: 3, grain: 2, ore: 3, paper: 0, cloth: 0, coin: 0 };
s.players[0].dev = [{ type: 'soldier', turn: 1 }, { type: 'monopoly', turn: 1 }, { type: 'point', turn: 1 }, { type: 'roads', turn: s.turn.n }];
out('cards', s);
// 5. gremios con cartas de progreso
s = base({ guilds: true }, 14);
s.players[0].hand = { lumber: 1, brick: 2, wool: 2, grain: 2, ore: 2, paper: 3, cloth: 2, coin: 1 };
s.players[0].progress = ['alchemist', 'merchant', 'spy', 'irrigation'];
s.players[0].improvements = { science: 3, trade: 1, politics: 2 };
out('guilds', s);
// 6. fin de partida
s = base({}, 30);
s.winner = 0;
s.turn.phase = 'over';
out('over', s);
// 7. dos personas: pantalla de pase
s = base();
out('pass', s, names.map((name, i) => ({ name, color: i, bot: i > 1 })));
// 8. Comarcas: pesca con fichas en la mano
s = base({ shire: 'fishers' });
s.players[0].fish = [3, 2, 2];
out('fishers', s);
// 9. Comarcas: ríos, con un puente posible
s = base({ shire: 'rivers' });
{
  const g = C.G(s);
  const e = s.river!.crossings.find((x) => [g.edges[x].a, g.edges[x].b].some((v) => C.distanceOk(s, v) && C.vertexLand(s, v)))!;
  const v = [g.edges[e].a, g.edges[e].b].find((x) => C.distanceOk(s, x) && C.vertexLand(s, x))!;
  s.buildings[v] = { owner: 0, kind: 'settlement' };
  s.players[0].hand = { lumber: 1, brick: 2, wool: 0, grain: 0, ore: 0, paper: 0, cloth: 0, coin: 0 };
}
out('rivers', s);
// 10. Comarcas: votación de camellos al empezar el turno
s = base({ shire: 'caravans' });
s.players[0].hand = { lumber: 0, brick: 0, wool: 2, grain: 1, ore: 0, paper: 0, cloth: 0, coin: 0 };
s.turn.phase = 'preRoll';
s.steps = [{ k: 'camelBid', waiting: [0, 1, 2, 3], bids: {} }];
out('caravans', s);
// 11. Mar Abierto: pueblo isleño, con un barco al lado de un regalo
s = base({ openSea: true, scenario: 'tribe' });
{
  const g = C.G(s);
  const gift = s.tribe!.gifts.find((x) => x.kind === 'vp')!;
  const v = [g.edges[gift.edge].a, g.edges[gift.edge].b].find((x) => g.vertices[x].edges.some((e) => e !== gift.edge && C.edgeShippable(s, e) && !s.ships[e]))!;
  const e2 = g.vertices[v].edges.find((e) => e !== gift.edge && C.edgeShippable(s, e) && !s.ships[e])!;
  s.ships[e2] = { owner: 0 };
  s.players[0].hand = { lumber: 2, brick: 0, wool: 2, grain: 0, ore: 0, paper: 0, cloth: 0, coin: 0 };
  s.tribe!.vp[1] = 1;
}
out('tribe', s);
// 12. Mar Abierto: aldeas tejedoras, con un barco al lado de una aldea
s = base({ openSea: true, scenario: 'looms' });
{
  const g = C.G(s);
  const vil = s.looms!.villages.find((x) => !x.linked.length)!;
  const e = g.vertices[vil.v].edges.find((x) => C.edgeShippable(s, x) && !s.ships[x])!;
  const w = g.edges[e].a === vil.v ? g.edges[e].b : g.edges[e].a;
  const e2 = g.vertices[w].edges.find((x) => x !== e && C.edgeShippable(s, x) && !s.ships[x])!;
  s.ships[e2] = { owner: 0 };
  s.players[0].hand = { lumber: 2, brick: 0, wool: 2, grain: 0, ore: 0, paper: 0, cloth: 0, coin: 0 };
  s.looms!.villages[0].linked = [1];
  s.looms!.cloth[1] = 3;
  out('looms', s, seats, e);
}
// 13. Mar Abierto: bastiones, con la ruta en el bastión y barcos de guerra
s = base({ openSea: true, scenario: 'bastions' });
{
  const f = s.bastions!.forts.find((x) => x.seat === 0)!;
  for (let i = 0; i < 40 && C.bastionRoute(s, 0).head !== f.v; i++) {
    const e = C.legalShips(s, 0)[0];
    if (!e) break;
    s.ships[e] = { owner: 0 };
  }
  const r = C.bastionRoute(s, 0);
  for (const e of r.edges.slice(0, 3)) s.ships[e] = { owner: 0, war: true };
  f.chips = 2;
  s.players[0].dev.push({ type: 'soldier', turn: 1 });
  s.players[0].devPlayedTurn = -1;
}
out('bastions', s);
// 14. Mar Abierto: grandes obras, con dos ciudades y para empezar el observatorio
s = base({ openSea: true, scenario: 'works' });
{
  const mine = Object.keys(s.buildings).filter((v) => s.buildings[v].owner === 0);
  for (const v of mine.slice(0, 2)) s.buildings[v].kind = 'city';
  s.players[0].hand = { lumber: 0, brick: 2, wool: 0, grain: 4, ore: 4, paper: 0, cloth: 0, coin: 0 };
  s.works!.wonders[1].owner = 2;
  s.works!.wonders[1].level = 1;
}
out('works', s);
console.log('ok', C.vpOf(s, 0));

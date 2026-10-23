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
  const st: Settings = { seats: 4, seafarers: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 777, ...over };
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
const out = (name: string, game: GameState, extraSeats = seats) => writeFileSync(`e2e/out/scene-${name}.json`, JSON.stringify({ seats: extraSeats, game }));

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
s = createGame({ seats: 4, seafarers: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 31 }, names.map((name, i) => ({ name, color: i })));
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
console.log('ok', C.vpOf(s, 0));

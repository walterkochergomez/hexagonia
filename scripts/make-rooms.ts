// Salas guardadas del anfitrión (formato de localStorage 'hexagonia.host') para revisar la interfaz en línea.
// Uso: npx tsx scripts/make-rooms.ts  → e2e/out/room-<nombre>.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { applyAction, createGame } from '../src/engine/game';
import { botAction, whoActs } from '../src/engine/bot';
import { Rng, seedRng } from '../src/engine/rng';
import type { GameState, Settings } from '../src/engine/types';
import type { LobbyState } from '../src/net/protocol';

type Phase = GameState['turn']['phase'];

const NAMES = ['walter', 'Lenga', 'Coihue', 'Ñirre', 'Calafate', 'Maqui'];
export const ROOM_CODE = 'AHWXVK';
export const HOST_ID = 'cid-walter';

function play(settings: Settings, stopAt: Phase, minTurn: number): GameState {
  let s = createGame(settings, NAMES.slice(0, settings.seats).map((name, i) => ({ name, color: i })));
  const rng = new Rng(seedRng(99));
  for (let i = 0; i < 40000; i++) {
    const seat = whoActs(s);
    if (seat === null) break;
    if (s.turn.n >= minTurn && seat === 0 && s.turn.phase === stopAt && !s.steps.length && !s.trade) break;
    const a = botAction(s, seat, rng);
    if (!a) break;
    try {
      s = applyAction(s, seat, a);
    } catch {
      try { s = applyAction(s, seat, { t: 'endTurn' }); } catch { /* nada */ }
    }
  }
  return s;
}

function room(name: string, over: Partial<Settings>, stopAt: Phase, minTurn = 9) {
  const settings: Settings = { seats: 3, openSea: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 4242, ...over };
  const game = play(settings, stopAt, minTurn);
  const lobby: LobbyState = {
    code: ROOM_CODE,
    status: 'playing',
    seats: NAMES.slice(0, settings.seats).map((n, i) => (i === 0
      ? { clientId: HOST_ID, name: n, color: i, host: true, connected: true }
      : { clientId: `bot-${i}`, name: n, color: i, bot: true, connected: true })),
    settings: { openSea: settings.openSea, scenario: settings.scenario, guilds: settings.guilds, vpTarget: settings.vpTarget, turnMode: settings.turnMode, friendlyRobber: settings.friendlyRobber },
  };
  writeFileSync(`e2e/out/room-${name}.json`, JSON.stringify({ code: ROOM_CODE, clientId: HOST_ID, lobby, game, chat: [] }));
  console.log(name, 'turno', game.turn.n, game.turn.phase, 'actúa', whoActs(game));
}

mkdirSync('e2e/out', { recursive: true });
room('base3-main', {}, 'main');
room('base3-preroll', {}, 'preRoll');
room('guilds4-main', { seats: 4, guilds: true }, 'main');
room('combo6-main', { seats: 6, guilds: true, openSea: true, scenario: 'newWorld' }, 'main');

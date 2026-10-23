// Genera una partida local a mitad de juego para capturas y pruebas visuales.
import { writeFileSync } from 'node:fs';
import { applyAction, createGame } from '../src/engine/game';
import { botAction, whoActs } from '../src/engine/bot';
import { Rng, seedRng } from '../src/engine/rng';
import type { Settings } from '../src/engine/types';

const mode = process.argv[2] ?? 'base';
const n = Number(process.argv[3] ?? 4);
const out = process.argv[4] ?? 'e2e/out/save.json';
const minTurn = Number(process.argv[5] ?? 18);
const settings: Settings = {
  seats: n, seafarers: mode.includes('sea'), scenario: (process.argv[6] as Settings['scenario']) ?? 'islands', guilds: mode.includes('guilds'),
  vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false, seed: 4242,
};
const names = ['Walter', 'Lenga', 'Coihue', 'Ñirre', 'Calafate', 'Maqui'];
let s = createGame(settings, names.slice(0, n).map((name, i) => ({ name, color: i })));
const rng = new Rng(seedRng(99));
for (let i = 0; i < 20000; i++) {
  const seat = whoActs(s);
  if (seat === null) break;
  if (s.turn.n >= minTurn && seat === 0 && s.turn.phase === 'main' && !s.steps.length && !s.trade) break;
  const a = botAction(s, seat, rng);
  if (!a) break;
  try {
    s = applyAction(s, seat, a);
  } catch {
    try { s = applyAction(s, seat, { t: 'endTurn' }); } catch { /* nada */ }
  }
}
writeFileSync(out, JSON.stringify({ seats: names.slice(0, n).map((name, i) => ({ name, color: i, bot: i !== 0 })), game: s }));
console.log('turn', s.turn.n, 'phase', s.turn.phase, 'actor', whoActs(s), 'winner', s.winner);

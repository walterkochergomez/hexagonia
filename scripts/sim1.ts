import { simulate, settings } from '../tests/helpers';
const [name, n, seed] = [process.argv[2] ?? 'base', Number(process.argv[3] ?? 4), Number(process.argv[4] ?? 1)];
const over: Record<string, object> = {
  base: {}, paired: { turnMode: 'paired' }, guilds: { guilds: true },
  islands: { openSea: true, scenario: 'islands' }, archipelago: { openSea: true, scenario: 'archipelago' },
  fog: { openSea: true, scenario: 'fog' }, desert: { openSea: true, scenario: 'desert' }, newWorld: { openSea: true, scenario: 'newWorld' },
  combo: { openSea: true, guilds: true, scenario: 'islands' },
};
const t0 = Date.now();
const r = simulate(settings({ ...over[name], seed }), n);
console.log(name, n, 'winner', r.winner, 'actions', r.actions, 'turns', r.turns, 'errors', r.errors.length, 'ms', Date.now() - t0);
for (const e of r.errors.slice(0, 8)) console.log('  ', e);

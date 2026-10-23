import { describe, it, expect } from 'vitest';
import { settings, simulate } from './helpers';
import type { SeaScenario, Settings } from '../src/engine/types';

const configs: [string, Partial<Settings>, number[]][] = [
  ['base', {}, [3, 4]],
  ['5-6 fase especial', { turnMode: 'specialBuild' }, [5, 6]],
  ['5-6 en pareja', { turnMode: 'paired' }, [5, 6]],
  ['ladrón amistoso', { friendlyRobber: true }, [4]],
  ...(['islands', 'archipelago', 'fog', 'desert', 'newWorld'] as SeaScenario[]).map((sc): [string, Partial<Settings>, number[]] => [`mar ${sc}`, { openSea: true, scenario: sc }, [3, 4, 5]]),
  ['gremios', { guilds: true }, [3, 4]],
  ['gremios 5-6', { guilds: true, turnMode: 'specialBuild' }, [5, 6]],
  ['gremios + mar', { guilds: true, openSea: true, scenario: 'islands' }, [4]],
  ['gremios + mar desierto', { guilds: true, openSea: true, scenario: 'desert' }, [3, 6]],
];

const GAMES = Number(process.env.SIM_GAMES ?? 6);

describe('simulaciones con bots', () => {
  for (const [name, over, counts] of configs) {
    for (const n of counts) {
      it(`${name} · ${n} jugadores`, () => {
        let wins = 0;
        for (let g = 0; g < GAMES; g++) {
          const r = simulate(settings({ ...over, seed: 1000 + g * 7919 + n }), n);
          expect(r.errors, r.errors.slice(0, 5).join('\n')).toEqual([]);
          if (r.winner !== null) wins++;
        }
        expect(wins).toBeGreaterThan(0);
      });
    }
  }
});

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
  // Comarcas
  ['señor de los muelles', { harbormaster: true }, [3, 4]],
  ['mazo de sucesos', { chronicle: true }, [3, 4]],
  ['sucesos + muelles 5-6', { chronicle: true, harbormaster: true, turnMode: 'paired' }, [5]],
  ['sucesos + mar', { chronicle: true, openSea: true, scenario: 'islands' }, [4]],
  ['duelo', { duel: true }, [2]],
  ['duelo + sucesos + muelles', { duel: true, chronicle: true, harbormaster: true }, [2]],
  ['aguas de pesca', { shire: 'fishers' }, [3, 4, 6]],
  ['ríos de oro', { shire: 'rivers' }, [3, 4, 5]],
  ['ruta de camellos', { shire: 'caravans' }, [3, 4, 6]],
  ['pesca + sucesos + muelles', { shire: 'fishers', chronicle: true, harbormaster: true }, [4]],
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

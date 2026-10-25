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
  ['invasión en la costa', { shire: 'raid' }, [3, 4, 5, 6]],
  ['invasión en pareja', { shire: 'raid', turnMode: 'paired' }, [5]],
  ['invasión + sucesos + muelles', { shire: 'raid', chronicle: true, harbormaster: true }, [4]],
  ['carretas y peajes', { shire: 'traders' }, [3, 4, 5, 6]],
  ['carretas en pareja', { shire: 'traders', turnMode: 'paired' }, [6]],
  ['carretas + sucesos + muelles', { shire: 'traders', chronicle: true, harbormaster: true }, [4]],
  // Mar Abierto: escenarios especiales
  ['pueblo isleño', { openSea: true, scenario: 'tribe' }, [3, 4, 6]],
  ['aldeas tejedoras', { openSea: true, scenario: 'looms' }, [3, 4, 5]],
  ['bastiones corsarios', { openSea: true, scenario: 'bastions' }, [3, 4, 5, 6]],
  ['grandes obras', { openSea: true, scenario: 'works' }, [3, 4, 6]],
  ['bastiones + sucesos', { openSea: true, scenario: 'bastions', chronicle: true }, [4]],
  ['aldeas + sucesos', { openSea: true, scenario: 'looms', chronicle: true }, [4]],
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

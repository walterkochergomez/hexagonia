import { useMemo } from 'react';
import { standardMap } from '../engine/maps';
import { Rng, seedRng } from '../engine/rng';
import { graphOf } from '../engine/geometry';
import { Pips, TerrainGlyph } from './art';

const R = 50;
const SX = (Math.sqrt(3) / 2) * R;
const SY = R / 2;
const HEX = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]].map(([x, y]) => `${(x * SX * 0.97).toFixed(1)},${(y * SY * 0.97).toFixed(1)}`).join(' ');

/** Isla de muestra para la portada: cambia cada día. */
export function IslandPreview() {
  const map = useMemo(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return standardMap(new Rng(seedRng(day)), false);
  }, []);
  const g = graphOf(map.hexes);
  const hexes = Object.values(map.hexes).filter((h) => h.terrain !== 'sea');
  const order = [...hexes].sort((a, b) => Math.hypot(g.hexes[a.id].X, g.hexes[a.id].Y * 1.7) - Math.hypot(g.hexes[b.id].X, g.hexes[b.id].Y * 1.7));
  return (
    <svg className="island-preview" viewBox="-300 -265 600 530" aria-hidden="true">
      {Object.values(map.hexes).filter((h) => h.terrain === 'sea').map((h) => {
        const gh = g.hexes[h.id];
        return <polygon key={h.id} points={HEX} className="sea-tile" transform={`translate(${gh.X * SX} ${gh.Y * SY})`} />;
      })}
      {order.map((h, i) => {
        const gh = g.hexes[h.id];
        return (
          <g key={h.id} className={`hex t-${h.terrain}`} transform={`translate(${gh.X * SX} ${gh.Y * SY})`}>
            <g className="rise" style={{ animationDelay: `${i * 45}ms` }}>
            <polygon points={HEX} className="tile" />
            <g transform={`translate(0 ${h.number ? -22 : -2})`}><TerrainGlyph terrain={h.terrain} /></g>
            {h.number && (
              <g className={`token${h.number === 6 || h.number === 8 ? ' hot' : ''}`} transform="translate(0 8)">
                <circle r={14} />
                <text y={3.5} textAnchor="middle">{h.number}</text>
                <g transform="translate(0 9)"><Pips n={h.number} /></g>
              </g>
            )}
            </g>
          </g>
        );
      })}
    </svg>
  );
}

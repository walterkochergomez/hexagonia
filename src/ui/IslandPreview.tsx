import { useMemo } from 'react';
import { standardMap } from '../engine/maps';
import { Rng, seedRng } from '../engine/rng';
import { graphOf } from '../engine/geometry';
import { Coast, NumberToken, SX, SY, SeaFace, TileDefs, TileFace, hexPoints, type LandTerrain } from './tiles';

const BASE = hexPoints(1);

/** Isla de muestra para la portada: cambia cada día y se arma ficha por ficha. */
export function IslandPreview() {
  const map = useMemo(() => {
    const day = Math.floor(Date.now() / 86_400_000);
    return standardMap(new Rng(seedRng(day)), false);
  }, []);
  const g = graphOf(map.hexes);
  const pos = (id: string): [number, number] => [g.hexes[id].X * SX, g.hexes[id].Y * SY];
  const land = Object.values(map.hexes).filter((h) => h.terrain !== 'sea');
  const sea = Object.values(map.hexes).filter((h) => h.terrain === 'sea');
  const byRow = [...land].sort((a, b) => g.hexes[a.id].Y - g.hexes[b.id].Y || g.hexes[a.id].X - g.hexes[b.id].X);
  const order = new Map([...land].sort((a, b) => Math.hypot(g.hexes[a.id].X, g.hexes[a.id].Y * 1.7) - Math.hypot(g.hexes[b.id].X, g.hexes[b.id].Y * 1.7)).map((h, i) => [h.id, i]));
  return (
    <svg className="island-preview" viewBox="-300 -265 600 540" aria-hidden="true">
      <TileDefs />
      {sea.map((h) => <g key={h.id} transform={`translate(${pos(h.id).join(' ')})`}><polygon points={BASE} className="preview-sea" /><SeaFace id={h.id} /></g>)}
      <g className="rise" style={{ animationDelay: '0ms' }}>
        <Coast centers={land.map((h) => pos(h.id))} />
        <g className="island-base">{land.map((h) => <polygon key={h.id} points={BASE} transform={`translate(${pos(h.id).join(' ')})`} />)}</g>
      </g>
      {byRow.map((h) => (
        <g key={h.id} className={`hex t-${h.terrain}`} transform={`translate(${pos(h.id).join(' ')})`}>
          <g className="rise" style={{ animationDelay: `${120 + (order.get(h.id) ?? 0) * 45}ms` }}>
            <TileFace terrain={h.terrain as LandTerrain} id={h.id} />
            {h.number && <g transform="translate(0 8)"><NumberToken n={h.number} /></g>}
          </g>
        </g>
      ))}
    </svg>
  );
}

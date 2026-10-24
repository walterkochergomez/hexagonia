/** @jsxRuntime automatic */
/** @jsxImportSource react */
// Hoja de muestras de fichas y piezas para revisar el arte. Uso: npm run build && npx tsx scripts/tile-sheet.tsx
// Escribe dist/muestras.html (usa el CSS compilado) — abrir con `vite preview`.
import { readdirSync, writeFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Coast, NumberToken, SeaFace, SX, SY, TileDefs, TileFace, type LandTerrain } from '../src/ui/tiles';
import { CardIcon, CityShape, DieFace, KnightShape, MerchantShape, RobberShape, SettlementShape, ShipShape } from '../src/ui/art';
import type { Card } from '../src/engine/types';

const css = readdirSync('dist/assets').find((f) => f.endsWith('.css'));
const terrains: LandTerrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'gold', 'fog'];
const ids = ['h0,0', 'h1,0', 'h2,0', 'h0,1', 'h3,1', 'h1,2'];
const variantIds: string[] = [];
for (let v = 0; v < 3; v++) {
  for (const id of ids.concat(['h5,5', 'h7,1', 'h2,9', 'h4,4'])) {
    let h = 7;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    if (h % 3 === v) { variantIds.push(id); break; }
  }
}

const cell = 2 * SX + 10;
const tiles = terrains.flatMap((tr, row) => variantIds.map((id, col) => {
  const x = 60 + col * cell;
  const y = 70 + row * (2 * SY * 2 + 22);
  const num = tr === 'desert' || tr === 'fog' ? null : [8, 5, 10][col];
  return (
    <g key={`${tr}-${col}`} transform={`translate(${x} ${y})`} className="hex">
      <TileFace terrain={tr} id={id} />
      {num && <g transform="translate(0 8)"><NumberToken n={num} /></g>}
    </g>
  );
}));

// isla de 7 casillas con mar alrededor
const island: [string, LandTerrain, number | null, number, number][] = [
  ['a', 'forest', 6, 0, 0], ['b', 'pasture', 9, 2, 0], ['c', 'fields', 4, -1, 3], ['d', 'mountains', 8, 1, 3], ['e', 'hills', 10, 3, 3], ['f', 'gold', 3, 0, 6], ['g', 'desert', null, 2, 6],
];
const seaCells: [number, number][] = [[-2, 0], [4, 0], [-1, -3], [1, -3], [3, -3], [-3, 3], [5, 3], [-2, 6], [4, 6], [-1, 9], [1, 9], [3, 9]];
const ox = 520, oy = 1180;
const islandSvg = (
  <g>
    {seaCells.map(([X, Y], i) => <g key={i} transform={`translate(${ox + X * SX} ${oy + Y * SY})`}><SeaFace id={`s${i}`} /></g>)}
    <Coast centers={island.map(([, , , X, Y]) => [ox + X * SX, oy + Y * SY])} />
    {[...island].sort((a, b) => a[4] - b[4]).map(([id, tr, n, X, Y]) => (
      <g key={id} transform={`translate(${ox + X * SX} ${oy + Y * SY})`} className="hex">
        <TileFace terrain={tr} id={id} />
        {n && <g transform="translate(0 8)"><NumberToken n={n} /></g>}
      </g>
    ))}
    <g transform={`translate(${ox + 1 * SX} ${oy + 1.5 * SY - 26})`}><g className="p0"><SettlementShape color={0} /></g></g>
    <g transform={`translate(${ox + 2 * SX + 8} ${oy + 4.5 * SY})`}><CityShape color={1} /></g>
    <g transform={`translate(${ox - 30} ${oy + 3 * SY + 10})`}><RobberShape /></g>
  </g>
);

const pieces = (
  <g transform="translate(60 1500)">
    {[0, 1, 2, 3, 4, 5].map((c) => (
      <g key={c} transform={`translate(${c * 120} 0)`}>
        <g transform="translate(0 0) scale(2)"><SettlementShape color={c} /></g>
        <g transform="translate(46 0) scale(2)"><CityShape color={c} wall={c % 2 === 0} metro={c === 0 ? 'science' : undefined} /></g>
        <g transform="translate(0 60) scale(2)"><ShipShape color={c} /></g>
        <g transform="translate(46 60) scale(2)"><KnightShape color={c} level={(c % 3) + 1} active={c % 2 === 0} /></g>
      </g>
    ))}
    <g transform="translate(0 120) scale(2)"><RobberShape /></g>
    <g transform="translate(60 120) scale(2)"><ShipShape /></g>
    <g transform="translate(120 120) scale(2)"><MerchantShape color={2} /></g>
  </g>
);

const cards: Card[] = ['lumber', 'brick', 'wool', 'grain', 'ore', 'paper', 'cloth', 'coin'];
const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="./assets/${css}">
<style>body{margin:0;background:#2b7c88} .row{display:flex;gap:10px;padding:10px;background:#fff} .dice{display:flex;gap:8px;padding:10px;background:#e4ecea}</style></head><body>
<svg width="1100" height="1820" viewBox="0 0 1100 1820" style="display:block">${renderToStaticMarkup(<><TileDefs />{tiles}{islandSvg}{pieces}</>)}</svg>
<div class="row">${renderToStaticMarkup(<>{cards.map((c) => <CardIcon key={c} card={c} size={60} />)}</>)}</div>
<div class="dice">${renderToStaticMarkup(<>{[1, 2, 3, 4, 5, 6].map((n) => <DieFace key={n} value={n} tone={n === 6 ? 'red' : 'light'} />)}</>)}</div>
</body></html>`;
writeFileSync('dist/muestras.html', html);
console.log('dist/muestras.html');

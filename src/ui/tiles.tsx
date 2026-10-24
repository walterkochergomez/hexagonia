// Fichas de terreno ilustradas: un archipiélago del sur (araucarias, volcanes, ovejas, trigales, greda, desierto florido).
// Luz desde arriba a la izquierda; cada ficha tiene grosor y deja un claro para el número.
import { memo, type ReactNode } from 'react';

export const R = 50;
export const SX = (Math.sqrt(3) / 2) * R;
export const SY = R / 2;
const CORNERS: [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];
export const hexPoints = (k: number, dy = 0) => CORNERS.map(([x, y]) => `${(x * SX * k).toFixed(2)},${(y * SY * k + dy).toFixed(2)}`).join(' ');

const TOP = 0.965;
const THICK = 6;
export const TOP_POINTS = hexPoints(TOP);
const SIDE_POINTS = hexPoints(TOP, THICK);
const BEVEL_LIGHT = (() => {
  const k = TOP - 0.03;
  return [[-1, 1], [-1, -1], [0, -2], [1, -1]].map(([x, y]) => `${(x * SX * k).toFixed(2)},${(y * SY * k).toFixed(2)}`).join(' ');
})();
const BEVEL_DARK = (() => {
  const k = TOP - 0.03;
  return [[1, -1], [1, 1], [0, 2], [-1, 1]].map(([x, y]) => `${(x * SX * k).toFixed(2)},${(y * SY * k).toFixed(2)}`).join(' ');
})();

export type LandTerrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert' | 'gold' | 'fog';

export const PALETTE: Record<LandTerrain, { base: string; side: string; clearing?: string }> = {
  forest: { base: '#3d7a54', side: '#22482f', clearing: '#4c8c60' },
  hills: { base: '#c4673f', side: '#7c3820', clearing: '#d27a51' },
  pasture: { base: '#8fc27a', side: '#577f44', clearing: '#a3d18c' },
  fields: { base: '#dfbb50', side: '#9a7623', clearing: '#ead07c' },
  mountains: { base: '#808c96', side: '#4c5861', clearing: '#919da6' },
  desert: { base: '#e7d4a2', side: '#a99257' },
  gold: { base: '#e0b13a', side: '#94711a', clearing: '#edc65c' },
  fog: { base: '#c2cdd1', side: '#86959b' },
};

/** Variante estable por casilla, para que no se repita el mismo dibujo. */
export function variantOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 3;
}

// ---------- elementos ----------

const Shadow = ({ x = 0, y = 0, rx, ry, c = '#17382a', o = 0.4 }: { x?: number; y?: number; rx: number; ry: number; c?: string; o?: number }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={c} opacity={o} />
);

function Araucaria({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={3} y={0.4} rx={7.5} ry={2} />
      <path d="M-0.9 0.5 L-0.55 -15 L0.55 -15 L0.9 0.5 Z" fill="#5a3b25" />
      <path d="M-11.5 -12.2 C-10 -17.8 -5.2 -20.4 0 -20.4 C5.2 -20.4 10 -17.8 11.5 -12.2 L8.6 -13.4 L5.8 -12.1 L2.9 -13.4 L0 -12.1 L-2.9 -13.4 L-5.8 -12.1 L-8.6 -13.4 Z" fill="#1f5236" />
      <path d="M-7.6 -18.6 C-6.4 -22.4 -3.3 -24.2 0 -24.2 C3.3 -24.2 6.4 -22.4 7.6 -18.6 L5.5 -19.5 L2.8 -18.4 L0 -19.5 L-2.8 -18.4 L-5.5 -19.5 Z" fill="#2b6845" />
      <path d="M-9.2 -14.6 C-7.4 -18 -4 -19.4 -0.6 -19.6" stroke="#5c9f70" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <path d="M-5.6 -20.2 C-4.2 -22.4 -2.2 -23.3 -0.2 -23.4" stroke="#6fb383" strokeWidth={1.1} fill="none" strokeLinecap="round" />
    </g>
  );
}

function RoundTree({ x, y, s = 1, autumn = false }: { x: number; y: number; s?: number; autumn?: boolean }) {
  const c = autumn ? ['#b6612f', '#9d4f25', '#c8743c', '#e3a067'] : ['#2b6845', '#235a3b', '#327450', '#5ea474'];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2.6} y={0.4} rx={6.3} ry={1.8} />
      <rect x={-0.9} y={-6.5} width={1.8} height={7} fill="#5a3b25" />
      <circle cx={-3.1} cy={-9.4} r={4.6} fill={c[0]} />
      <circle cx={3.1} cy={-9.8} r={4.6} fill={c[1]} />
      <circle cx={0} cy={-13.4} r={5} fill={c[2]} />
      <circle cx={-1.9} cy={-14.8} r={2.1} fill={c[3]} />
    </g>
  );
}

function Cypress({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2.6} y={0.4} rx={5.5} ry={1.6} />
      <rect x={-0.8} y={-3} width={1.6} height={3.4} fill="#5a3b25" />
      <path d="M0 -19 C3.4 -13 5.6 -7 5 -2.6 L-5 -2.6 C-5.6 -7 -3.4 -13 0 -19 Z" fill="#1d4f33" />
      <path d="M0 -19 C-3.4 -13 -5.6 -7 -5 -2.6 L-0.4 -2.6 C-1.4 -8 -1 -13 0 -19 Z" fill="#2f6d48" />
    </g>
  );
}

function Sheep({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <Shadow x={flip ? -1 : 1} y={6.4} rx={6.6} ry={1.6} c="#4d7a3e" o={0.45} />
      <path d="M-2.6 3.4 L-2.6 6.4 M2.2 3.4 L2.2 6.4" stroke="#3b4148" strokeWidth={1.3} strokeLinecap="round" />
      <g fill="#fbfdfc">
        <circle cx={-3.4} cy={0.6} r={3.3} />
        <circle cx={3} cy={0.6} r={3.3} />
        <circle cx={-0.2} cy={-1.8} r={3.4} />
        <circle cx={0} cy={1.4} r={3.8} />
      </g>
      <path d="M-6.4 1.6 Q-3 5.2 0 4.9 Q3.6 5.2 6 1.6" stroke="#cbd6d3" strokeWidth={1.1} fill="none" />
      <ellipse cx={5.6} cy={-0.6} rx={2.1} ry={2.6} fill="#3b4148" />
      <circle cx={6.2} cy={-1.2} r={0.45} fill="#fbfdfc" />
    </g>
  );
}

function Haystack({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2.5} y={0.4} rx={8.5} ry={2} c="#7a5c17" o={0.4} />
      <path d="M-7.5 0 C-7.5 -7 -4 -11 0 -11 C4 -11 7.5 -7 7.5 0 Z" fill="#d9ac3d" />
      <path d="M-7.5 0 C-7.5 -7 -4 -11 0 -11 C-1.6 -8 -2.2 -4 -1.6 0 Z" fill="#f1d375" />
      <path d="M-5.6 -4 Q0 -2.4 5.8 -4.2 M-6.6 -1.6 Q0 0 7 -1.8" stroke="#b88d2a" strokeWidth={0.9} fill="none" />
    </g>
  );
}

function Kiln({ x, y, s = 1, smoke = true }: { x: number; y: number; s?: number; smoke?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={3} y={0.4} rx={11} ry={2.4} c="#5e2a17" o={0.42} />
      <path d="M-10 0 C-10 -8 -5.6 -12.6 0 -12.6 C5.6 -12.6 10 -8 10 0 Z" fill="#9a4426" />
      <path d="M-10 0 C-10 -8 -5.6 -12.6 0 -12.6 C-2.6 -10 -4.6 -5.6 -4.4 0 Z" fill="#c26a42" />
      <path d="M-3.4 0 L-3.4 -3.6 C-3.4 -5.6 -1.8 -6.6 0 -6.6 C1.8 -6.6 3.4 -5.6 3.4 -3.6 L3.4 0 Z" fill="#3a1b10" />
      <path d="M-2.2 0 L-2.2 -2 L2.2 -2 L2.2 0 Z" fill="#e8893b" opacity={0.85} />
      <rect x={3.4} y={-15.5} width={3} height={5.4} fill="#86391f" />
      {smoke && (
        <g fill="#f2eee9" opacity={0.85}>
          <circle cx={6} cy={-18.4} r={2.4} />
          <circle cx={8.6} cy={-21.6} r={3} />
          <circle cx={12.4} cy={-24} r={3.4} />
        </g>
      )}
    </g>
  );
}

function Bricks({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  const b = (bx: number, by: number, i: number) => <rect key={i} x={bx} y={by} width={6.6} height={3.2} rx={0.5} fill={i % 2 ? '#d77a4f' : '#cd6f45'} stroke="#8a3c21" strokeWidth={0.6} />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2} y={0.6} rx={11} ry={2} c="#5e2a17" o={0.4} />
      {b(-10, -3.4, 0)}{b(-3.3, -3.4, 1)}{b(3.4, -3.4, 2)}
      {b(-6.6, -6.6, 3)}{b(0.1, -6.6, 4)}
      {b(-3.3, -9.8, 5)}
    </g>
  );
}

function ClayMound({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-12 0 C-9 -6 -4.6 -8.4 0 -8.4 C4.6 -8.4 9 -6 12 0 Z" fill="#a54d2c" />
      <path d="M-12 0 C-9 -6 -4.6 -8.4 0 -8.4 C-2.4 -6.4 -4 -3.4 -4 0 Z" fill="#cf7a52" />
      <path d="M-7 -2.6 Q0 -4 7.6 -2.2" stroke="#8d3d22" strokeWidth={0.8} fill="none" />
    </g>
  );
}

function Peak({ x, y, w, h, snow = 0.32, smoke = false }: { x: number; y: number; w: number; h: number; snow?: number; smoke?: boolean }) {
  const sx = (w / 2) * snow;
  const sy = h * snow;
  return (
    <g transform={`translate(${x} ${y})`}>
      <Shadow x={w * 0.18} y={0.6} rx={w * 0.55} ry={2.6} c="#2f3a41" o={0.35} />
      <path d={`M${-w / 2} 0 L0 ${-h} L0 0 Z`} fill="#9aa7af" />
      <path d={`M0 ${-h} L${w / 2} 0 L0 0 Z`} fill="#65717a" />
      <path d={`M${-sx} ${-h + sy} L0 ${-h} L${sx} ${-h + sy} L${sx * 0.45} ${-h + sy * 0.78} L${sx * 0.05} ${-h + sy * 1.06} L${-sx * 0.42} ${-h + sy * 0.8} Z`} fill="#f4f8f9" />
      <path d={`M0 ${-h} L${sx} ${-h + sy} L${sx * 0.45} ${-h + sy * 0.78} L${sx * 0.05} ${-h + sy * 1.06} Z`} fill="#d3dde2" />
      {smoke && (
        <g fill="#eef2f3" opacity={0.85}>
          <circle cx={1} cy={-h - 2.6} r={2.2} />
          <circle cx={3.4} cy={-h - 5.2} r={2.5} />
        </g>
      )}
    </g>
  );
}

function Rocks({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={2} y={0.4} rx={9} ry={1.8} c="#2f3a41" o={0.35} />
      <path d="M-8 0 L-6.4 -5 L-2.2 -6.6 L0.6 -3.2 L0.6 0 Z" fill="#8e9aa2" />
      <path d="M-2.2 -6.6 L0.6 -3.2 L0.6 0 L-1 0 Z" fill="#6c7880" />
      <path d="M0 0 L1.8 -4.4 L5.8 -5 L8 0 Z" fill="#a4b0b7" />
      <path d="M5.8 -5 L8 0 L4.6 0 Z" fill="#6c7880" />
    </g>
  );
}

function Cactus({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={3} y={0.4} rx={6} ry={1.6} c="#8a7440" o={0.4} />
      <path d="M-1.8 0 L-1.8 -14 C-1.8 -16 1.8 -16 1.8 -14 L1.8 0 Z" fill="#4f8049" />
      <path d="M-1.8 -6 L-5 -6 C-6.4 -6 -6.4 -7 -6.4 -8 L-6.4 -11 C-6.4 -12.6 -4.2 -12.6 -4.2 -11 L-4.2 -8.2 L-1.8 -8.2 Z" fill="#4f8049" />
      <path d="M1.8 -8.6 L4.6 -8.6 L4.6 -12.6 C4.6 -14 6.6 -14 6.6 -12.6 L6.6 -7.6 C6.6 -6.6 6 -6.4 5 -6.4 L1.8 -6.4 Z" fill="#41703c" />
      <path d="M-0.9 -1 L-0.9 -14.2" stroke="#7fb57a" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

function Flowers({ x, y, seed = 0 }: { x: number; y: number; seed?: number }) {
  const cols = ['#d85c95', '#9a6bc4', '#f2c230', '#e9739f'];
  const pts = [[0, 0], [3.4, -1.6], [-3, -1.2], [1.4, 2.4], [-1.8, 2.2], [5, 1.4]];
  return (
    <g transform={`translate(${x} ${y})`}>
      {pts.map(([px, py], i) => <circle key={i} cx={px * 1.2} cy={py * 1.2} r={1.6} fill={cols[(i + seed) % cols.length]} />)}
    </g>
  );
}

function Nugget({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-3.4 1.6 L-2.6 -2 L0.6 -3 L3.4 -1 L3 2 L0 2.8 Z" fill="#ffd84a" stroke="#a87918" strokeWidth={0.7} strokeLinejoin="round" />
      <path d="M-2.6 -2 L0.6 -3 L0 -0.4 Z" fill="#fff3b0" />
    </g>
  );
}

function Sparkle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -4 L0.9 -0.9 L4 0 L0.9 0.9 L0 4 L-0.9 0.9 L-4 0 L-0.9 -0.9 Z" fill="#fffbe6" />;
}

function Cloud({ x, y, s = 1, o = 1 }: { x: number; y: number; s?: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d="M-13 2 C-14 -2 -10.6 -4.6 -7.4 -3.4 C-6.4 -7.4 -1 -8.6 1.6 -5.4 C4 -8 9.4 -6.6 9.4 -2.6 C12.6 -2.6 14 1.6 11 3.2 Z" fill="#eef3f5" />
      <path d="M-13 2 Q0 5.6 11 3.2 Q0 3 -13 2 Z" fill="#d3dde1" />
    </g>
  );
}

function Fence({ x, y, len = 18, angle = -22 }: { x: number; y: number; len?: number; angle?: number }) {
  const posts = [0, len / 2, len];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0 -3 L${len} -3 M0 -0.6 L${len} -0.6`} stroke="#8a6a45" strokeWidth={1} />
      {posts.map((p) => <rect key={p} x={p - 0.8} y={-5} width={1.6} height={6} fill="#6d5234" />)}
    </g>
  );
}

// ---------- composición por terreno (3 variantes) ----------

const pick = <T,>(v: number, xs: T[]): T => xs[v % xs.length];

function forest(v: number): ReactNode {
  const layouts = [
    [['A', 0, -12, 1.2], ['R', -21, -14, 1], ['R', 21, -13, 0.98], ['C', -33, 7, 1.02], ['A', 32, 8, 0.9], ['R', -27, 31, 0.94], ['C', 27, 32, 0.98], ['R', 0, 44, 0.78]],
    [['R', -1, -13, 1.14], ['A', -20, -12, 0.98], ['A', 21, -14, 1.02], ['R', -32, 7, 0.98], ['C', 33, 8, 1.02], ['A', -26, 32, 0.88], ['R', 27, 31, 0.94, 1], ['C', 1, 44, 0.8]],
    [['A', 1, -13, 1.14], ['C', -20, -14, 1.02], ['R', 20, -13, 1.02, 1], ['A', -32, 8, 0.9], ['R', 32, 7, 0.98], ['C', -27, 32, 0.98], ['A', 27, 32, 0.88], ['R', -1, 44, 0.76]],
  ] as const;
  return (
    <>
      <polygon points={TOP_POINTS} fill="url(#pat-forest)" />
      <ellipse cx={0} cy={9} rx={18} ry={15} fill={PALETTE.forest.clearing} />
      {pick(v, layouts as unknown as (readonly [string, number, number, number, number?])[][]).map(([k, x, y, s, au], i) =>
        k === 'A' ? <Araucaria key={i} x={x} y={y} s={s} /> : k === 'C' ? <Cypress key={i} x={x} y={y} s={s} /> : <RoundTree key={i} x={x} y={y} s={s} autumn={!!au} />)}
    </>
  );
}

function hills(v: number): ReactNode {
  return (
    <>
      <polygon points={TOP_POINTS} fill="url(#pat-strata)" />
      <ellipse cx={0} cy={9} rx={18} ry={15} fill={PALETTE.hills.clearing} />
      {pick(v, [
        <><Kiln x={0} y={-12} s={1.15} /><Bricks x={-27} y={7} s={1.15} /><ClayMound x={29} y={5} s={0.95} /><ClayMound x={-19} y={35} s={1} /><Bricks x={20} y={36} s={1} /></>,
        <><Kiln x={-4} y={-12} s={1.1} /><ClayMound x={23} y={-13} s={0.9} /><Bricks x={28} y={9} s={1.05} /><Bricks x={-28} y={5} s={1} /><ClayMound x={17} y={36} s={1.05} /></>,
        <><Kiln x={3} y={-12} s={1.15} smoke={false} /><Bricks x={-21} y={-14} s={0.95} /><ClayMound x={-29} y={11} s={0.95} /><Kiln x={29} y={12} s={0.72} /><Bricks x={-13} y={37} s={1.05} /></>,
      ])}
    </>
  );
}

function pasture(v: number): ReactNode {
  return (
    <>
      <path d="M-46 -6 C-28 -20 -6 -18 10 -30 C22 -38 38 -36 46 -30 L46 -60 L-46 -60 Z" fill="#a8d590" clipPath="url(#tile-clip)" />
      <path d="M-46 30 C-26 18 2 30 20 22 C32 17 40 22 46 26 L46 60 L-46 60 Z" fill="#7fb46b" clipPath="url(#tile-clip)" />
      <polygon points={TOP_POINTS} fill="url(#pat-grass)" />
      <ellipse cx={0} cy={9} rx={18} ry={15} fill={PALETTE.pasture.clearing} opacity={0.75} />
      {pick(v, [
        <><Sheep x={-19} y={-23} s={1.18} /><Sheep x={19} y={-26} s={1.15} flip /><Sheep x={-30} y={7} s={1.05} /><Sheep x={29} y={11} s={1.1} flip /><Fence x={-25} y={37} len={20} angle={-18} /></>,
        <><Sheep x={-2} y={-29} s={1.2} /><Sheep x={-28} y={-6} s={1.05} flip /><Sheep x={29} y={-4} s={1.05} /><Sheep x={-21} y={33} s={1.1} /><Fence x={8} y={40} len={18} angle={-28} /></>,
        <><Sheep x={-20} y={-21} s={1.1} flip /><Sheep x={20} y={-23} s={1.15} /><Sheep x={29} y={16} s={1.05} flip /><Fence x={-36} y={16} len={14} angle={-34} /><Sheep x={-4} y={38} s={0.98} /></>,
      ])}
    </>
  );
}

function fields(v: number): ReactNode {
  const split = pick(v, ['M-50 30 C-20 18 6 -4 50 -16', 'M-50 -12 C-14 -4 10 10 50 26', 'M-30 -60 C-10 -20 -12 20 18 60']);
  return (
    <>
      <polygon points={TOP_POINTS} fill="url(#pat-rows-a)" />
      <path d={`${split} L60 70 L-60 70 Z`} fill="url(#pat-rows-b)" clipPath="url(#tile-clip)" />
      <path d={split} stroke="#c49b5c" strokeWidth={3.2} fill="none" clipPath="url(#tile-clip)" />
      <path d={split} stroke="#e2c28f" strokeWidth={1} fill="none" strokeDasharray="2 3" clipPath="url(#tile-clip)" />
      <ellipse cx={0} cy={9} rx={18} ry={15} fill={PALETTE.fields.clearing} />
      {pick(v, [
        <><Haystack x={-22} y={-13} s={1.25} /><Haystack x={24} y={-9} s={1.08} /><Haystack x={27} y={31} s={1.12} /></>,
        <><Haystack x={0} y={-23} s={1.2} /><Haystack x={-29} y={15} s={1.08} /><Haystack x={-13} y={39} s={1} /></>,
        <><Haystack x={20} y={-19} s={1.25} /><Haystack x={-28} y={-3} s={1.12} /><Haystack x={23} y={34} s={1} /></>,
      ])}
    </>
  );
}

function mountains(v: number): ReactNode {
  return (
    <>
      <polygon points={TOP_POINTS} fill="url(#pat-rock)" />
      <ellipse cx={0} cy={10} rx={18} ry={14} fill={PALETTE.mountains.clearing} />
      {pick(v, [
        <><Peak x={-6} y={-6} w={46} h={31} smoke /><Peak x={24} y={-1} w={26} h={20} snow={0.28} /><Rocks x={-27} y={31} s={1.15} /><Rocks x={24} y={35} s={0.95} /></>,
        <><Peak x={-20} y={-5} w={30} h={24} snow={0.3} /><Peak x={10} y={-8} w={40} h={31} /><Rocks x={-30} y={21} s={0.95} /><Rocks x={18} y={37} s={1.15} /></>,
        <><Peak x={2} y={-8} w={44} h={33} snow={0.36} /><Peak x={-28} y={7} w={22} h={16} snow={0.22} /><Peak x={30} y={11} w={20} h={15} snow={0.22} /><Rocks x={-8} y={41} s={1} /></>,
      ])}
    </>
  );
}

function desert(v: number): ReactNode {
  return (
    <>
      <path d="M-50 -14 C-30 -24 -14 -6 6 -16 C24 -25 36 -14 50 -20 L50 -60 L-50 -60 Z" fill="#f1e3bd" clipPath="url(#tile-clip)" />
      <path d="M-50 24 C-30 14 -12 30 10 20 C26 13 38 22 50 18 L50 60 L-50 60 Z" fill="#d9c28d" clipPath="url(#tile-clip)" />
      <polygon points={TOP_POINTS} fill="url(#pat-dunes)" />
      {pick(v, [
        <><Cactus x={-20} y={-12} s={1.3} /><Cactus x={26} y={13} s={1.1} /><Flowers x={-26} y={22} /><Flowers x={12} y={-30} seed={1} /><Flowers x={8} y={36} seed={2} /><Rocks x={-4} y={2} s={0.6} /></>,
        <><Cactus x={18} y={-14} s={1.25} /><Cactus x={-28} y={17} s={1.05} /><Flowers x={-12} y={-32} seed={2} /><Flowers x={24} y={28} seed={3} /><Flowers x={-4} y={38} /></>,
        <><Cactus x={-6} y={-18} s={1.3} /><Flowers x={-30} y={4} seed={1} /><Flowers x={28} y={-6} seed={3} /><Cactus x={20} y={35} s={0.95} /><Flowers x={-16} y={34} seed={2} /></>,
      ])}
    </>
  );
}

function gold(v: number): ReactNode {
  const river = pick(v, ['M-24 -50 C-30 -20 16 -16 8 6 C2 22 -26 26 -14 52', 'M26 -50 C30 -24 -20 -18 -10 6 C-2 24 30 26 18 52', 'M-50 -8 C-24 -24 -10 2 4 -6 C18 -14 30 8 50 0']);
  return (
    <>
      <polygon points={TOP_POINTS} fill="url(#pat-sand)" />
      <path d={river} stroke="#3c94ab" strokeWidth={11} fill="none" strokeLinecap="round" clipPath="url(#tile-clip)" />
      <path d={river} stroke="#5fb7c9" strokeWidth={7.5} fill="none" strokeLinecap="round" clipPath="url(#tile-clip)" />
      <path d={river} stroke="#a9e1ea" strokeWidth={1.4} fill="none" strokeDasharray="5 7" clipPath="url(#tile-clip)" />
      <ellipse cx={0} cy={9} rx={18} ry={15} fill={PALETTE.gold.clearing} opacity={0.9} />
      {pick(v, [
        <><Nugget x={22} y={-20} s={1.35} /><Nugget x={-30} y={4} s={1.2} /><Nugget x={26} y={24} s={1.4} /><Sparkle x={28} y={-26} s={1.2} /><Sparkle x={-24} y={-3} /><Sparkle x={32} y={18} s={1.1} /></>,
        <><Nugget x={-22} y={-18} s={1.35} /><Nugget x={28} y={4} s={1.3} /><Nugget x={-20} y={30} s={1.2} /><Sparkle x={-16} y={-24} s={1.2} /><Sparkle x={33} y={-2} /><Sparkle x={-14} y={25} /></>,
        <><Nugget x={-14} y={-28} s={1.3} /><Nugget x={18} y={-24} s={1.2} /><Nugget x={-26} y={22} s={1.3} /><Nugget x={24} y={30} s={1.2} /><Sparkle x={-8} y={-34} s={1.2} /><Sparkle x={30} y={25} /></>,
      ])}
    </>
  );
}

function fog(v: number): ReactNode {
  return (
    <>
      {pick(v, [
        <><Cloud x={-12} y={-24} s={1.2} /><Cloud x={18} y={-6} s={1.1} o={0.9} /><Cloud x={-18} y={22} s={1.05} o={0.95} /><Cloud x={14} y={32} s={0.9} /></>,
        <><Cloud x={10} y={-26} s={1.15} /><Cloud x={-20} y={-4} s={1.05} o={0.9} /><Cloud x={18} y={18} s={1.1} /><Cloud x={-10} y={36} s={0.85} o={0.95} /></>,
        <><Cloud x={-4} y={-28} s={1} /><Cloud x={-22} y={10} s={1.1} /><Cloud x={22} y={0} s={1.05} o={0.9} /><Cloud x={4} y={30} s={1.15} /></>,
      ])}
      <text y={8} textAnchor="middle" fontSize={22} fontWeight={800} fill="#8b9ba1" opacity={0.75} style={{ fontFamily: 'var(--font-display)' }}>?</text>
    </>
  );
}

const ART: Record<LandTerrain, (v: number) => ReactNode> = { forest, hills, pasture, fields, mountains, desert, gold, fog };

/** Definiciones compartidas (una vez por SVG): texturas, recorte y luz. Los dibujos van en <symbol> para reutilizarlos. */
export const TileDefs = memo(function TileDefs() {
  return (
    <defs>
      <clipPath id="tile-clip" clipPathUnits="userSpaceOnUse"><polygon points={TOP_POINTS} /></clipPath>
      <linearGradient id="tile-light" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.2} />
        <stop offset="0.55" stopColor="#fff" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={0.14} />
      </linearGradient>
      <pattern id="pat-rows-a" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
        <rect width={6} height={6} fill="#dfbb50" /><rect width={2.4} height={6} fill="#cda33f" />
      </pattern>
      <pattern id="pat-rows-b" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
        <rect width={6} height={6} fill="#e8c862" /><rect width={2} height={6} fill="#d6af48" />
      </pattern>
      <pattern id="pat-grass" width={11} height={9} patternUnits="userSpaceOnUse">
        <path d="M2 6 l1 -2.4 l1 2.4 M7.5 2.5 l0.9 -2 l0.9 2" stroke="#76ab62" strokeWidth={0.8} fill="none" />
      </pattern>
      <pattern id="pat-forest" width={10} height={10} patternUnits="userSpaceOnUse">
        <circle cx={2.5} cy={3} r={0.9} fill="#356f4b" /><circle cx={7.5} cy={8} r={0.8} fill="#4a8a5d" />
      </pattern>
      <pattern id="pat-strata" width={40} height={8} patternUnits="userSpaceOnUse">
        <path d="M0 5 Q10 2.4 20 5 T40 5" stroke="#b55a35" strokeWidth={1} fill="none" />
      </pattern>
      <pattern id="pat-rock" width={13} height={12} patternUnits="userSpaceOnUse">
        <circle cx={3} cy={3} r={0.9} fill="#717d86" /><circle cx={9.5} cy={8.5} r={0.7} fill="#717d86" /><circle cx={10} cy={2} r={0.5} fill="#97a3ab" />
      </pattern>
      <pattern id="pat-dunes" width={26} height={10} patternUnits="userSpaceOnUse">
        <path d="M0 7 Q6.5 3.4 13 7 T26 7" stroke="#d4bd85" strokeWidth={1.1} fill="none" />
      </pattern>
      <pattern id="pat-sand" width={9} height={9} patternUnits="userSpaceOnUse">
        <circle cx={2} cy={3} r={0.7} fill="#c9971f" /><circle cx={6.5} cy={7} r={0.6} fill="#f2cd60" />
      </pattern>
      {(Object.keys(ART) as LandTerrain[]).flatMap((tr) => [0, 1, 2].map((v) => (
        <symbol key={`${tr}-${v}`} id={`art-${tr}-${v}`} overflow="visible">{ART[tr](v)}</symbol>
      )))}
    </defs>
  );
});

/** Ficha de tierra con grosor, luz, dibujo y bisel. */
export function TileFace({ terrain, id }: { terrain: LandTerrain; id: string }) {
  const p = PALETTE[terrain];
  if (terrain === 'fog') {
    // niebla: bruma plana sobre el mar, sin costa ni grosor (no se sabe qué hay debajo)
    return (
      <>
        <polygon points={TOP_POINTS} fill="#d5dfe2" opacity={0.86} />
        <use href={`#art-fog-${variantOf(id)}`} />
        <polygon points={TOP_POINTS} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={1.2} strokeDasharray="5 4" />
      </>
    );
  }
  return (
    <>
      <polygon points={SIDE_POINTS} fill={p.side} />
      <polygon points={TOP_POINTS} fill={p.base} />
      <use href={`#art-${terrain}-${variantOf(id)}`} />
      <polygon points={TOP_POINTS} fill="url(#tile-light)" />
      <polyline points={BEVEL_LIGHT} fill="none" stroke="#fff" strokeOpacity={0.32} strokeWidth={1.3} strokeLinejoin="round" />
      <polyline points={BEVEL_DARK} fill="none" stroke="#000" strokeOpacity={0.13} strokeWidth={1.3} strokeLinejoin="round" />
    </>
  );
}

/** Pips de probabilidad bajo el número. */
export function Pips({ n }: { n: number }) {
  const k = 6 - Math.abs(7 - n);
  return (
    <g className="pips">
      {Array.from({ length: k }, (_, i) => <circle key={i} cx={(i - (k - 1) / 2) * 3.4} cy={0} r={1.25} />)}
    </g>
  );
}

/** Ficha de número: un disco de madera clara con sombra. */
export function NumberToken({ n }: { n: number }) {
  const hot = n === 6 || n === 8;
  return (
    <g className={`token${hot ? ' hot' : ''}`}>
      <ellipse cx={1.2} cy={2.6} rx={15} ry={14.2} className="token-shadow" />
      <circle r={14.6} className="token-disc" />
      <circle r={12.6} className="token-ring" />
      <text y={3.6} textAnchor="middle">{n}</text>
      <g transform="translate(0 9.2)"><Pips n={n} /></g>
    </g>
  );
}

/** Mar alrededor de la isla: sombra, aguas bajas y espuma, en ese orden. */
export function Coast({ centers }: { centers: [number, number][] }) {
  const halo = hexPoints(1.17);
  const foam = hexPoints(1.045);
  const body = hexPoints(1);
  return (
    <g className="coast" aria-hidden="true">
      <g opacity={0.3} fill="#0b3a43">{centers.map(([x, y], i) => <polygon key={i} points={body} transform={`translate(${x + 4} ${y + 12})`} />)}</g>
      <g opacity={0.5} fill="#6cc6c2">{centers.map(([x, y], i) => <polygon key={i} points={halo} transform={`translate(${x} ${y})`} />)}</g>
      <g className="foam" opacity={0.8} fill="#eef9f6">{centers.map(([x, y], i) => <polygon key={i} points={foam} transform={`translate(${x} ${y + 2})`} />)}</g>
    </g>
  );
}

/** Casilla de mar: borde apenas visible y un par de olas. */
export function SeaFace({ id }: { id: string }) {
  const v = variantOf(id);
  const waves = [['M-16 -14 q3 -3 6 0 t6 0', 'M6 14 q3 -3 6 0 t6 0'], ['M-4 -22 q3 -3 6 0 t6 0', 'M-20 10 q3 -3 6 0 t6 0'], ['M8 -10 q3 -3 6 0 t6 0', 'M-14 20 q3 -3 6 0 t6 0']][v];
  return (
    <>
      <polygon points={TOP_POINTS} className="sea-cell" />
      {waves.map((d) => <path key={d} d={d} className="wave" />)}
    </>
  );
}

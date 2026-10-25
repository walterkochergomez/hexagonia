// Ilustraciones propias en SVG: cartas de recursos, piezas de madera con volumen, dados y símbolos de jugador.
// Luz desde arriba a la izquierda, como en las fichas del tablero.
import type { Card, ChronicleCard, Goods, Terrain } from '../engine/types';
export { Pips } from './tiles';

export const RES_TERRAIN: Record<Card, string> = {
  lumber: 'forest', brick: 'hills', wool: 'pasture', grain: 'fields', ore: 'mountains',
  paper: 'paper', cloth: 'cloth', coin: 'coin',
};

/** Ícono pequeño de terreno (descripciones y elección de terreno). */
export function TerrainGlyph({ terrain }: { terrain: Terrain | 'fog' | string }) {
  const card = (Object.keys(RES_TERRAIN) as Card[]).find((c) => RES_TERRAIN[c] === terrain);
  return card ? <CardArt card={card} /> : null;
}

const PANEL: Record<Card, string> = {
  lumber: '#3d7a54', brick: '#c4673f', wool: '#8fc27a', grain: '#dfbb50', ore: '#808c96',
  paper: '#e3d6b3', cloth: '#a993cf', coin: '#d3a64d',
};

/** Dibujo del recurso, centrado en 0,0 y de unos 18 de ancho. */
function CardArt({ card }: { card: Card }) {
  switch (card) {
    case 'lumber':
      return (
        <g transform="translate(-0.6 0) scale(0.82)">
          {[[-5.6, 4.4], [5.4, 4.4], [0, -1.6]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x={-6.6} y={-2.6} width={12} height={5.2} rx={2.6} fill="#80522f" stroke="#4e2f19" strokeWidth={0.7} />
              <path d="M-5 -1.2 H3" stroke="#a87147" strokeWidth={0.8} strokeLinecap="round" />
              <circle cx={5.4} cy={0} r={2.6} fill="#e6c595" stroke="#4e2f19" strokeWidth={0.7} />
              <circle cx={5.4} cy={0} r={1.2} fill="none" stroke="#b98d5c" strokeWidth={0.5} />
            </g>
          ))}
        </g>
      );
    case 'brick':
      return (
        <g strokeWidth={0.7} stroke="#6e2f19" strokeLinejoin="round" transform="translate(-0.8 0.4) scale(0.86)">
          {[[-5, 4], [5, 4], [0, -1.4]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M-4.8 -1.2 L-2.8 -3.2 L6.4 -3.2 L4.4 -1.2 Z" fill="#ea9a6d" />
              <path d="M4.4 -1.2 L6.4 -3.2 L6.4 1.6 L4.4 3.6 Z" fill="#9e4426" />
              <rect x={-4.8} y={-1.2} width={9.2} height={4.8} fill="#cf6b3f" />
            </g>
          ))}
        </g>
      );
    case 'wool':
      return (
        <g transform="translate(-0.6 0.4) scale(1.32)">
          <path d="M-2.6 3.4 L-2.6 6.2 M2.2 3.4 L2.2 6.2" stroke="#3b4148" strokeWidth={1.3} strokeLinecap="round" />
          <g fill="#fbfdfc" stroke="#9fb0ac" strokeWidth={0.5}>
            <circle cx={-3.4} cy={0.6} r={3.3} /><circle cx={3} cy={0.6} r={3.3} /><circle cx={-0.2} cy={-1.8} r={3.4} /><circle cx={0} cy={1.4} r={3.8} />
          </g>
          <g fill="#fbfdfc"><circle cx={-0.2} cy={0.2} r={3.2} /><circle cx={-2.4} cy={0.9} r={2.4} /><circle cx={2.2} cy={0.9} r={2.4} /></g>
          <ellipse cx={5.6} cy={-0.6} rx={2.1} ry={2.6} fill="#3b4148" />
        </g>
      );
    case 'grain':
      return (
        <g>
          {[-3.6, -1.2, 1.2, 3.6].map((x, i) => (
            <path key={i} d={`M${x * 0.35} 8 L${x} -5`} stroke="#9a7420" strokeWidth={0.9} />
          ))}
          {[-3.6, -1.2, 1.2, 3.6].map((x, i) => (
            <g key={i} transform={`translate(${x} ${-6 - (i % 2) * 1.4}) rotate(${x * 3})`}>
              <ellipse rx={1.7} ry={4.2} fill="#f4d77a" stroke="#9a7420" strokeWidth={0.6} />
              <path d="M-1.6 -1.6 L1.6 -0.6 M-1.6 1.2 L1.6 2.2" stroke="#c99a35" strokeWidth={0.5} />
            </g>
          ))}
          <path d="M-3 2.2 Q0 3.6 3 2.2 L3 4 Q0 5.4 -3 4 Z" fill="#b5532f" stroke="#6e2f19" strokeWidth={0.5} />
        </g>
      );
    case 'ore':
      return (
        <g strokeWidth={0.7} stroke="#3c464d" strokeLinejoin="round">
          <path d="M-8.6 6 L-7 -1 L-2.4 -3.4 L0.6 1.4 L-0.4 6 Z" fill="#8f9ba3" />
          <path d="M-2.4 -3.4 L0.6 1.4 L-0.4 6 L-2.2 6 L-3.4 0 Z" fill="#6b7780" />
          <path d="M-1 6 L1 -2.6 L5 -6 L8.6 -0.6 L7.6 6 Z" fill="#a9b4bb" />
          <path d="M5 -6 L8.6 -0.6 L7.6 6 L5.4 6 L4.4 -1 Z" fill="#738089" />
          <path d="M1.8 -1.6 L4.4 -4.2" stroke="#eef3f5" strokeWidth={1} strokeLinecap="round" />
        </g>
      );
    case 'paper':
      return (
        <g stroke="#7a6436" strokeWidth={0.7}>
          <rect x={-6} y={-7} width={12} height={14} fill="#fbf5e3" />
          <rect x={-7.4} y={-8.6} width={14.8} height={3} rx={1.5} fill="#e4d4a8" />
          <rect x={-7.4} y={5.6} width={14.8} height={3} rx={1.5} fill="#e4d4a8" />
          <path d="M-3.8 -2.6 H3.8 M-3.8 0 H3.8 M-3.8 2.6 H1.6" strokeLinecap="round" />
        </g>
      );
    case 'cloth':
      return (
        <g stroke="#4a3a70" strokeWidth={0.7} strokeLinejoin="round">
          <path d="M-8 -5 L4 -7 L8 -3 L-4 -1 Z" fill="#cbbbe9" />
          <path d="M-8 -5 L-4 -1 L-4 7 L-8 3 Z" fill="#6f5aa1" />
          <path d="M-4 -1 L8 -3 L8 5 L-4 7 Z" fill="#9b84cc" />
          <path d="M-4 2 L8 0 M-4 4.6 L8 2.6" stroke="#e7def7" strokeWidth={0.8} />
        </g>
      );
    case 'coin':
      return (
        <g>
          <ellipse cx={0.6} cy={1.2} rx={8} ry={8} fill="#8f6612" />
          <circle r={8} fill="#f0c654" stroke="#8f6612" strokeWidth={0.8} />
          <circle r={5.6} fill="none" stroke="#c99a2a" strokeWidth={0.8} />
          <path d="M0 -3.6 L3.1 -1.8 L3.1 1.8 L0 3.6 L-3.1 1.8 L-3.1 -1.8 Z" fill="#c99a2a" />
          <path d="M-5.2 -3.6 Q-3.6 -6 -0.6 -6.6" stroke="#fff3c4" strokeWidth={1} fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/** Carta de recurso: marco claro, panel del color del terreno y el recurso dibujado. */
export function CardIcon({ card, size = 28 }: { card: Card; size?: number }) {
  return (
    <svg className={`card-icon c-${card}`} width={size} height={size} viewBox="-15 -15 30 30" aria-hidden="true">
      <rect x={-11.2} y={-14} width={23.4} height={29} rx={3.6} fill="rgba(20,40,45,.28)" />
      <rect x={-11.7} y={-14.6} width={23.4} height={29} rx={3.6} fill="#fbf7ee" stroke="rgba(38,50,56,.4)" strokeWidth={0.8} />
      <rect x={-9.7} y={-12.6} width={19.4} height={25} rx={2.4} fill={PANEL[card]} />
      <path d="M-9.7 -10.2 Q-9.7 -12.6 -7.3 -12.6 H7.3 Q9.7 -12.6 9.7 -10.2 V-4 Q0 -7 -9.7 -2 Z" fill="#fff" opacity={0.16} />
      <CardArt card={card} />
    </svg>
  );
}

/** Reverso de carta: desarrollo/progreso (azul petróleo) o recurso tapado (gris). */
export function CardBack({ size = 28, kind = 'dev' }: { size?: number; kind?: 'dev' | 'res' }) {
  return (
    <svg className="card-icon card-back" width={size} height={size} viewBox="-15 -15 30 30" aria-hidden="true">
      <rect x={-11.2} y={-14} width={23.4} height={29} rx={3.6} fill="rgba(20,40,45,.28)" />
      <rect x={-11.7} y={-14.6} width={23.4} height={29} rx={3.6} fill="#fbf7ee" stroke="rgba(38,50,56,.4)" strokeWidth={0.8} />
      <rect x={-9.7} y={-12.6} width={19.4} height={25} rx={2.4} fill={kind === 'dev' ? '#1c6e78' : '#66767c'} />
      <path d="M0 -7 L6 -3.5 L6 3.5 L0 7 L-6 3.5 L-6 -3.5 Z" fill="none" stroke="#f7f0dd" strokeWidth={1.3} />
      <path d="M0 -3.2 L2.8 -1.6 L2.8 1.6 L0 3.2 L-2.8 1.6 L-2.8 -1.6 Z" fill="#d7a84a" />
    </svg>
  );
}

const SYMBOLS = ['circle', 'triangle', 'square', 'diamond', 'star', 'pentagon'] as const;

function starPath(r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function polyPath(n: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((2 * Math.PI) / n) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

/** Forma del símbolo de un jugador (para no depender sólo del color). */
export function SymbolShape({ color, r = 3, className }: { color: number; r?: number; className?: string }) {
  const s = SYMBOLS[color % 6];
  if (s === 'circle') return <circle r={r} className={className} />;
  if (s === 'square') return <rect x={-r * 0.85} y={-r * 0.85} width={r * 1.7} height={r * 1.7} className={className} />;
  if (s === 'triangle') return <path d={polyPath(3, r * 1.15)} className={className} />;
  if (s === 'diamond') return <path d={polyPath(4, r * 1.15)} className={className} />;
  if (s === 'star') return <path d={starPath(r * 1.3)} className={className} />;
  return <path d={polyPath(5, r * 1.1)} className={className} />;
}

export function PlayerMark({ color, size = 18 }: { color: number; size?: number }) {
  return (
    <svg className="player-mark" width={size} height={size} viewBox="-9 -9 18 18" aria-hidden="true">
      <circle r={8.5} className={`pfill p${color}`} />
      <SymbolShape color={color} r={3.6} className="sym" />
    </svg>
  );
}

// ---------- piezas del tablero (centradas en el vértice o la arista) ----------

const Ground = ({ rx, ry = 2.8, x = 2, y = 8.4 }: { rx: number; ry?: number; x?: number; y?: number }) => <ellipse cx={x} cy={y} rx={rx} ry={ry} className="piece-shadow" />;

export function SettlementShape({ color }: { color: number }) {
  return (
    <g className={`piece p${color}`}>
      <Ground rx={11} />
      <path d="M3 8 L3 -1 L9.4 -4.6 L9.4 4.6 Z" className="pfill-d" />
      <path d="M-3 -7.5 L3.4 -11 L9.4 -4.6 L3 -1 Z" className="pfill-l" />
      <path d="M-9 8 L-9 -1 L-3 -7.5 L3 -1 L3 8 Z" className="pfill" />
      <g transform="translate(-3 3)"><SymbolShape color={color} r={2.5} className="sym" /></g>
    </g>
  );
}

export function CityShape({ color, wall, metro, damaged }: { color: number; wall?: boolean; metro?: string; damaged?: boolean }) {
  return (
    <g className={`piece p${color}${damaged ? ' damaged' : ''}`}>
      <Ground rx={wall ? 18 : 15} ry={3.2} x={1} y={wall ? 10.4 : 8.6} />
      {wall && (
        <g className="wall">
          <path d="M-17.5 10 L-17.5 5 L15.5 5 L15.5 10 Z" className="wall-front" />
          <path d="M-17.5 5 L-14.5 2.2 L18.5 2.2 L15.5 5 Z" className="wall-top" />
          <path d="M15.5 10 L15.5 5 L18.5 2.2 L18.5 7.2 Z" className="wall-side" />
        </g>
      )}
      <path d="M-6 8 L-6 -9 L-2.6 -12 L-2.6 5 Z" className="pfill-d" />
      <path d="M-13 -9 L-9.6 -12 L-2.6 -12 L-6 -9 Z" className="pfill-l" />
      <path d="M-13 8 L-13 -9 L-6 -9 L-6 8 Z" className="pfill" />
      <rect x={-11} y={-6} width={3} height={3.6} rx={0.6} className="window" />
      <path d="M6 8 L6 -1 L11.6 -4.4 L11.6 5 Z" className="pfill-d" />
      <path d="M0 -7 L5.6 -10.4 L11.6 -4.4 L6 -1 Z" className="pfill-l" />
      <path d="M-6 8 L-6 -1 L0 -7 L6 -1 L6 8 Z" className="pfill" />
      {metro && (
        <g className={`metro m-${metro}`}>
          <path d="M-9.6 -12 L-9.6 -23" />
          <path d="M-9.6 -23 L-1.6 -20.4 L-9.6 -17.8 Z" className="flag" />
        </g>
      )}
      <g transform="translate(0 3.4)"><SymbolShape color={color} r={2.5} className="sym" /></g>
      {damaged && <path d="M-11 -4 L-9 -1 L-11 2 L-9 5" className="crack" />}
    </g>
  );
}

export function KnightShape({ color, level, active }: { color: number; level: number; active: boolean }) {
  return (
    <g className={`piece knight p${color}${active ? ' active' : ''}`}>
      <Ground rx={10} ry={2.6} x={1.5} y={10} />
      <ellipse cx={0} cy={8} rx={8.6} ry={3} className="pfill-d" />
      <ellipse cx={0} cy={6.6} rx={8.6} ry={3} className="pfill" />
      <path d="M-6.6 -9 L6.6 -9 L6.6 -1.4 Q6.6 4.4 0 7.2 Q-6.6 4.4 -6.6 -1.4 Z" className="shield" />
      <path d="M-4.6 -7 L4.6 -7 L4.6 -1.6 Q4.6 2.6 0 4.8 Q-4.6 2.6 -4.6 -1.6 Z" className="shield-inner" />
      {Array.from({ length: level }, (_, i) => (
        <circle key={i} cx={(i - (level - 1) / 2) * 3.4} cy={-2.2} r={1.35} className="knight-pip" />
      ))}
    </g>
  );
}

export function RobberShape() {
  return (
    <g className="robber">
      <ellipse cx={2} cy={10.6} rx={9.6} ry={2.6} className="piece-shadow" />
      <path d="M-7.6 10 C-8.2 1.4 -5 -3.4 0 -3.4 C5 -3.4 8.2 1.4 7.6 10 Z" className="body" />
      <path d="M-7.4 4.2 C-2.4 5.8 2.4 5.8 7.4 4.2" className="stripe" />
      <path d="M-5.6 7.6 C-6 2.6 -4.2 -0.6 -1.2 -1.8" className="shine" />
      <circle cx={0} cy={-7.2} r={4.3} className="body" />
      <ellipse cx={0} cy={-10.4} rx={8.2} ry={2.3} className="brim" />
      <path d="M-4 -10.6 L-3.4 -14.6 Q0 -16 3.4 -14.6 L4 -10.6 Z" className="body" />
      <path d="M-3.8 -11.8 L3.8 -11.8" className="band" />
    </g>
  );
}

export function ShipShape({ color, war }: { color?: number; war?: boolean }) {
  const pirate = color === undefined;
  return (
    <g className={pirate ? 'pirate' : `piece ship p${color}${war ? ' warship' : ''}`}>
      <ellipse cx={1.5} cy={8.8} rx={12} ry={2.4} className="piece-shadow" />
      <path d="M-12 1.5 L12 1.5 L8.5 8 L-8.5 8 Z" className={pirate ? 'hull' : 'pfill'} />
      <path d="M-10.4 4.6 L10.4 4.6 L8.5 8 L-8.5 8 Z" className={pirate ? 'hull-d' : 'pfill-d'} />
      {war && <g className="gunports">{[-6, -1.5, 3].map((x) => <rect key={x} x={x} y={2.6} width={2.6} height={1.7} rx={0.4} />)}</g>}
      <path d="M0 1.5 L0 -15" className="mast" />
      <path d="M0.9 -14 Q9.4 -8 8.6 -0.4 L0.9 -0.4 Z" className="sail" />
      <path d="M-0.9 -11.6 L-0.9 -0.4 L-8 -0.4 Z" className="jib" />
      {war
        ? <path d="M0 -15 L8.6 -14.4 L6.4 -12.9 L8.6 -11.4 L0 -11.4 Z" className="war-pennant" />
        : <path d="M0 -15 L5.4 -13.6 L0 -12.2 Z" className={pirate ? 'pennant' : 'pfill'} />}
      {pirate && <path d="M3 -8.4 L6.4 -4.6 M6.4 -8.4 L3 -4.6" className="mark" />}
    </g>
  );
}

/** Mercancías de las carretas: mármol, vidrio, herramientas y arena, sobre una ficha redonda. */
export function GoodsIcon({ goods, size = 16 }: { goods: Goods; size?: number }) {
  return (
    <g className={`goods g-${goods}`} transform={`scale(${size / 16})`}>
      <circle r={8} className="goods-disc" />
      {goods === 'marble' && (
        <>
          <path d="M-5 -1.6 L0.8 -4.6 L5.2 -2 L5.2 3 L-0.6 5.8 L-5 3.4 Z" className="goods-marble" />
          <path d="M-5 -1.6 L-0.6 1 L5.2 -2 M-0.6 1 L-0.6 5.8" className="goods-edge" />
          <path d="M1.6 -2.4 Q2.6 0 1.4 1.6" className="goods-vein" />
        </>
      )}
      {goods === 'glass' && (
        <>
          <path d="M-1.8 -5.6 L1.8 -5.6 L1.8 -3 Q4.6 -1.6 4.6 1.6 L4.6 4.6 Q4.6 5.6 3.6 5.6 L-3.6 5.6 Q-4.6 5.6 -4.6 4.6 L-4.6 1.6 Q-4.6 -1.6 -1.8 -3 Z" className="goods-glass" />
          <path d="M-2.6 0.6 L-2.6 3.8" className="goods-shine" />
        </>
      )}
      {goods === 'tools' && (
        <>
          <path d="M-4.6 4.6 L1.4 -1.4" className="goods-handle" />
          <path d="M-0.6 -3.4 L2.4 -6.4 L6 -2.8 L3 0.2 Z" className="goods-head" />
        </>
      )}
      {goods === 'sand' && (
        <>
          <path d="M-5.4 5 Q-5.4 -2.6 -1.8 -3.6 L1.8 -3.6 Q5.4 -2.6 5.4 5 Z" className="goods-sack" />
          <path d="M-1.8 -3.6 L-2.6 -5.6 L2.6 -5.6 L1.8 -3.6" className="goods-sack-top" />
          <path d="M-3.4 2.4 Q0 1 3.4 2.4" className="goods-sand" />
        </>
      )}
    </g>
  );
}

/** Carreta: caja del color del jugador sobre dos ruedas, con el nivel en la caja y la mercancía encima. */
export function WagonShape({ color, level, cargo }: { color: number; level: number; cargo: Goods | null }) {
  return (
    <g className={`piece wagon p${color}`}>
      <ellipse cx={1} cy={9.4} rx={12.5} ry={2.4} className="piece-shadow" />
      <path d="M-14 2.4 L-8 1.6" className="wagon-pole" />
      <path d="M-8.4 -3.6 L9.4 -3.6 L8.4 4 L-7.4 4 Z" className="pfill" />
      <path d="M-8.4 -3.6 L9.4 -3.6 L9.1 -1.6 L-8.1 -1.6 Z" className="pfill-l" />
      <circle cx={-4.2} cy={5.6} r={3.6} className="wagon-wheel" />
      <circle cx={5.4} cy={5.6} r={3.6} className="wagon-wheel" />
      <circle cx={-4.2} cy={5.6} r={0.9} className="wagon-hub" />
      <circle cx={5.4} cy={5.6} r={0.9} className="wagon-hub" />
      <text x={0.6} y={2.8} textAnchor="middle" className="wagon-level">{level}</text>
      {cargo && <g transform="translate(0.6 -9.6)"><GoodsIcon goods={cargo} size={12} /></g>}
    </g>
  );
}

/** Bárbaro: guerrero con casco de cuernos (en las casillas de la costa). */
export function BarbarianShape() {
  return (
    <g className="barbarian">
      <ellipse cx={0.8} cy={9.4} rx={6.4} ry={1.8} className="piece-shadow" />
      <path d="M-4.6 9 L-4.2 1 Q0 -2.4 4.2 1 L4.6 9 Z" className="barb-body" />
      <path d="M-4.4 4.4 L4.4 4.4" className="barb-belt" />
      <circle cx={0} cy={-3.4} r={3.4} className="barb-head" />
      <path d="M-3.6 -4.4 Q0 -8.6 3.6 -4.4 Z" className="barb-helm" />
      <path d="M-3.4 -5.4 Q-6.6 -7 -6.2 -10.4 M3.4 -5.4 Q6.6 -7 6.2 -10.4" className="barb-horn" />
      <path d="M5.6 9 L7.6 -4" className="barb-axe-handle" />
      <path d="M7.4 -3.4 Q11 -4.6 10.4 -0.2 Z" className="barb-axe" />
    </g>
  );
}

/** Caballero de la invasión: escudo del color del jugador, parado en un lado. */
export function GuardShape({ color, moved }: { color: number; moved?: boolean }) {
  return (
    <g className={`piece guard p${color}${moved ? ' moved' : ''}`}>
      <ellipse cx={1.2} cy={8.6} rx={8} ry={2.2} className="piece-shadow" />
      <path d="M-6.4 -7 L6.4 -7 L6.4 0 Q6.4 5.8 0 8.6 Q-6.4 5.8 -6.4 0 Z" className="pfill" />
      <path d="M-6.4 -7 L6.4 -7 L6.4 -3.6 L-6.4 -3.6 Z" className="pfill-d" />
      <g transform="translate(0 1.4)"><SymbolShape color={color} r={2.4} className="sym" /></g>
      <path d="M0 -7 L0 -12.4" className="guard-plume-stem" />
      <path d="M0 -12.4 Q4 -14 5.4 -10.6 Q2.6 -11.6 0 -10.2 Z" className="guard-plume" />
    </g>
  );
}

/** La flota corsaria: dos barcos oscuros juntos. */
export function FleetShape() {
  return (
    <g className="fleet">
      <g transform="translate(-8 4) scale(.82)"><ShipShape /></g>
      <g transform="translate(5 -1)"><ShipShape /></g>
    </g>
  );
}

/** Bastión corsario: torre de piedra con el estandarte del jugador al que le toca y sus muescas. */
export function FortShape({ color, chips, total = 3 }: { color: number; chips: number; total?: number }) {
  return (
    <g className="fort">
      <ellipse cx={1.5} cy={9.4} rx={13} ry={3} className="piece-shadow" />
      <path d="M-10 9 L-10 -4 L-10 -8 L-6.2 -8 L-6.2 -5.4 L-2 -5.4 L-2 -8 L2 -8 L2 -5.4 L6.2 -5.4 L6.2 -8 L10 -8 L10 9 Z" className="fort-wall" />
      <path d="M10 9 L10 -8 L12.6 -10 L12.6 6.8 Z" className="fort-side" />
      <path d="M-3 9 L-3 3.4 Q0 0.6 3 3.4 L3 9 Z" className="fort-gate" />
      <path d="M0 -8 L0 -19" className="fort-pole" />
      <g className={`p${color}`}><path d="M0 -19 L8.4 -16.6 L0 -14.2 Z" className="pfill fort-flag" /></g>
      {Array.from({ length: total }, (_, i) => (
        <rect key={i} x={-8 + i * 5.6} y={-2.4} width={4.4} height={3.2} rx={0.6} className={i < chips ? 'fort-chip' : 'fort-chip gone'} />
      ))}
    </g>
  );
}

/** Banderín del punto de desembarco de un jugador. */
export function LandingFlag({ color }: { color: number }) {
  return (
    <g className={`landing p${color}`}>
      <ellipse cx={0.6} cy={6.6} rx={3.6} ry={1.3} className="piece-shadow" />
      <path d="M0 6.4 L0 -10" className="landing-pole" />
      <path d="M0 -10 L8 -7.4 L0 -4.8 Z" className="pfill" />
    </g>
  );
}

/** Aldea tejedora: choza con su número, las telas que le quedan y quiénes ya llegaron. */
export function VillageShape({ n, cloth, max = 5, linked, lit }: { n: number; cloth: number; max?: number; linked: number[]; lit?: boolean }) {
  return (
    <g className={`village${cloth ? '' : ' empty'}${lit ? ' lit' : ''}`}>
      <ellipse cx={1} cy={11.6} rx={12} ry={2.6} className="piece-shadow" />
      <path d="M-8 11 L-8 3 L8 3 L8 11 Z" className="hut-wall" />
      <path d="M-11 4 L0 -6.4 L11 4 Z" className="hut-roof" />
      <path d="M-2.2 11 L-2.2 6.4 L2.2 6.4 L2.2 11 Z" className="hut-door" />
      <g transform="translate(0 -14.6)">
        <circle r={9.6} className="village-disc" />
        <text y={3.6} textAnchor="middle" className={`village-n${n === 6 || n === 8 ? ' hot' : ''}`}>{n}</text>
      </g>
      <g transform="translate(13 -6)" className="bolts">
        {Array.from({ length: max }, (_, i) => <rect key={i} x={-2.6} y={i * 3.4} width={5.2} height={2.6} rx={1.2} className={i < cloth ? 'bolt' : 'bolt gone'} />)}
      </g>
      {linked.map((c, i) => <g key={i} transform={`translate(${-13} ${-8 + i * 5})`}><circle r={2.3} className={`pfill p${c} village-link`} /></g>)}
    </g>
  );
}

/** Chozas del pueblo isleño (adorno de sus islitas). */
export function Huts() {
  return (
    <g className="huts" aria-hidden="true">
      {[[-11, 12, 0.62], [9, 15, 0.55], [-1, 20, 0.5]].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <ellipse cx={1} cy={11.4} rx={11} ry={2.4} className="piece-shadow" />
          <path d="M-8 11 L-8 3 L8 3 L8 11 Z" className="hut-wall" />
          <path d="M-11 4 L0 -6.4 L11 4 Z" className="hut-roof" />
          <path d="M-2.2 11 L-2.2 6.4 L2.2 6.4 L2.2 11 Z" className="hut-door" />
        </g>
      ))}
    </g>
  );
}

/** Regalo del pueblo isleño en un lado de la costa. */
export function GiftToken({ kind, harbor }: { kind: 'vp' | 'dev' | 'harbor'; harbor?: string }) {
  if (kind === 'vp') {
    return (
      <g className="gift gift-vp">
        <circle r={9} className="gift-disc" />
        <path d="M0 -6.2 L1.7 -2.1 L6 -1.9 L2.7 0.9 L3.8 5.1 L0 2.8 L-3.8 5.1 L-2.7 0.9 L-6 -1.9 L-1.7 -2.1 Z" className="gift-star" />
      </g>
    );
  }
  if (kind === 'dev') {
    return (
      <g className="gift gift-dev" transform="rotate(-8)">
        <rect x={-6.4} y={-8.6} width={12.8} height={17.2} rx={2} className="gift-card" />
        <path d="M0 -5.2 L3.6 0 L0 5.2 L-3.6 0 Z" className="gift-card-mark" />
      </g>
    );
  }
  return (
    <g className="gift gift-harbor">
      <circle r={9.6} className="gift-port" />
      {harbor === 'any' || !harbor
        ? <text y={3.2} textAnchor="middle" className="gift-port-text">3:1</text>
        : <><g transform="translate(-6 -10)"><CardIcon card={harbor as Card} size={12} /></g><text y={7.6} textAnchor="middle" className="gift-port-text small">2:1</text></>}
    </g>
  );
}

/** Dibujo de cada gran obra en cuatro niveles: los que faltan se ven en línea punteada. */
export function WonderArt({ id, level, size = 56 }: { id: string; level: number; size?: number }) {
  const tiers = WONDER_TIERS[id] ?? WONDER_TIERS.tower;
  return (
    <svg className={`wonder-art w-${id}`} width={size} height={size} viewBox="-24 -26 48 50" aria-hidden="true">
      <ellipse cx={0} cy={21.4} rx={19} ry={2.8} className="piece-shadow" />
      {tiers.map((d, i) => <path key={i} d={d} className={i < level ? 'tier built' : 'tier'} />)}
    </svg>
  );
}

const WONDER_TIERS: Record<string, string[]> = {
  tower: [
    'M-11 21 L-11 12 L11 12 L11 21 Z',
    'M-9 12 L-9 2 L9 2 L9 12 Z',
    'M-7 2 L-7 -8 L7 -8 L7 2 Z',
    'M-9 -8 L9 -8 L6 -13 L-6 -13 Z M-4 -13 L-4 -19 L4 -19 L4 -13 Z M-6 -19 L0 -25 L6 -19 Z',
  ],
  library: [
    'M-20 21 L-20 16 L20 16 L20 21 Z',
    'M-16 16 L-16 1 L-12 1 L-12 16 Z M-6 16 L-6 1 L-2 1 L-2 16 Z M2 16 L2 1 L6 1 L6 16 Z M12 16 L12 1 L16 1 L16 16 Z',
    'M-19 1 L-19 -4 L19 -4 L19 1 Z',
    'M-20 -4 L0 -17 L20 -4 Z',
  ],
  lock: [
    'M-21 21 L-21 15 L21 15 L21 21 Z',
    'M-21 15 L-21 0 L-14 0 L-14 15 Z M14 15 L14 0 L21 0 L21 15 Z',
    'M-14 15 L-14 2 L-1 4 L-1 15 Z M1 15 L1 4 L14 2 L14 15 Z',
    'M-23 0 L-23 -7 L23 -7 L23 0 Z M-19 -7 L-19 -13 L-15 -13 L-15 -7 Z M15 -7 L15 -13 L19 -13 L19 -7 Z',
  ],
  mills: [
    'M-12 21 L-12 14 L12 14 L12 21 Z',
    'M-9 14 L-7 0 L7 0 L9 14 Z',
    'M-9 0 L0 -9 L9 0 Z',
    'M0 -5 L-14 -19 L-11 -21 L1 -7 Z M0 -5 L14 -19 L16 -16 L2 -3 Z M0 -5 L-15 8 L-17 5 L-2 -6 Z M0 -5 L13 9 L10 11 L-1 -3 Z',
  ],
  observatory: [
    'M-18 21 L-18 15 L18 15 L18 21 Z',
    'M-14 15 L-14 3 L14 3 L14 15 Z',
    'M-14 3 Q-14 -13 0 -13 Q14 -13 14 3 Z',
    'M3 -9 L16 -22 L19 -19 L6 -6 Z',
  ],
};

export function MerchantShape({ color }: { color: number }) {
  return (
    <g className={`piece p${color}`}>
      <Ground rx={10} ry={2.4} y={8.2} />
      <path d="M-7.4 7.6 L-7.4 -0.6 L7.4 -0.6 L7.4 7.6 Z" className="stall" />
      <path d="M-2.4 7.6 L-2.4 2.4 L2.4 2.4 L2.4 7.6 Z" className="window" />
      <path d="M-10 -0.6 L0 -10.4 L10 -0.6 Z" className="pfill" />
      <path d="M0 -10.4 L-3.4 -0.6 M0 -10.4 L3.4 -0.6" className="awning" />
      <path d="M0 -10.4 L0 -14.6 L4.4 -13 L0 -11.6" className="pfill" />
    </g>
  );
}

const SPOTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-5, -5], [5, 5]],
  3: [[-5, -5], [0, 0], [5, 5]],
  4: [[-5, -5], [5, -5], [-5, 5], [5, 5]],
  5: [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]],
  6: [[-5, -5], [5, -5], [-5, 0], [5, 0], [-5, 5], [5, 5]],
};

/** Cara de dado con relieve; `size` en píxeles. */
export function DieFace({ value, tone, size = 34 }: { value: number; tone: 'red' | 'light'; size?: number }) {
  return (
    <svg className={`die die-${tone}`} width={size} height={size} viewBox="-12.5 -12.5 25 25" role="img" aria-label={String(value)}>
      <rect x={-10.6} y={-10} width={22} height={22} rx={5.4} className="die-shadow" />
      <rect x={-11} y={-11} width={22} height={22} rx={5.4} className="face" />
      <path d="M-7.6 -9.6 H5.6 Q9.6 -9.6 9.6 -5.6" className="sheen" />
      {(SPOTS[value] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.15} className="spot" />)}
    </svg>
  );
}

export function EventFace({ face, size = 34 }: { face: string; size?: number }) {
  return (
    <svg className={`die die-event ev-${face}`} width={size} height={size} viewBox="-12.5 -12.5 25 25" role="img" aria-label={face}>
      <rect x={-10.6} y={-10} width={22} height={22} rx={5.4} className="die-shadow" />
      <rect x={-11} y={-11} width={22} height={22} rx={5.4} className="face" />
      <path d="M-7.6 -9.6 H5.6 Q9.6 -9.6 9.6 -5.6" className="sheen" />
      {face === 'ship' ? (
        <g transform="translate(0 1) scale(0.62)"><ShipShape /></g>
      ) : (
        <path d="M-6 7 L-6 -2 Q-6 -8 0 -8 Q6 -8 6 -2 L6 7 Z M-2 7 L-2 1 Q-2 -2 0 -2 Q2 -2 2 1 L2 7" className="gate" />
      )}
    </svg>
  );
}

// ---------- mazo de sucesos ----------

/** Dibujo chico de cada suceso (trazo simple, en una caja de 14×14 centrada). */
const EV_GLYPH: Record<string, React.ReactNode> = {
  harvest: <><path d="M0 7 L0 -6" /><path d="M0 -4 Q-3 -6 -3 -3 Q-3 -1 0 -2 M0 0 Q-3 -2 -3 1 Q-3 3 0 2 M0 -4 Q3 -6 3 -3 Q3 -1 0 -2 M0 0 Q3 -2 3 1 Q3 3 0 2" /></>,
  feud: <><path d="M-6 -6 L6 6 M6 -6 L-6 6" /><path d="M-6 2 L-2 6 M6 2 L2 6" /></>,
  flee: <><path d="M-5 -2 L5 -2 M-3 -2 L-2 -6 L2 -6 L3 -2" /><path d="M-6 4 L4 4 M1 1 L4 4 L1 7" /></>,
  joust: <><path d="M-4 7 L-4 -7" /><path d="M-4 -7 L6 -4 L-4 -1 Z" /></>,
  tradeWind: <><path d="M-1 6 L-1 -7 L6 4 Z" /><path d="M-7 6 L7 6" /></>,
  quake: <path d="M-7 -2 L-3 1 L-1 -4 L2 3 L4 -1 L7 2" />,
  neighbors: <><path d="M-7 6 L-7 0 L-4 -3 L-1 0 L-1 6 Z" /><path d="M1 6 L1 0 L4 -3 L7 0 L7 6 Z" /></>,
  plague: <path d="M0 -7 Q6 1 4 4 Q2 7 0 7 Q-2 7 -4 4 Q-6 1 0 -7 Z" />,
  raid: <><path d="M-6 -1 L6 -1" /><path d="M-3 -1 L-2 -6 L2 -6 L3 -1" /><circle cx={0} cy={3.5} r={3} /></>,
  calm: <><path d="M-7 -2 Q-3.5 -5 0 -2 T7 -2" /><path d="M-7 3 Q-3.5 0 0 3 T7 3" /></>,
  aid: <path d="M0 6 L-6 0 Q-8 -4 -4.5 -6 Q-2 -7 0 -4 Q2 -7 4.5 -6 Q8 -4 6 0 Z" />,
};

/** Carta del mazo de sucesos: número grande y, si trae suceso, su dibujo en la franja de abajo. */
export function ChronicleFace({ card, size = 34 }: { card: ChronicleCard; size?: number }) {
  const seven = card.n === 7;
  return (
    <svg className={`chron-card${seven ? ' seven' : ''}${card.ev ? ' ev' : ''}`} width={size * 0.76} height={size} viewBox="-15 -20 30 40" role="img" aria-label={String(card.n)}>
      <rect x={-13.2} y={-18.4} width={27.4} height={38} rx={3.6} className="chron-shadow" />
      <rect x={-13.7} y={-19} width={27.4} height={38} rx={3.6} className="chron-paper" />
      <text y={card.ev ? 3 : 7} textAnchor="middle" className="chron-n">{card.n}</text>
      {card.ev && (
        <>
          <path d="M-13.7 9 H13.7 V15.4 Q13.7 19 10.1 19 H-10.1 Q-13.7 19 -13.7 15.4 Z" className="chron-band" />
          <g transform="translate(0 14) scale(.5)" className="chron-glyph">{EV_GLYPH[card.ev]}</g>
        </>
      )}
    </svg>
  );
}

export function EventGlyph({ ev, size = 18 }: { ev: string; size?: number }) {
  return <svg className="ev-glyph" width={size} height={size} viewBox="-9 -9 18 18" aria-hidden="true"><g className="chron-glyph">{EV_GLYPH[ev]}</g></svg>;
}

/** Camello de la caravana, de perfil, parado sobre el tramo. */
export function CamelShape() {
  return (
    <g className="camel-shape">
      <ellipse cx={1} cy={7.6} rx={9.6} ry={2.2} className="piece-shadow" />
      <path d="M-6 7 L-5.4 1.4 M-2.6 7 L-2.4 1.6 M3 7 L3.2 1.6 M5.8 7 L6 1.2" className="camel-leg" />
      <path d="M-7.4 1.8 C-8.4 -2.2 -5.8 -4.4 -4 -4.6 C-3 -8.4 0.2 -8.6 1.2 -5 C2.2 -6.6 4.4 -6.4 5.4 -3.6 C6.4 -3 7.2 -1.6 7.4 0 L9.2 -5.4 L12.2 -6.8 L12.8 -4.8 L10.6 -3.6 L8.6 2.2 L-6.6 2.6 Z" className="camel-body" />
      <path d="M-3.6 -4.2 L4.8 -3.4 L4.4 -1 L-3.4 -1.6 Z" className="camel-blanket" />
      <circle cx={11.2} cy={-5.6} r={0.55} className="camel-eye" />
    </g>
  );
}

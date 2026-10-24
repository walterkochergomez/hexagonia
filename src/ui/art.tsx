// Ilustraciones propias en SVG: cartas de recursos, piezas de madera con volumen, dados y símbolos de jugador.
// Luz desde arriba a la izquierda, como en las fichas del tablero.
import type { Card, Terrain } from '../engine/types';
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

export function ShipShape({ color }: { color?: number }) {
  const pirate = color === undefined;
  return (
    <g className={pirate ? 'pirate' : `piece ship p${color}`}>
      <ellipse cx={1.5} cy={8.8} rx={12} ry={2.4} className="piece-shadow" />
      <path d="M-12 1.5 L12 1.5 L8.5 8 L-8.5 8 Z" className={pirate ? 'hull' : 'pfill'} />
      <path d="M-10.4 4.6 L10.4 4.6 L8.5 8 L-8.5 8 Z" className={pirate ? 'hull-d' : 'pfill-d'} />
      <path d="M0 1.5 L0 -15" className="mast" />
      <path d="M0.9 -14 Q9.4 -8 8.6 -0.4 L0.9 -0.4 Z" className="sail" />
      <path d="M-0.9 -11.6 L-0.9 -0.4 L-8 -0.4 Z" className="jib" />
      <path d="M0 -15 L5.4 -13.6 L0 -12.2 Z" className={pirate ? 'pennant' : 'pfill'} />
      {pirate && <path d="M3 -8.4 L6.4 -4.6 M6.4 -8.4 L3 -4.6" className="mark" />}
    </g>
  );
}

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

// Ilustraciones propias en SVG: glifos de terreno, íconos de cartas y piezas.
import type { Card, Terrain } from '../engine/types';

export const RES_TERRAIN: Record<Card, string> = {
  lumber: 'forest', brick: 'hills', wool: 'pasture', grain: 'fields', ore: 'mountains',
  paper: 'paper', cloth: 'cloth', coin: 'coin',
};

export function TerrainGlyph({ terrain }: { terrain: Terrain | 'fog' | string }) {
  switch (terrain) {
    case 'forest':
      return (
        <g className="glyph">
          {[-10, 0, 10].map((x, i) => (
            <path key={x} d={`M${x - 5} ${i === 1 ? 5 : 6} L${x} ${i === 1 ? -9 : -5} L${x + 5} ${i === 1 ? 5 : 6} Z M${x} 6 L${x} 9`} />
          ))}
        </g>
      );
    case 'hills':
      return (
        <g className="glyph">
          <rect x={-11} y={-1} width={10} height={6} rx={1} />
          <rect x={1} y={-1} width={10} height={6} rx={1} />
          <rect x={-5} y={-8} width={10} height={6} rx={1} />
        </g>
      );
    case 'pasture':
      return (
        <g className="glyph">
          <path d="M-9 2 a4 4 0 0 1 4-6 a4.5 4.5 0 0 1 8 0 a4 4 0 0 1 4 6 Z" />
          <circle cx={9} cy={-1} r={2.6} className="fill" />
          <path d="M-5 2 L-5 7 M3 2 L3 7" />
        </g>
      );
    case 'fields':
      return (
        <g className="glyph">
          {[-8, 0, 8].map((x) => (
            <path key={x} d={`M${x} 8 L${x} -7 M${x - 3} -3 L${x} -6 L${x + 3} -3 M${x - 3} 1 L${x} -2 L${x + 3} 1`} />
          ))}
        </g>
      );
    case 'mountains':
      return (
        <g className="glyph">
          <path d="M-13 7 L-4 -6 L1 1 L5 -4 L13 7 Z" />
          <path d="M-6.5 -2.5 L-4 -6 L-1.5 -2.5" />
        </g>
      );
    case 'desert':
      return (
        <g className="glyph">
          <path d="M-13 6 Q-6.5 -1 0 6 Q6.5 -1 13 6" />
          <circle cx={6} cy={-5} r={3} />
        </g>
      );
    case 'gold':
      return (
        <g className="glyph">
          <path d="M-7 3 L-3 -5 L5 -4 L8 3 L1 7 Z M-3 -5 L1 1 L8 3 M1 1 L1 7" />
          <path d="M-11 -6 l0 4 M-13 -4 l4 0 M11 -8 l0 4 M9 -6 l4 0" />
        </g>
      );
    case 'sea':
      return (
        <g className="glyph wave">
          <path d="M-11 0 q2.75 -3 5.5 0 t5.5 0 t5.5 0 t5.5 0" />
        </g>
      );
    case 'fog':
      return (
        <g className="glyph">
          <path d="M-14 6 q5 -4 10 0 t10 0" />
          <path d="M-4 -9 a4 4 0 1 1 5 4 l0 3" />
          <circle cx={1} cy={2} r={0.6} />
        </g>
      );
    case 'paper':
      return (
        <g className="glyph">
          <path d="M-7 -8 L5 -8 L8 -5 L8 8 L-7 8 Z M-3 -3 L4 -3 M-3 1 L4 1 M-3 5 L2 5" />
        </g>
      );
    case 'cloth':
      return (
        <g className="glyph">
          <path d="M-9 -7 L9 -7 L9 3 Q4 1 0 3 Q-4 5 -9 3 Z M-9 -2 L9 -2" />
        </g>
      );
    case 'coin':
      return (
        <g className="glyph">
          <circle cx={0} cy={0} r={8} />
          <path d="M0 -4.5 L0 4.5 M-3 -2 L3 -2 M-3 2 L3 2" />
        </g>
      );
    default:
      return null;
  }
}

export function CardIcon({ card, size = 28 }: { card: Card; size?: number }) {
  return (
    <svg className={`card-icon t-${RES_TERRAIN[card]}`} width={size} height={size} viewBox="-15 -15 30 30" aria-hidden="true">
      <rect x={-14} y={-14} width={28} height={28} rx={7} className="bg" />
      <TerrainGlyph terrain={RES_TERRAIN[card]} />
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

// ---------- piezas del tablero (centradas en 0,0) ----------

export function SettlementShape({ color }: { color: number }) {
  return (
    <g className="piece">
      <path d="M-8 6 L-8 -2 L0 -10 L8 -2 L8 6 Z" className={`pfill p${color}`} />
      <g transform="translate(0 1)"><SymbolShape color={color} r={2.4} className="sym" /></g>
    </g>
  );
}

export function CityShape({ color, wall, metro, damaged }: { color: number; wall?: boolean; metro?: string; damaged?: boolean }) {
  return (
    <g className={`piece${damaged ? ' damaged' : ''}`}>
      {wall && <rect x={-15} y={-1} width={30} height={11} rx={3} className="wall" />}
      <path d="M-12 7 L-12 -2 L-5 -9 L2 -2 L2 -7 L12 -7 L12 7 Z" className={`pfill p${color}`} />
      {metro && (
        <g className={`metro m-${metro}`}>
          <path d="M7 -7 L7 -19" />
          <path d="M7 -19 L15 -16 L7 -13 Z" className="flag" />
        </g>
      )}
      <g transform="translate(-5 2)"><SymbolShape color={color} r={2.4} className="sym" /></g>
    </g>
  );
}

export function KnightShape({ color, level, active }: { color: number; level: number; active: boolean }) {
  return (
    <g className={`piece knight${active ? ' active' : ''}`}>
      <path d="M-8 -8 L8 -8 L8 1 Q8 8 0 11 Q-8 8 -8 1 Z" className={active ? `pfill p${color}` : `kfill pstroke p${color}`} />
      {Array.from({ length: level }, (_, i) => (
        <circle key={i} cx={(i - (level - 1) / 2) * 4.5} cy={0} r={1.7} className={active ? 'sym' : `pfill p${color}`} />
      ))}
    </g>
  );
}

export function RobberShape() {
  return (
    <g className="robber">
      <circle cx={0} cy={-9} r={5} />
      <path d="M-8 10 Q-8 -2 0 -4 Q8 -2 8 10 Z" />
    </g>
  );
}

export function ShipShape({ color }: { color?: number }) {
  return (
    <g className={color === undefined ? 'pirate' : 'piece'}>
      <path d="M-10 2 L10 2 L7 7 L-7 7 Z" className={color === undefined ? '' : `pfill p${color}`} />
      <path d="M0 2 L0 -10" className="mast" />
      <path d="M0.8 -10 L8 0 L0.8 0 Z" className={color === undefined ? 'sail-dark' : 'sail'} />
    </g>
  );
}

export function MerchantShape({ color }: { color: number }) {
  return (
    <g className="piece">
      <path d="M-7 7 L0 -8 L7 7 Z" className={`pfill p${color}`} />
      <path d="M0 -8 L0 -13 L5 -11 L0 -9" className="sym" />
    </g>
  );
}

export function Pips({ n }: { n: number }) {
  const k = 6 - Math.abs(7 - n);
  return (
    <g className="pips">
      {Array.from({ length: k }, (_, i) => (
        <circle key={i} cx={(i - (k - 1) / 2) * 3.4} cy={0} r={1.25} />
      ))}
    </g>
  );
}

export function DieFace({ value, tone }: { value: number; tone: 'red' | 'light' }) {
  const spots: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [[-5, -5], [5, 5]],
    3: [[-5, -5], [0, 0], [5, 5]],
    4: [[-5, -5], [5, -5], [-5, 5], [5, 5]],
    5: [[-5, -5], [5, -5], [0, 0], [-5, 5], [5, 5]],
    6: [[-5, -5], [5, -5], [-5, 0], [5, 0], [-5, 5], [5, 5]],
  };
  return (
    <svg className={`die die-${tone}`} width={34} height={34} viewBox="-12 -12 24 24" role="img" aria-label={String(value)}>
      <rect x={-11} y={-11} width={22} height={22} rx={5} className="face" />
      {(spots[value] ?? []).map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2.1} className="spot" />)}
    </svg>
  );
}

export function EventFace({ face }: { face: string }) {
  return (
    <svg className={`die die-event ev-${face}`} width={34} height={34} viewBox="-12 -12 24 24" role="img" aria-label={face}>
      <rect x={-11} y={-11} width={22} height={22} rx={5} className="face" />
      {face === 'ship' ? (
        <g transform="scale(0.8)"><ShipShape /></g>
      ) : (
        <path d="M-6 7 L-6 -2 Q-6 -8 0 -8 Q6 -8 6 -2 L6 7 Z M-2 7 L-2 1 Q-2 -2 0 -2 Q2 -2 2 1 L2 7" className="gate" />
      )}
    </svg>
  );
}

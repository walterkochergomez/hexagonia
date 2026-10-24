// Figuras de los manuales: escenas chicas dibujadas con el mismo tablero y las mismas piezas del juego.
import type { ReactNode } from 'react';
import { useT } from '../../app/i18n';
import { CORNERS, edgeId, graphOf, hexId, vertexId } from '../../engine/geometry';
import { WONDERS, type Card, type GameState, type Harbor, type HexTile, type Resource, type Terrain, type TribeGift } from '../../engine/types';
import { Board, type BoardPos } from '../Board';
import { CardBack, CardIcon, ChronicleFace, CityShape, ShipShape, WonderArt } from '../art';
import { TileFace, type LandTerrain } from '../tiles';
import type { FigureId, ManualId } from '../../manual/types';

// ---------- coordenadas ----------

/** Esquina i (0 N, 1 NE, 2 SE, 3 S, 4 SO, 5 NO) del hexágono (q, r). */
export const corner = (q: number, r: number, i: number) => {
  const [dx, dy] = CORNERS[i];
  return vertexId(2 * q + r + dx, 3 * r + dy);
};
/** Lado i (entre la esquina i y la i+1: 0 NE, 1 E, 2 SE, 3 SO, 4 O, 5 NO) del hexágono (q, r). */
export const side = (q: number, r: number, i: number) => {
  const [ax, ay] = CORNERS[i];
  const [bx, by] = CORNERS[(i + 1) % 6];
  const X = 2 * q + r;
  const Y = 3 * r;
  return edgeId(X + ax, Y + ay, X + bx, Y + by);
};

type Hx = [number, number, Terrain | 'fog', number?];

interface Scene {
  hexes: Hx[];
  /** encuadre con el mar incluido (si no, se recorta a la tierra y se rodea de mar) */
  open?: boolean;
  harbors?: [string, string, Resource | 'any'][];
  roads?: [string, number][];
  ships?: [string, number, boolean?][];
  buildings?: [string, 'settlement' | 'city', number, { wall?: boolean; metro?: 'science' | 'trade' | 'politics' }?][];
  knights?: [string, number, 1 | 2 | 3, boolean][];
  robber?: string;
  pirate?: string;
  /** puentes: caminos con `bridge` */
  bridges?: [string, number][];
  fish?: { lakes: string[]; grounds: { hex: string; n: number }[] };
  river?: { rivers: string[][]; crossings: string[] };
  caravan?: { oasis: string; starts: string[]; routes: string[][] };
  tribe?: { hexes: string[]; gifts: TribeGift[] };
  looms?: { hexes: string[]; villages: { v: string; n: number; cloth: number; linked: number[] }[] };
  /** bastiones: peñón (su anillo de mar es el recorrido de la flota) y bastiones */
  bastions?: { rock: string; fleet: number; forts: { seat: number; v: string; landing: string; chips: number; plan?: string[] }[] };
  works?: { strait: string[]; waste: string[] };
}

const FLOWER: [number, number][] = [[0, 0], [1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]];

function stateOf(sc: Scene): GameState {
  const hexes: Record<string, HexTile> = {};
  for (const [q, r, terrain, number] of sc.hexes) hexes[hexId(q, r)] = { id: hexId(q, r), q, r, terrain, number: number ?? null };
  if (!sc.open) {
    // anillo de mar para que la costa tenga agua alrededor
    for (const [q, r] of sc.hexes) {
      for (const [dq, dr] of [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]]) {
        const id = hexId(q + dq, r + dr);
        if (!hexes[id]) hexes[id] = { id, q: q + dq, r: r + dr, terrain: 'sea', number: null };
      }
    }
  }
  const harbors: Harbor[] = (sc.harbors ?? []).map(([edge, hex, kind]) => ({ edge, hex, kind }));
  const own = <T,>(xs: [string, number, ...T[]][] | undefined) => Object.fromEntries((xs ?? []).map(([id, owner]) => [id, { owner }]));
  const g = graphOf(hexes);
  const isLand = (h: string) => hexes[h] && hexes[h].terrain !== 'sea';
  // los cruces de la costa de cada caladero se calculan como en el motor
  const fish = sc.fish && {
    lakes: sc.fish.lakes, pile: 0, boot: null,
    grounds: sc.fish.grounds.map((gr) => ({ ...gr, vertices: g.hexes[gr.hex].vertices.filter((v) => g.vertices[v].hexes.some(isLand)) })),
  };
  return {
    board: { hexes, harbors, robber: sc.robber ?? null, pirate: sc.pirate ?? null, merchant: null },
    settings: { openSea: !!sc.open },
    fish,
    river: sc.river && { ...sc.river, coins: [] },
    caravan: sc.caravan && { ...sc.caravan, left: 0 },
    tribe: sc.tribe && { ...sc.tribe, vp: [], held: [] },
    looms: sc.looms && { ...sc.looms, supply: 0, cloth: [] },
    bastions: sc.bastions && (() => {
      const [q, r] = sc.bastions.rock.slice(1).split(',').map(Number);
      // el anillo alrededor del peñón, en sentido horario desde el noreste
      const loop = [[1, -1], [1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]].map(([dq, dr]) => hexId(q + dq, r + dr));
      return { rock: [sc.bastions.rock], loop, fleet: sc.bastions.fleet, forts: sc.bastions.forts.map((f) => ({ plan: [], ...f, start: '', taken: false })), last: null };
    })(),
    works: sc.works && { ...sc.works, wonders: [] },
    roads: { ...own(sc.roads), ...Object.fromEntries((sc.bridges ?? []).map(([e, owner]) => [e, { owner, bridge: true }])) },
    ships: Object.fromEntries((sc.ships ?? []).map(([e, owner, war]) => [e, war ? { owner, war } : { owner }])),
    buildings: Object.fromEntries((sc.buildings ?? []).map(([v, kind, owner, x]) => [v, { owner, kind, ...x }])),
    knights: Object.fromEntries((sc.knights ?? []).map(([v, owner, level, active]) => [v, { owner, level, active, activatedTurn: -1, promotedTurn: -1 }])),
    players: [0, 1, 2, 3, 4, 5].map((color) => ({ color })),
  } as unknown as GameState;
}

function Still({ scene, label, lit, overlay, className, pad }: { scene: Scene; label: string; lit?: number; overlay?: (at: BoardPos) => ReactNode; className?: string; pad?: [number, number, number, number] }) {
  return (
    <div className={`fig-board${className ? ` ${className}` : ''}`}>
      <Board view={stateOf(scene)} targets={null} flash={null} still defs={false} lit={lit} overlay={overlay} label={label} pad={pad} />
    </div>
  );
}

// ---------- marcas ----------

const Cross = ({ at }: { at: [number, number] }) => (
  <g transform={`translate(${at[0]} ${at[1]})`} className="fig-cross"><circle r={9} /><path d="M-4 -4 L4 4 M4 -4 L-4 4" /></g>
);
const Num = ({ at, n }: { at: [number, number]; n: number | string }) => (
  <g transform={`translate(${at[0]} ${at[1]})`} className="fig-num"><circle r={8.5} /><text y={3.6} textAnchor="middle">{n}</text></g>
);
const Badge = ({ at, text }: { at: [number, number]; text: string }) => (
  <g transform={`translate(${at[0]} ${at[1]})`} className="fig-badge"><rect x={-13} y={-10} width={26} height={20} rx={10} /><text y={4.4} textAnchor="middle">{text}</text></g>
);
const FishMark = ({ at, n }: { at: [number, number]; n: number }) => (
  <g transform={`translate(${at[0]} ${at[1]})`} className="fig-fish">
    {Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`translate(${(i - (n - 1) / 2) * 15} 0)`}>
        <circle r={7.4} className="fish-token-disc" />
        <path transform="scale(.5)" d="M-9 0 Q-2 -7 7 -1 Q-2 6 -9 0 Z M7 -1 L12 -5 L11.4 4 Z" className="fish-token-fish" />
      </g>
    ))}
  </g>
);

/** Cartas en abanico, para mostrar lo que alguien recibe. */
const Cards = ({ at, cards, size = 22 }: { at: [number, number]; cards: (Card | 'back')[]; size?: number }) => (
  <g transform={`translate(${at[0]} ${at[1]})`} className="fig-cards">
    {cards.map((c, i) => (
      <g key={i} transform={`translate(${(i - (cards.length - 1) / 2) * size * 0.62 - size / 2} ${-size / 2})`}>
        {c === 'back' ? <CardBack size={size} kind="res" /> : <CardIcon card={c} size={size} />}
      </g>
    ))}
  </g>
);

// ---------- figuras ----------

const TERRAIN_CARD: [LandTerrain, Resource | null][] = [['forest', 'lumber'], ['hills', 'brick'], ['pasture', 'wool'], ['fields', 'grain'], ['mountains', 'ore'], ['desert', null]];

function TileCard({ terrain, cards, label, sub }: { terrain: LandTerrain; cards: Card[]; label: string; sub?: string }) {
  return (
    <li className="fig-tile">
      <svg viewBox="-46 -52 92 108" width={84} height={98} aria-hidden="true"><TileFace terrain={terrain} id={`fig-${terrain}`} /></svg>
      <span className="fig-tile-cards">{cards.map((c) => <CardIcon key={c} card={c} size={30} />)}</span>
      <span className="fig-tile-label">{label}{sub && <span>{sub}</span>}</span>
    </li>
  );
}

export function Figure({ id, caption }: { id: FigureId; caption: string }) {
  const t = useT();
  let body: ReactNode = null;
  switch (id) {
    case 'terrains':
      body = (
        <ul className="fig-tiles">
          {TERRAIN_CARD.map(([tr, card]) => <TileCard key={tr} terrain={tr} cards={card ? [card] : []} label={t(`terrain.${tr}`)} sub={card ? t(`res.${card}`) : undefined} />)}
        </ul>
      );
      break;
    case 'commodities':
      body = (
        <ul className="fig-tiles">
          <TileCard terrain="forest" cards={['lumber', 'paper']} label={t('terrain.forest')} sub={t('res.paper')} />
          <TileCard terrain="pasture" cards={['wool', 'cloth']} label={t('terrain.pasture')} sub={t('res.cloth')} />
          <TileCard terrain="mountains" cards={['ore', 'coin']} label={t('terrain.mountains')} sub={t('res.coin')} />
        </ul>
      );
      break;
    case 'setup':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'forest', 6], [1, 0, 'fields', 9], [0, 1, 'pasture', 4], [1, -1, 'hills', 10], [-1, 1, 'mountains', 3]],
          buildings: [[corner(0, 0, 2), 'settlement', 0]],
          roads: [[side(0, 0, 1), 0]],
        }} overlay={(at) => <>{[corner(0, 0, 1), corner(0, 0, 3), corner(1, 0, 3)].map((v) => <Cross key={v} at={at.v(v)} />)}</>} />
      );
      break;
    case 'production':
      body = (
        <Still label={caption} lit={8} scene={{
          hexes: [[0, 0, 'pasture', 8], [1, -1, 'forest', 5], [1, 0, 'hills', 10], [0, 1, 'fields', 9], [-1, 1, 'mountains', 4], [-1, 0, 'forest', 11], [0, -1, 'fields', 3]],
          buildings: [[corner(0, 0, 0), 'settlement', 1], [corner(0, 0, 3), 'city', 0]],
          roads: [[side(0, 0, 5), 1], [side(0, 0, 3), 0]],
        }} overlay={(at) => <>
          <Cards at={[at.v(corner(0, 0, 0))[0] + 30, at.v(corner(0, 0, 0))[1] - 22]} cards={['wool']} size={30} />
          <Cards at={[at.v(corner(0, 0, 3))[0] + 40, at.v(corner(0, 0, 3))[1] + 2]} cards={['wool', 'wool']} size={30} />
        </>} />
      );
      break;
    case 'robber':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'hills', 6], [1, -1, 'fields', 9], [1, 0, 'pasture', 4], [0, 1, 'forest', 10], [-1, 1, 'mountains', 5], [-1, 0, 'pasture', 3], [0, -1, 'forest', 11]],
          buildings: [[corner(0, 0, 1), 'settlement', 1], [corner(0, 0, 4), 'city', 3]],
          roads: [[side(0, 0, 1), 1], [side(0, 0, 4), 3]],
          robber: hexId(0, 0),
        }} />
      );
      break;
    case 'harbors':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'forest', 5], [1, 0, 'pasture', 9], [0, 1, 'fields', 6], [-1, 1, 'hills', 10], [1, 1, 'mountains', 8]],
          harbors: [[side(0, 0, 5), hexId(0, -1), 'any'], [side(1, 1, 1), hexId(2, 1), 'wool']],
          buildings: [[corner(0, 0, 0), 'settlement', 0], [corner(1, 1, 2), 'settlement', 0]],
          roads: [[side(0, 0, 0), 0], [side(1, 1, 2), 0]],
        }} />
      );
      break;
    case 'distance':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'fields', 8], [1, -1, 'forest', 4], [1, 0, 'hills', 10], [0, 1, 'pasture', 5], [-1, 1, 'forest', 9], [-1, 0, 'mountains', 3], [0, -1, 'pasture', 6]],
          buildings: [[corner(0, 0, 0), 'settlement', 0], [corner(0, 0, 2), 'settlement', 0]],
          roads: [[side(0, 0, 0), 0], [side(0, 0, 1), 0]],
        }} overlay={(at) => <>{[corner(0, 0, 5), corner(0, -1, 1), corner(0, 0, 1), corner(0, 0, 3), corner(1, 0, 3)].map((v) => <Cross key={v} at={at.v(v)} />)}</>} />
      );
      break;
    case 'longest': {
      const route = [side(0, 0, 0), side(0, 0, 1), side(0, 0, 2), side(0, 0, 3), side(0, 0, 4), side(-1, 0, 0)];
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'pasture', 6], [1, -1, 'forest', 3], [1, 0, 'fields', 11], [0, 1, 'hills', 4], [-1, 1, 'fields', 10], [-1, 0, 'mountains', 8], [0, -1, 'forest', 9]],
          buildings: [[corner(0, 0, 0), 'settlement', 2]],
          roads: [...route.map((e): [string, number] => [e, 2]), [side(1, 0, 3), 2]],
        }} overlay={(at) => <>{route.map((e, i) => <Num key={e} at={at.e(e)} n={i + 1} />)}</>} />
      );
      break;
    }
    case 'ships':
      body = <Still label={caption} className="wide" scene={seaScene({ ships: [3, 5, 7, 9], settleB: true })} />;
      break;
    case 'shipMove':
      body = (
        <Still label={caption} className="wide" scene={seaScene({ ships: [3, 5, 7] })} overlay={(at) => {
          const from = at.e('e6,0');
          const to = at.e('e7,-3');
          return (
            <>
              <g transform={`translate(${from[0]} ${from[1]})`} className="fig-ghost"><ShipShape color={0} /></g>
              <path d={`M${from[0] + 6} ${from[1] - 8} Q${(from[0] + to[0]) / 2 + 18} ${(from[1] + to[1]) / 2 + 6} ${to[0] - 4} ${to[1] + 12}`} className="fig-arrow" />
            </>
          );
        }} />
      );
      break;
    case 'pirate':
      body = (
        <Still label={caption} className="wide" scene={{ ...seaScene({ ships: [3, 5] }), ships: [['e3,-3', 0], ['e5,-3', 0], ['e5,3', 1]], pirate: hexId(1, 0) }} overlay={(at) => <>{[0, 1, 2, 3, 4, 5].map((i) => side(1, 0, i)).filter((e) => !['e3,-3', 'e5,-3', 'e5,3', 'e2,0'].includes(e)).map((e) => <Cross key={e} at={at.e(e)} />)}</>} />
      );
      break;
    case 'gold':
      body = (
        <Still label={caption} lit={9} pad={[34, 0, 0, 0]} scene={{
          hexes: [[0, 0, 'gold', 9], [-1, 1, 'forest', 10], [0, 1, 'pasture', 5], [1, 0, 'hills', 4], [1, 1, 'fields', 11]],
          buildings: [[corner(0, 0, 0), 'settlement', 4]],
          roads: [[side(0, 0, 5), 4]],
        }} overlay={(at) => <Cards at={[at.v(corner(0, 0, 0))[0], at.v(corner(0, 0, 0))[1] - 38]} cards={['lumber', 'brick', 'wool', 'grain', 'ore']} size={28} />} />
      );
      break;
    case 'fog':
      body = (
        <Still label={caption} className="wide" scene={{
          open: true,
          hexes: [
            [0, 0, 'fields', 8], [0, 1, 'hills', 5], [-1, 1, 'forest', 10],
            [2, 0, 'forest', 4], [3, -1, 'fog'], [3, 0, 'fog'], [2, 1, 'fog'], [4, -1, 'fog'], [3, 1, 'fog'], [4, 0, 'fog'],
            [-1, -1, 'sea'], [0, -1, 'sea'], [1, -1, 'sea'], [2, -1, 'sea'], [-1, 0, 'sea'], [1, 0, 'sea'], [-2, 1, 'sea'], [1, 1, 'sea'],
          ],
          buildings: [[corner(0, 0, 1), 'settlement', 1]],
          ships: [['e3,-3', 1], ['e5,-3', 1]],
        }} overlay={(at) => <Cards at={[at.h(hexId(2, 0))[0] + 6, at.h(hexId(2, 0))[1] - 50]} cards={['lumber']} size={30} />} />
      );
      break;
    case 'knights':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'fields', 9], [1, -1, 'mountains', 4], [1, 0, 'pasture', 10], [0, 1, 'forest', 6], [-1, 1, 'hills', 3], [-1, 0, 'pasture', 8], [0, -1, 'forest', 5]],
          buildings: [[corner(0, 0, 0), 'city', 1, { wall: true }]],
          roads: [[side(0, 0, 5), 1], [side(0, 0, 0), 1], [side(0, 0, 1), 1], [side(0, 0, 2), 1], [side(-1, 0, 1), 1]],
          knights: [[corner(0, 0, 4), 1, 1, false], [corner(0, 0, 1), 1, 2, true], [corner(0, 0, 3), 1, 3, true]],
        }} />
      );
      break;
    case 'chronicle':
      body = (
        <ul className="fig-tiles fig-cards-row">
          {([{ n: 2, ev: 'harvest' }, { n: 5 }, { n: 6, ev: 'quake' }, { n: 7, ev: 'raid' }, { n: 8, ev: 'plague' }, { n: 11 }] as const).map((c, i) => (
            <li key={i} className="fig-tile">
              <ChronicleFace card={c} size={92} />
              <span className="fig-tile-label">{'ev' in c ? t(`chronicle.ev.${c.ev}`) : '\u00a0'}</span>
            </li>
          ))}
        </ul>
      );
      break;
    case 'fishers':
      body = (
        <Still label={caption} lit={9} scene={{
          hexes: [[0, 0, 'lake'], [1, -1, 'forest', 5], [1, 0, 'pasture', 10], [0, 1, 'fields', 6], [-1, 1, 'hills', 4], [-1, 0, 'mountains', 8], [0, -1, 'pasture', 11]],
          fish: { lakes: ['h0,0'], grounds: [{ hex: 'h2,-1', n: 9 }, { hex: 'h-1,2', n: 4 }] },
          buildings: [[corner(1, -1, 2), 'settlement', 0], [corner(0, 0, 4), 'city', 2]],
          roads: [[side(1, -1, 2), 0], [side(0, 0, 3), 2]],
        }} overlay={(at) => <>
          <FishMark at={[at.v(corner(1, -1, 2))[0] - 6, at.v(corner(1, -1, 2))[1] - 26]} n={1} />
        </>} />
      );
      break;
    case 'rivers':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'fields', 9], [1, -1, 'forest', 5], [1, 0, 'pasture', 10], [0, 1, 'hills', 6], [-1, 1, 'swamp'], [-1, 0, 'mountains', 8], [0, -1, 'pasture', 4]],
          river: { rivers: [['h0,-1', 'h0,0', 'h0,1']], crossings: [side(0, -1, 2), side(0, 0, 2), side(0, 1, 2)] },
          bridges: [[side(0, 0, 2), 1]],
          buildings: [[corner(0, 0, 1), 'settlement', 1], [corner(0, 0, 4), 'settlement', 3]],
          roads: [[side(0, 0, 1), 1], [side(0, 0, 3), 3]],
        }} overlay={(at) => <>
          <Badge at={[at.e(side(0, 0, 2))[0] + 30, at.e(side(0, 0, 2))[1] + 14]} text="+3" />
          <Badge at={[at.v(corner(0, 0, 4))[0] - 24, at.v(corner(0, 0, 4))[1] + 24]} text="+1" />
        </>} />
      );
      break;
    case 'caravans':
      body = (
        <Still label={caption} scene={{
          hexes: [[0, 0, 'desert'], [1, -1, 'forest', 5], [1, 0, 'pasture', 10], [0, 1, 'hills', 6], [-1, 1, 'fields', 9], [-1, 0, 'mountains', 8], [0, -1, 'pasture', 4]],
          caravan: { oasis: 'h0,0', starts: [corner(0, 0, 0), corner(0, 0, 2), corner(0, 0, 4)], routes: [[side(0, -1, 1), side(1, -1, 5)], [side(1, 0, 3)], []] },
          buildings: [[corner(0, -1, 1), 'settlement', 2]],
          roads: [[side(0, -1, 1), 2], [side(1, -1, 5), 2]],
          robber: 'h0,0',
        }} overlay={(at) => <Badge at={[at.v(corner(0, -1, 1))[0] - 30, at.v(corner(0, -1, 1))[1] - 12]} text="+1" />} />
      );
      break;
    case 'tribe': {
      // la isla grande a la izquierda; a la derecha, una islita del pueblo isleño con sus regalos
      body = (
        <Still label={caption} className="wide" scene={{
          ...islesScene(),
          ships: [['e3,-3', 0], ['e5,-3', 0], ['e7,-3', 0], ['e9,-3', 0]],
          tribe: { hexes: ['h3,-1', 'h3,0'], gifts: [{ edge: side(3, 0, 4), kind: 'vp' }, { edge: side(3, -1, 4), kind: 'dev' }, { edge: side(3, 0, 2), kind: 'harbor', harbor: 'ore' }] },
        }} overlay={(at) => {
          const p = at.e(side(3, 0, 4));
          return <path d={`M${p[0] - 30} ${p[1] - 26} Q${p[0] - 34} ${p[1] - 4} ${p[0] - 14} ${p[1] + 2}`} className="fig-arrow" />;
        }} />
      );
      break;
    }
    case 'looms':
      body = (
        <Still label={caption} lit={5} className="wide" scene={{
          ...islesScene(),
          ships: [['e3,-3', 0], ['e5,-3', 0], ['e7,-3', 0], ['e9,-3', 0]],
          looms: { hexes: ['h3,-1', 'h3,0'], villages: [{ v: corner(3, 0, 5), n: 5, cloth: 4, linked: [0] }, { v: corner(3, -1, 1), n: 9, cloth: 5, linked: [] }] },
        }} overlay={(at) => <Badge at={[at.v(corner(3, 0, 5))[0] - 34, at.v(corner(3, 0, 5))[1] + 20]} text="+1" />} />
      );
      break;
    case 'bastions': {
      const sea: Hx[] = [];
      const land: Hx[] = [[3, -1, 'fields', 6], [3, 0, 'hills', 9], [2, 1, 'forest', 4], [1, 0, 'desert'], [-1, 0, 'pasture', 5], [-1, 1, 'mountains', 10]];
      const seen = new Set(land.map(([q, r]) => hexId(q, r)));
      for (let r = -1; r <= 1; r++) for (let q = -2; q <= 4; q++) {
        const X = 2 * q + r;
        if (X < -4 || X > 8 || seen.has(hexId(q, r))) continue;
        sea.push([q, r, 'sea']);
      }
      body = (
        <Still label={caption} className="wide" scene={{
          open: true,
          hexes: [...land, ...sea],
          buildings: [[corner(3, 0, 4), 'settlement', 0], [corner(3, -1, 0), 'settlement', 2]],
          ships: [[side(2, 0, 2), 0, true], [side(2, 0, 3), 0, true], [side(1, 0, 2), 0]],
          bastions: { rock: 'h1,0', fleet: 0, forts: [{ seat: 0, v: corner(-1, 1, 4), landing: corner(-1, 0, 2), chips: 2 }] },
        }} />
      );
      break;
    }
    case 'works':
      body = (
        <ul className="fig-tiles fig-cards-row">
          {WONDERS.map((id, i) => (
            <li key={id} className="fig-tile">
              <WonderArt id={id} level={4 - i} size={84} />
              <span className="fig-tile-label">{t(`wonder.${id}`)}<span>{t('wonder.level', { n: 4 - i })}</span></span>
            </li>
          ))}
        </ul>
      );
      break;
    case 'worksMap': {
      const land: Hx[] = [[0, 0, 'desert'], [1, 0, 'desert'], [0, 1, 'desert'], [1, -1, 'fields', 9], [0, -1, 'pasture', 4], [-1, 0, 'forest', 6], [2, -1, 'hills', 10], [1, 1, 'mountains', 3], [-2, 2, 'fields', 8]];
      const seen = new Set(land.map(([q, r]) => hexId(q, r)));
      const sea: Hx[] = [];
      for (let r = -1; r <= 2; r++) for (let q = -3; q <= 3; q++) {
        const X = 2 * q + r;
        if (X < -4 || X > 5 || seen.has(hexId(q, r))) continue;
        sea.push([q, r, 'sea']);
      }
      const all = new Set([...land, ...sea].map(([q, r]) => hexId(q, r)));
      const g = graphOf(Object.fromEntries([...all].map((id) => { const [q, r] = id.slice(1).split(',').map(Number); return [id, { q, r }]; })));
      const deserts = new Set(['h0,0', 'h1,0', 'h0,1']);
      const isLand = (h: string) => land.some(([q, r]) => hexId(q, r) === h);
      body = (
        <Still label={caption} className="wide" scene={{
          open: true,
          hexes: [...land, ...sea],
          robber: 'h0,0',
          works: {
            strait: g.hexes['h-1,1'].vertices.filter((v) => g.vertices[v].hexes.some(isLand)),
            waste: Object.keys(g.vertices).filter((v) => g.vertices[v].hexes.filter((h) => deserts.has(h)).length >= 2),
          },
        }} />
      );
      break;
    }
    case 'barbarians':
      body = (
        <div className="fig-board fig-track">
          <svg viewBox="-24 -34 360 64" role="img" aria-label={caption}>
            {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={i * 40} cy={6} r={i === 7 ? 15 : 11} className={`fig-step${i < 4 ? ' done' : ''}${i === 7 ? ' last' : ''}`} />)}
            {Array.from({ length: 7 }, (_, i) => <text key={i} x={i * 40} y={10.5} textAnchor="middle" className="fig-step-n">{i}</text>)}
            <g transform="translate(160 4) scale(1.3)"><ShipShape /></g>
            <g transform="translate(280 6) scale(.9)"><CityShape color={0} /></g>
          </svg>
        </div>
      );
      break;
  }
  return (
    <figure className={`fig fig-${id}`}>
      {body}
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** La isla de inicio a la izquierda y una islita de dos casillas a la derecha, con mar entre ambas. */
function islesScene(): Scene {
  const land: Hx[] = [[0, 0, 'fields', 8], [0, 1, 'hills', 5], [-1, 1, 'forest', 10], [3, -1, 'pasture'], [3, 0, 'forest']];
  const seen = new Set(land.map(([q, r]) => hexId(q, r)));
  const sea: Hx[] = [];
  for (let r = -1; r <= 1; r++) for (let q = -2; q <= 4; q++) {
    const X = 2 * q + r;
    if (X < -3 || X > 8 || seen.has(hexId(q, r))) continue;
    sea.push([q, r, 'sea']);
  }
  return { open: true, hexes: [...land, ...sea], buildings: [[corner(0, 0, 1), 'settlement', 0]], roads: [[side(0, 0, 1), 0]] };
}

function seaScene({ ships, settleB }: { ships: number[]; settleB?: boolean }): Scene {
  const land: Hx[] = [[0, 0, 'fields', 8], [0, 1, 'hills', 5], [-1, 1, 'forest', 10], [3, 0, 'mountains', 6], [3, -1, 'pasture', 9], [2, 1, 'gold', 4]];
  const seen = new Set(land.map(([q, r]) => hexId(q, r)));
  const sea: Hx[] = [];
  for (let r = -1; r <= 1; r++) for (let q = -2; q <= 4; q++) {
    const X = 2 * q + r;
    if (X < -3 || X > 8 || seen.has(hexId(q, r))) continue;
    sea.push([q, r, 'sea']);
  }
  const edges: Record<number, string> = { 3: 'e3,-3', 5: 'e5,-3', 7: 'e7,-3', 9: 'e9,-3' };
  return {
    open: true,
    hexes: [...land, ...sea],
    buildings: [[corner(0, 0, 1), 'settlement', 0], ...(settleB ? [[corner(3, 0, 5), 'settlement', 0] as [string, 'settlement', number]] : [])],
    roads: [[side(0, 0, 1), 0]],
    ships: ships.map((n): [string, number] => [edges[n], 0]),
  };
}

// ---------- portadas ----------

export function Cover({ id, label }: { id: ManualId; label: string }) {
  const sc = COVERS[id];
  if (!sc) return <div className="fig-board cover cover-empty" aria-hidden="true" />;
  return <Still label={label} scene={sc} className="cover" />;
}

const f = (terr: (Terrain | 'fog')[], nums: number[]): Hx[] => FLOWER.map(([q, r], i) => [q, r, terr[i], nums[i] || undefined]);

const COVERS: Partial<Record<ManualId, Scene>> = {
  base: {
    hexes: [...f(['desert', 'forest', 'fields', 'pasture', 'hills', 'mountains', 'fields'], [0, 8, 5, 10, 6, 9, 4]), [2, -1, 'pasture', 11], [-1, -1, 'forest', 3]],
    buildings: [[corner(0, 0, 1), 'settlement', 0], [corner(0, 0, 4), 'city', 1], [corner(1, -1, 0), 'settlement', 2]],
    roads: [[side(0, 0, 1), 0], [side(0, 0, 0), 0], [side(0, 0, 4), 1], [side(1, -1, 5), 2]],
    robber: hexId(0, 0),
  },
  big: {
    hexes: [...f(['fields', 'forest', 'pasture', 'hills', 'mountains', 'pasture', 'desert'], [9, 6, 4, 10, 8, 5, 0]), [2, -1, 'forest', 3], [2, 0, 'fields', 11], [-2, 1, 'hills', 12], [-2, 0, 'pasture', 2], [1, -2, 'mountains', 10]],
    buildings: [[corner(0, 0, 0), 'settlement', 0], [corner(1, 0, 2), 'city', 1], [corner(-1, 1, 4), 'settlement', 2], [corner(1, -1, 0), 'settlement', 3], [corner(-1, 0, 5), 'settlement', 4], [corner(0, 1, 3), 'settlement', 5]],
    roads: [[side(0, 0, 0), 0], [side(1, 0, 2), 1], [side(-1, 1, 4), 2], [side(1, -1, 0), 3], [side(-1, 0, 5), 4], [side(0, 1, 3), 5]],
    robber: hexId(0, -1),
  },
  sea: { ...seaScene({ ships: [3, 5, 7, 9], settleB: true }), pirate: hexId(1, 1) },
  guilds: {
    hexes: f(['mountains', 'forest', 'pasture', 'fields', 'hills', 'pasture', 'forest'], [8, 5, 10, 9, 4, 3, 11]),
    buildings: [[corner(0, 0, 0), 'city', 2, { wall: true, metro: 'science' }], [corner(0, 0, 3), 'city', 1, { wall: true }]],
    roads: [[side(0, 0, 0), 2], [side(0, 0, 1), 2], [side(0, 0, 3), 1], [side(0, 0, 4), 1]],
    knights: [[corner(0, 0, 2), 2, 3, true], [corner(0, 0, 4), 1, 2, true], [corner(0, 0, 1), 2, 1, false]],
  },
  shires: {
    hexes: [...f(['pasture', 'fields', 'forest', 'hills', 'mountains', 'desert', 'pasture'], [8, 4, 10, 6, 9, 0, 5]), [2, -1, 'forest', 11], [-1, -1, 'fields', 3]],
    harbors: [[side(1, -1, 0), hexId(2, -2), 'wool'], [side(0, 1, 2), hexId(0, 2), 'any']],
    buildings: [[corner(1, -1, 0), 'city', 0], [corner(0, 1, 2), 'settlement', 0], [corner(-1, 0, 4), 'settlement', 2], [corner(0, 0, 1), 'settlement', 5]],
    roads: [[side(1, -1, 5), 0], [side(0, 1, 1), 0], [side(-1, 0, 3), 2], [side(0, 0, 1), 5]],
    river: { rivers: [['h0,0', 'h-1,1']], crossings: [side(0, 0, 3), side(-1, 1, 3)] },
    bridges: [[side(0, 0, 3), 1]],
    robber: hexId(-1, 0),
  },
  combo: {
    ...seaScene({ ships: [3, 5, 7, 9], settleB: true }),
    buildings: [[corner(0, 0, 1), 'city', 3, { wall: true }], [corner(3, 0, 5), 'settlement', 3]],
    knights: [[corner(0, 0, 3), 3, 2, true]],
    roads: [[side(0, 0, 1), 3], [side(0, 0, 2), 3]],
    ships: [['e3,-3', 3], ['e5,-3', 3], ['e7,-3', 3], ['e9,-3', 3]],
  },
};

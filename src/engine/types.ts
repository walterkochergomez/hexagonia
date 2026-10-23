// Tipos y constantes del motor de Hexagonia. Todo el estado es JSON serializable.

export type Resource = 'lumber' | 'brick' | 'wool' | 'grain' | 'ore';
export type Commodity = 'paper' | 'cloth' | 'coin';
export type Card = Resource | Commodity;
export const RESOURCES: readonly Resource[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
export const COMMODITIES: readonly Commodity[] = ['paper', 'cloth', 'coin'];
export const CARDS: readonly Card[] = [...RESOURCES, ...COMMODITIES];
export type Hand = Record<Card, number>;

export type Terrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert' | 'gold' | 'sea';
export const LAND: readonly Terrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'gold'];
export const TERRAIN_RESOURCE: Partial<Record<Terrain, Resource>> = {
  forest: 'lumber', hills: 'brick', pasture: 'wool', fields: 'grain', mountains: 'ore',
};
export const TERRAIN_COMMODITY: Partial<Record<Terrain, Commodity>> = {
  forest: 'paper', pasture: 'cloth', mountains: 'coin',
};

export type Track = 'science' | 'trade' | 'politics';
export const TRACKS: readonly Track[] = ['science', 'trade', 'politics'];
export const TRACK_COMMODITY: Record<Track, Commodity> = { science: 'paper', trade: 'cloth', politics: 'coin' };

export type DevType = 'soldier' | 'roads' | 'plenty' | 'monopoly' | 'point';

export type ProgressType =
  | 'alchemist' | 'crane' | 'engineer' | 'inventor' | 'irrigation' | 'medicine' | 'mining' | 'printer' | 'roadBuilding' | 'smith'
  | 'bishop' | 'constitution' | 'deserter' | 'diplomat' | 'intrigue' | 'saboteur' | 'spy' | 'warlord' | 'wedding'
  | 'commercialHarbor' | 'masterMerchant' | 'merchant' | 'merchantFleet' | 'resourceMonopoly' | 'tradeMonopoly';

export const PROGRESS_DECKS: Record<Track, [ProgressType, number][]> = {
  science: [['alchemist', 2], ['crane', 2], ['engineer', 1], ['inventor', 2], ['irrigation', 2], ['medicine', 2], ['mining', 2], ['printer', 1], ['roadBuilding', 2], ['smith', 2]],
  politics: [['bishop', 2], ['constitution', 1], ['deserter', 2], ['diplomat', 2], ['intrigue', 2], ['saboteur', 2], ['spy', 3], ['warlord', 2], ['wedding', 2]],
  trade: [['commercialHarbor', 2], ['masterMerchant', 2], ['merchant', 6], ['merchantFleet', 2], ['resourceMonopoly', 4], ['tradeMonopoly', 2]],
};
export const PROGRESS_TRACK: Record<ProgressType, Track> = Object.fromEntries(
  (Object.keys(PROGRESS_DECKS) as Track[]).flatMap((t) => PROGRESS_DECKS[t].map(([p]) => [p, t])),
) as Record<ProgressType, Track>;
export const PROGRESS_VP: readonly ProgressType[] = ['printer', 'constitution'];

export type EventFace = 'ship' | Track;
export const EVENT_FACES: readonly EventFace[] = ['ship', 'ship', 'ship', 'science', 'trade', 'politics'];

export type SeaScenario = 'islands' | 'archipelago' | 'fog' | 'desert' | 'newWorld';
export const SEA_SCENARIOS: readonly SeaScenario[] = ['islands', 'archipelago', 'fog', 'desert', 'newWorld'];

export interface Settings {
  seats: number; // 2..6
  seafarers: boolean;
  scenario: SeaScenario;
  guilds: boolean;
  vpTarget: number;
  turnMode: 'specialBuild' | 'paired'; // sólo con 5-6
  friendlyRobber: boolean;
  seed: number;
}

export const COST: Record<string, Partial<Hand>> = {
  road: { lumber: 1, brick: 1 },
  ship: { lumber: 1, wool: 1 },
  settlement: { lumber: 1, brick: 1, wool: 1, grain: 1 },
  city: { grain: 2, ore: 3 },
  dev: { wool: 1, grain: 1, ore: 1 },
  wall: { brick: 2 },
  knight: { wool: 1, ore: 1 },
  promote: { wool: 1, ore: 1 },
  activate: { grain: 1 },
  medicine: { grain: 1, ore: 2 },
};

export const LIMITS = { road: 15, ship: 15, settlement: 5, city: 4, wall: 3, knightPerLevel: 2 };

export interface HexTile {
  id: string;
  q: number;
  r: number;
  terrain: Terrain | 'fog';
  number: number | null;
  region?: number; // isla o zona (Mar Abierto)
}

export interface Harbor { edge: string; hex: string; kind: Resource | 'any' }

export interface Building {
  owner: number;
  kind: 'settlement' | 'city';
  wall?: boolean;
  metro?: Track;
  damaged?: boolean; // ciudad saqueada sin poblados en reserva: cuenta como poblado
}

export interface Knight {
  owner: number;
  level: 1 | 2 | 3;
  active: boolean;
  activatedTurn: number;
  promotedTurn: number;
}

export interface DevCard { type: DevType; turn: number }

export interface PlayerState {
  seat: number;
  name: string;
  color: number; // índice de color 0..5
  hand: Hand;
  dev: DevCard[];
  devPlayedTurn: number;
  soldiers: number;
  progress: ProgressType[];
  vpCards: ProgressType[]; // cartas de progreso de PV, públicas
  improvements: Record<Track, number>;
  defender: number; // PV de defensor
  bonus: { kind: 'island' | 'region'; id: number; vp: number }[];
  homeRegions: number[];
  // sólo en vistas: totales visibles para los demás
  handCount?: number;
  devCount?: number;
  progressCount?: number;
}

export type Step =
  | { k: 'discard'; reason: 'seven' | 'saboteur'; waiting: Record<number, number> }
  | { k: 'robber'; seat: number; robber: boolean; pirate: boolean; mode: 'steal1' | 'stealAll' }
  | { k: 'steal'; seat: number; hex: string; on: 'robber' | 'pirate'; from: number[] }
  | { k: 'pick'; reason: 'gold' | 'aqueduct' | 'plenty' | 'fog'; waiting: Record<number, number> }
  | { k: 'monopoly'; seat: number }
  | { k: 'freeRoutes'; seat: number; left: number; source: 'dev' | 'progress' | 'diplomat' }
  | { k: 'pillage'; waiting: number[] }
  | { k: 'defenderPick'; waiting: number[] }
  | { k: 'progressLimit'; waiting: Record<number, number> }
  | { k: 'metropolis'; seat: number; track: Track }
  | { k: 'relocate'; seat: number; from: string; level: 1 | 2 | 3; active: boolean; activatedTurn: number }
  | { k: 'deserterChoose'; seat: number; by: number }
  | { k: 'deserterPlace'; seat: number; level: 1 | 2 | 3; active: boolean }
  | { k: 'spy'; seat: number; target: number; cards: ProgressType[] }
  | { k: 'masterMerchant'; seat: number; target: number; hand: Hand }
  | { k: 'give'; reason: 'wedding'; to: number; waiting: Record<number, number> }
  | { k: 'harborOffer'; seat: number; targets: number[] }
  | { k: 'harborReply'; seat: number; offers: Record<number, Resource> }
  | { k: 'produce' };

export interface TradeOffer {
  id: number;
  from: number;
  give: Partial<Hand>;
  want: Partial<Hand>;
  to: number[];
  replies: Record<number, { status: 'accept' | 'decline' | 'counter'; give?: Partial<Hand>; want?: Partial<Hand> }>;
}

export interface TurnState {
  n: number; // contador global de turnos
  current: number;
  phase: 'setup' | 'preRoll' | 'main' | 'specialBuild' | 'paired' | 'over';
  setupOrder: number[];
  setupIndex: number;
  setupAwait: 'building' | 'route';
  setupVertex: string | null;
  dice: [number, number] | null;
  event: EventFace | null;
  shipMoved: number[]; // asientos que ya movieron un barco este turno
  builtShips: string[]; // barcos construidos este turno (no se pueden mover)
  sbpOrder: number[];
  sbpIndex: number;
  partner: number | null; // turno en pareja
  fleet: { seat: number; card: Card } | null; // flota mercante
  alchemist: [number, number] | null;
}

export interface LogEntry {
  n: number;
  k: string;
  p?: Record<string, string | number | boolean | null>;
  to?: number[]; // visible sólo para estos asientos
  alt?: { k: string; p?: Record<string, string | number | boolean | null> }; // versión para el resto
}

export interface GameState {
  v: number;
  settings: Settings;
  board: {
    hexes: Record<string, HexTile>;
    harbors: Harbor[];
    robber: string | null;
    pirate: string | null;
    merchant: { hex: string; owner: number } | null;
    robberStart: string | null; // Gremios: el ladrón entra aquí tras el primer ataque
    homeRegions: number[] | null; // regiones donde se permite la preparación (null = todas)
    regionBonus: number; // PV por primer poblado en región ajena
    regionNames: Record<number, 'main' | 'island' | 'far'>;
  };
  hidden: {
    fog: Record<string, { terrain: Terrain; number: number | null }>;
    devDeck: DevType[];
    progress: Record<Track, ProgressType[]>;
    rng: [number, number, number, number];
  };
  buildings: Record<string, Building>;
  roads: Record<string, { owner: number }>;
  ships: Record<string, { owner: number }>;
  knights: Record<string, Knight>;
  players: PlayerState[];
  bank: Hand;
  decks: { dev: number; science: number; trade: number; politics: number };
  turn: TurnState;
  steps: Step[];
  trade: TradeOffer | null;
  tradeSeq: number;
  awards: { road: { owner: number | null; len: number }; army: { owner: number | null; size: number } };
  barbarians: { pos: number; attacks: number; last: BarbarianResult | null };
  metropolis: Record<Track, { owner: number; vertex: string } | null>;
  log: LogEntry[];
  stats: { rolls: number[]; turns: number };
  winner: number | null;
  redacted?: boolean; // vista para un asiento
  viewer?: number | null;
}

export interface BarbarianResult {
  strength: number;
  defense: number;
  contributions: number[];
  won: boolean;
  losers: number[];
  defender: number | null;
  tied: number[];
}

export type Action =
  | { t: 'setupBuild'; vertex: string }
  | { t: 'setupRoute'; edge: string; ship?: boolean }
  | { t: 'roll' }
  | { t: 'endTurn' }
  | { t: 'build'; what: 'road' | 'ship' | 'settlement' | 'city' | 'wall'; at: string }
  | { t: 'moveShip'; from: string; to: string }
  | { t: 'buyDev' }
  | { t: 'playDev'; card: 'soldier' | 'roads' }
  | { t: 'playDev'; card: 'plenty' }
  | { t: 'playDev'; card: 'monopoly' }
  | { t: 'discard'; cards: Partial<Hand> }
  | { t: 'robber'; hex: string; target: 'robber' | 'pirate' }
  | { t: 'steal'; from: number }
  | { t: 'pick'; cards: Partial<Hand> }
  | { t: 'monopoly'; card: Card }
  | { t: 'freeRoute'; edge: string; ship?: boolean }
  | { t: 'skipFree' }
  | { t: 'offer'; give: Partial<Hand>; want: Partial<Hand>; to?: number[] }
  | { t: 'reply'; id: number; status: 'accept' | 'decline' }
  | { t: 'counter'; id: number; give: Partial<Hand>; want: Partial<Hand> }
  | { t: 'confirmTrade'; id: number; with: number }
  | { t: 'cancelTrade' }
  | { t: 'bank'; give: Card; get: Card; count: number }
  // Gremios y Guardianes
  | { t: 'improve'; track: Track }
  | { t: 'recruit'; at: string }
  | { t: 'activate'; at: string }
  | { t: 'promote'; at: string }
  | { t: 'knightMove'; from: string; to: string }
  | { t: 'chase'; from: string; target: 'robber' | 'pirate' }
  | { t: 'pillage'; vertex: string }
  | { t: 'defenderPick'; track: Track }
  | { t: 'progressDiscard'; card: ProgressType }
  | { t: 'metropolis'; vertex: string }
  | { t: 'relocate'; to: string | null }
  | { t: 'playProgress'; card: ProgressType; arg?: ProgressArg }
  | { t: 'deserterChoose'; vertex: string }
  | { t: 'deserterPlace'; vertex: string | null }
  | { t: 'spyTake'; card: ProgressType | null }
  | { t: 'masterTake'; cards: Partial<Hand> }
  | { t: 'give'; cards: Partial<Hand> }
  | { t: 'harborOffer'; offers: Record<number, Resource> }
  | { t: 'harborReply'; card: Commodity };

export interface ProgressArg {
  dice?: [number, number];
  track?: Track;
  vertex?: string;
  vertices?: string[];
  hexes?: [string, string];
  hex?: string;
  edge?: string;
  seat?: number;
  card?: Card;
}

export class GameError extends Error {
  constructor(public code: string, msg?: string) {
    super(msg ?? code);
  }
}

export const emptyHand = (): Hand => ({ lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0, paper: 0, cloth: 0, coin: 0 });
export const handTotal = (h: Partial<Hand>): number => CARDS.reduce((s, c) => s + (h[c] ?? 0), 0);
export const isResource = (c: string): c is Resource => (RESOURCES as readonly string[]).includes(c);
export const isCommodity = (c: string): c is Commodity => (COMMODITIES as readonly string[]).includes(c);
export const isCard = (c: string): c is Card => (CARDS as readonly string[]).includes(c);

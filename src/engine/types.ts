// Tipos y constantes del motor de Hexagonia. Todo el estado es JSON serializable.

export type Resource = 'lumber' | 'brick' | 'wool' | 'grain' | 'ore';
export type Commodity = 'paper' | 'cloth' | 'coin';
export type Card = Resource | Commodity;
export const RESOURCES: readonly Resource[] = ['lumber', 'brick', 'wool', 'grain', 'ore'];
export const COMMODITIES: readonly Commodity[] = ['paper', 'cloth', 'coin'];
export const CARDS: readonly Card[] = [...RESOURCES, ...COMMODITIES];
export type Hand = Record<Card, number>;

export type Terrain = 'forest' | 'hills' | 'pasture' | 'fields' | 'mountains' | 'desert' | 'gold' | 'sea' | 'lake' | 'swamp';
export const LAND: readonly Terrain[] = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert', 'gold', 'lake', 'swamp'];
/** Terrenos sin ficha de número. */
export const BARREN: readonly Terrain[] = ['desert', 'lake', 'swamp'];
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

export type SeaScenario = 'islands' | 'archipelago' | 'fog' | 'desert' | 'newWorld' | 'tribe' | 'looms' | 'bastions' | 'works';
export const SEA_SCENARIOS: readonly SeaScenario[] = ['islands', 'archipelago', 'fog', 'desert', 'newWorld', 'tribe', 'looms', 'bastions', 'works'];
/** Escenarios con reglas especiales (no se combinan con Gremios). */
export const SEA_SPECIAL: readonly SeaScenario[] = ['tribe', 'looms', 'bastions', 'works'];

/** Pueblo isleño: regalos en las costas de las islitas. */
export interface TribeGift { edge: string; kind: 'vp' | 'dev' | 'harbor'; harbor?: Resource | 'any' }
/** Aldeas tejedoras: cada aldea es un cruce con número y telas. */
export interface Village { v: string; n: number; cloth: number; linked: number[] }
/** Bastiones corsarios: el de cada jugador, su punto de desembarco y su puerto de salida. */
export interface Fort { seat: number; v: string; landing: string; start: string; chips: number; taken: boolean }
/** Grandes obras. */
export type WonderId = 'tower' | 'library' | 'lock' | 'mills' | 'observatory';
export const WONDERS: readonly WonderId[] = ['tower', 'library', 'lock', 'mills', 'observatory'];
export const WONDER_COST: Record<WonderId, Partial<Hand>> = {
  tower: { brick: 2, ore: 2, wool: 1 },
  library: { lumber: 2, wool: 2, grain: 1 },
  lock: { lumber: 2, brick: 2, ore: 1 },
  mills: { grain: 2, lumber: 2, wool: 1 },
  observatory: { ore: 2, grain: 2, brick: 1 },
};
export const WONDER_LEVELS = 4;
export interface Wonder { id: WonderId; owner: number | null; level: number }

/** Escenarios de la caja Comarcas (se juegan sobre la isla base). */
export type Shire = 'fishers' | 'rivers' | 'caravans' | 'raid' | 'traders';
export const SHIRES: readonly Shire[] = ['fishers', 'rivers', 'caravans'];

export interface Settings {
  seats: number; // 2..6
  openSea: boolean;
  scenario: SeaScenario;
  guilds: boolean;
  vpTarget: number;
  turnMode: 'specialBuild' | 'paired'; // sólo con 5-6
  friendlyRobber: boolean;
  seed: number;
  // Comarcas (ausentes en partidas guardadas antes: apagado)
  shire?: Shire | null;
  harbormaster?: boolean; // señor de los muelles
  chronicle?: boolean; // mazo de sucesos en vez de dados
  duel?: boolean; // reglas para 2 con jugadores neutrales
}

export interface FishGround { hex: string; n: number; vertices: string[] }
export type FishUse = 'robber' | 'steal' | 'bank' | 'road' | 'dev';
export const FISH_COST: Record<FishUse, number> = { robber: 2, steal: 3, bank: 4, road: 5, dev: 7 };

/** Sucesos del mazo de crónica. */
export type ChronicleEvent = 'harvest' | 'feud' | 'flee' | 'joust' | 'tradeWind' | 'quake' | 'neighbors' | 'plague' | 'raid' | 'calm' | 'aid';
export interface ChronicleCard { n: number; ev?: ChronicleEvent; newYear?: boolean }

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
  /** duelo: color neutral que crece cuando los demás construyen (no tiene turno ni mano) */
  neutral?: boolean;
  /** duelo: fichas de comercio */
  tokens?: number;
  /** pesca: valores de las fichas de pescado (1-3); en las vistas ajenas va vacío y se ve fishCount */
  fish?: number[];
  fishCount?: number;
  // sólo en vistas: totales visibles para los demás
  handCount?: number;
  devCount?: number;
  progressCount?: number;
}

export type Step =
  | { k: 'discard'; reason: 'seven' | 'saboteur'; waiting: Record<number, number> }
  | { k: 'robber'; seat: number; robber: boolean; pirate: boolean; mode: 'steal1' | 'stealAll' }
  | { k: 'steal'; seat: number; hex: string; on: 'robber' | 'pirate' | 'event'; from: number[] }
  | { k: 'pick'; reason: 'gold' | 'aqueduct' | 'plenty' | 'fog' | 'harvest' | 'joust' | 'calm' | 'fish' | 'coins' | 'fleet'; waiting: Record<number, number> }
  | { k: 'monopoly'; seat: number }
  | { k: 'freeRoutes'; seat: number; left: number; source: 'dev' | 'progress' | 'diplomat' | 'fish' }
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
  // Comarcas
  | { k: 'quake'; waiting: number[] }
  | { k: 'gift'; reason: 'neighbors' | 'aid' | 'force'; waiting: Record<number, number>; to: Record<number, number[]> }
  | { k: 'neutral'; seat: number; what: 'road' | 'settlement' }
  | { k: 'camelBid'; waiting: number[]; bids: Record<number, Partial<Hand>> }
  | { k: 'camelPlace'; seat: number }
  // Mar Abierto: escenarios especiales
  | { k: 'placeHarbor'; seat: number; kind: Resource | 'any' }
  | { k: 'fleet' }
  | { k: 'produce' }
  | { k: 'duelRoll' };

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
  /** tiradas de este turno (en el duelo son dos) */
  rolls?: [number, number][];
  /** carta de crónica que salió (en vez de dados) y todas las de este turno */
  card?: ChronicleCard | null;
  cards?: ChronicleCard[];
  /** peste: esta producción las ciudades dan 1 */
  plague?: boolean;
  /** duelo: ya usó una ficha de comercio este turno */
  tokenUsed?: boolean;
  /** ríos: monedas cambiadas por recursos este turno */
  coinTrades?: number;
  /** camellos: alguien construyó poblado o ciudad este turno (al empezar el siguiente se vota) */
  built?: boolean;
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
    chronicle?: ChronicleCard[];
    /** pesca: fichas boca abajo (0 = bota vieja) */
    fishPile?: number[];
    /** pueblo isleño: cartas de desarrollo boca abajo en las costas (en el orden de los regalos de carta) */
    tribeDev?: DevType[];
  };
  buildings: Record<string, Building>;
  roads: Record<string, { owner: number; broken?: boolean; bridge?: boolean }>;
  ships: Record<string, { owner: number; war?: boolean }>;
  knights: Record<string, Knight>;
  players: PlayerState[];
  bank: Hand;
  decks: { dev: number; science: number; trade: number; politics: number };
  turn: TurnState;
  steps: Step[];
  trade: TradeOffer | null;
  tradeSeq: number;
  awards: { road: { owner: number | null; len: number }; army: { owner: number | null; size: number }; harbor?: { owner: number | null; pts: number } };
  barbarians: { pos: number; attacks: number; last: BarbarianResult | null };
  metropolis: Record<Track, { owner: number; vertex: string } | null>;
  log: LogEntry[];
  stats: { rolls: number[]; turns: number };
  /** mazo de crónica: cartas que quedan antes de barajar y la última */
  chronicle?: { left: number; last: ChronicleCard | null };
  /** duelo: fichas de comercio en reserva */
  duel?: { supply: number };
  /** pesca: lago, caladeros, fichas en la pila y quién tiene la bota vieja */
  fish?: { lakes: string[]; grounds: FishGround[]; pile: number; boot: number | null };
  /** ríos: casillas de cada río, lados que cruzan el agua y monedas de cada jugador */
  river?: { rivers: string[][]; crossings: string[]; coins: number[] };
  /** camellos: oasis, inicio de cada caravana y sus tramos en orden */
  caravan?: { oasis: string; starts: string[]; routes: string[][]; left: number };
  /** pueblo isleño: casillas de las islitas, regalos que quedan, puntos tomados y puertos guardados */
  tribe?: { hexes: string[]; gifts: TribeGift[]; vp: number[]; held: (Resource | 'any')[][] };
  /** aldeas tejedoras: islitas, aldeas, telas en reserva y telas de cada jugador */
  looms?: { hexes: string[]; villages: Village[]; supply: number; cloth: number[] };
  /** bastiones: peñón, circuito de la flota (sentido horario), dónde está y los bastiones */
  bastions?: { rock: string[]; loop: string[]; fleet: number | null; forts: Fort[]; last: FleetResult | null };
  /** grandes obras: las cinco obras y los lugares especiales */
  works?: { wonders: Wonder[]; strait: string[]; waste: string[] };
  winner: number | null;
  redacted?: boolean; // vista para un asiento
  viewer?: number | null;
}

/** Último ataque de la flota corsaria. */
export interface FleetResult { n: number; hex: string; strength: number; won: number[]; lost: number[]; tied: number[] }

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
  | { t: 'build'; what: 'road' | 'ship' | 'settlement' | 'city' | 'wall' | 'repair'; at: string }
  | { t: 'moveShip'; from: string; to: string }
  | { t: 'buyDev' }
  | { t: 'playDev'; card: 'soldier' | 'roads' }
  | { t: 'playDev'; card: 'plenty' }
  | { t: 'playDev'; card: 'monopoly' }
  | { t: 'discard'; cards: Partial<Hand> }
  | { t: 'robber'; hex: string; target: 'robber' | 'pirate' }
  | { t: 'steal'; from: number; cloth?: boolean }
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
  | { t: 'harborReply'; card: Commodity }
  // Comarcas
  | { t: 'quake'; edge: string }
  | { t: 'gift'; to: number; cards: Partial<Hand> }
  | { t: 'neutral'; at: string }
  | { t: 'token'; use: 'force' | 'robber' }
  | { t: 'cashSoldier' }
  | { t: 'fish'; use: FishUse }
  | { t: 'passBoot'; to: number }
  | { t: 'bridge'; at: string }
  | { t: 'coins'; use: 'trade' }
  | { t: 'buyCoin'; give: Resource }
  | { t: 'camelBid'; bid: Partial<Hand> }
  | { t: 'camel'; at: string }
  // Mar Abierto: escenarios especiales
  | { t: 'placeHarbor'; edge: string }
  | { t: 'assault' }
  | { t: 'wonder'; id: WonderId };

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

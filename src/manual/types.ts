// Formato de los manuales: texto propio por idioma, figuras dibujadas con las piezas del juego.
import type { Card, Track } from '../engine/types';

export type ManualId = 'base' | 'big' | 'sea' | 'guilds' | 'combo' | 'shires' | 'expeditions';
export const MANUAL_ORDER: ManualId[] = ['base', 'big', 'sea', 'guilds', 'combo', 'shires', 'expeditions'];

export type FigureId =
  | 'terrains' | 'setup' | 'production' | 'robber' | 'harbors' | 'distance' | 'longest'
  | 'ships' | 'shipMove' | 'pirate' | 'gold' | 'fog'
  | 'commodities' | 'knights' | 'barbarians'
  | 'chronicle' | 'fishers' | 'rivers' | 'caravans';

export type CostIcon = 'road' | 'ship' | 'settlement' | 'city' | 'dev' | 'wall' | 'knight' | 'activate' | 'promote' | 'progress';

export interface CostRow {
  icon: CostIcon;
  label: string;
  cost: Partial<Record<Card, number>>;
  note?: string;
}

/** Bloques de un manual. En el texto, **así** marca negrita. */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h3'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'steps'; items: string[] }
  | { t: 'costs'; rows: CostRow[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'fig'; id: FigureId; caption: string }
  | { t: 'note'; text: string }
  /** tabla de cartas de desarrollo con nombres y textos del juego */
  | { t: 'devCards'; big?: boolean }
  /** tabla de cartas de progreso de una rama */
  | { t: 'progressCards'; track: Track };

export interface Section {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Manual {
  id: ManualId;
  title: string;
  summary: string;
  meta: string[];
  sections: Section[];
}

export interface ManualBook {
  manuals: Partial<Record<ManualId, Manual>>;
  /** texto del índice: cómo usar la app */
  app: Section[];
}

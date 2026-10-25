import type { Action, GameState, SeaScenario, Shire, ExpeditionSettings } from '../engine/types';

export const PROTOCOL = 1;
export const PEER_PREFIX = `hexagonia-v${PROTOCOL}-`;
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function newRoomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export interface LobbySettings {
  openSea: boolean;
  scenario: SeaScenario;
  guilds: boolean;
  vpTarget: number; // 0 = automático
  turnMode: 'specialBuild' | 'paired';
  friendlyRobber: boolean;
  // Comarcas (las salas guardadas antes no los traen: apagado)
  shire?: Shire | null;
  harbormaster?: boolean;
  chronicle?: boolean;
  duel?: boolean;
  // Expediciones (misiones elegidas)
  expedition?: ExpeditionSettings | null;
}

export const DEFAULT_SETTINGS: LobbySettings = {
  openSea: false, scenario: 'islands', guilds: false, vpTarget: 0, turnMode: 'specialBuild', friendlyRobber: false,
  shire: null, harbormaster: false, chronicle: false, duel: false, expedition: null,
};

export interface LobbySeat {
  clientId: string;
  name: string;
  color: number;
  host?: boolean;
  bot?: boolean;
  connected: boolean;
}

export interface LobbyState {
  code: string;
  status: 'lobby' | 'playing';
  seats: LobbySeat[];
  settings: LobbySettings;
}

export interface ChatMsg { seat: number | null; name: string; color: number; text: string; at: number }

export type ToHost =
  | { t: 'hello'; name: string; clientId: string; build: string }
  | { t: 'seat'; name?: string; color?: number }
  | { t: 'act'; a: Action; seq: number }
  | { t: 'chat'; text: string }
  | { t: 'ping'; at: number };

export type ToGuest =
  | { t: 'welcome'; seat: number | null; build: string }
  | { t: 'lobby'; lobby: LobbyState }
  | { t: 'state'; view: GameState }
  | { t: 'error'; code: string; seq?: number }
  | { t: 'chat'; msg: ChatMsg }
  | { t: 'chatLog'; msgs: ChatMsg[] }
  | { t: 'pong'; at: number }
  | { t: 'kicked' };

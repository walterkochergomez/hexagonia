import type { Action, GameState } from '../engine/types';
import type { ChatMsg, LobbySettings, LobbyState } from './protocol';

export type NetStatus = 'connecting' | 'open' | 'reconnecting' | 'error' | 'closed';
export interface UiError { key: string; params?: Record<string, string | number> }

export interface Snapshot {
  kind: 'host' | 'guest' | 'local';
  status: NetStatus;
  error: UiError | null;
  code: string | null;
  lobby: LobbyState | null;
  view: GameState | null;
  mySeat: number | null;
  chat: ChatMsg[];
  actionError: { code: string; at: number } | null;
  pass: number | null;
  bots: number[];
}

export interface Session {
  subscribe(fn: () => void): () => void;
  get(): Snapshot;
  act(a: Action): void;
  chat(text: string): void;
  leave(): void;
  updateSettings?(p: Partial<LobbySettings>): void;
  setSeat?(p: { name?: string; color?: number }): void;
  addBot?(): void;
  removeSeat?(clientId: string): void;
  start?(): void;
  rematch?(): void;
  confirmPass?(): void;
}

export abstract class BaseSession {
  protected snap: Snapshot;
  private fns = new Set<() => void>();

  constructor(kind: Snapshot['kind'], code: string | null) {
    this.snap = { kind, status: 'connecting', error: null, code, lobby: null, view: null, mySeat: null, chat: [], actionError: null, pass: null, bots: [] };
  }

  subscribe = (fn: () => void) => {
    this.fns.add(fn);
    return () => {
      this.fns.delete(fn);
    };
  };

  get = () => this.snap;

  protected set(p: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...p };
    for (const f of this.fns) f();
  }
}

export const BOT_NAMES = ['Lenga', 'Coihue', 'Ñirre', 'Calafate', 'Maqui', 'Canelo'];

export function cleanName(s: string): string {
  return s.replace(/\s+/g, ' ').trim().slice(0, 20) || '?';
}

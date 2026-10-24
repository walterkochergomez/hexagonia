import { useSyncExternalStore } from 'react';
import { detectLang, type Lang } from '../i18n';

export interface Prefs {
  name: string;
  lang: Lang;
  clientId: string;
  sound: boolean;
  /** giro del tablero en pasos de 60° (0–5) */
  boardRot: number;
  /** tablero inclinado (vista en perspectiva) */
  boardTilt: boolean;
}
const KEY = 'hexagonia.prefs';

function load(): Prefs {
  let saved: Partial<Prefs> = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Prefs>;
  } catch {
    /* sin almacenamiento */
  }
  const clientId = saved.clientId ?? (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36));
  return { name: saved.name ?? '', lang: saved.lang ?? detectLang(), clientId, sound: saved.sound ?? true, boardRot: ((saved.boardRot ?? 0) % 6 + 6) % 6, boardTilt: saved.boardTilt ?? false };
}

let state = load();
const fns = new Set<() => void>();

export const prefs = {
  get: () => state,
  set(p: Partial<Prefs>) {
    state = { ...state, ...p };
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* nada */
    }
    document.documentElement.lang = state.lang;
    for (const f of fns) f();
  },
  subscribe(fn: () => void) {
    fns.add(fn);
    return () => {
      fns.delete(fn);
    };
  },
};

export function usePrefs(): Prefs {
  return useSyncExternalStore(prefs.subscribe, prefs.get);
}

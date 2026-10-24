// Los manuales se cargan aparte (un archivo por idioma) para que no pesen en la partida.
import { useEffect, useState } from 'react';
import type { Lang } from '../i18n';
import type { Settings } from '../engine/types';
import type { ManualBook, ManualId } from './types';

const loaders: Record<Lang, () => Promise<{ default: ManualBook }>> = {
  es: () => import('./es'),
  de: () => import('./de'),
  en: () => import('./en'),
};
const cache = new Map<Lang, ManualBook>();

export function useManualBook(lang: Lang): ManualBook | null {
  const [book, setBook] = useState<ManualBook | null>(() => cache.get(lang) ?? null);
  useEffect(() => {
    const hit = cache.get(lang);
    if (hit) {
      setBook(hit);
      return;
    }
    let alive = true;
    loaders[lang]().then((m) => {
      cache.set(lang, m.default);
      if (alive) setBook(m.default);
    });
    return () => { alive = false; };
  }, [lang]);
  return book && cache.get(lang) === book ? book : cache.get(lang) ?? null;
}

/** Manual que corresponde a una partida. */
export function manualFor(s: Partial<Settings> & { seats?: number }): ManualId {
  const x = s as Record<string, unknown>;
  if (x.expedition) return 'expeditions';
  if (x.shire || x.harbormaster || x.chronicle || x.duel) return 'shires';
  if (s.openSea && s.guilds) return 'combo';
  if (s.openSea) return 'sea';
  if (s.guilds) return 'guilds';
  if ((s.seats ?? 0) >= 5) return 'big';
  return 'base';
}

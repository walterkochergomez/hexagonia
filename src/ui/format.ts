import type { T } from '../app/i18n';
import { prefs } from '../app/prefs';
import { CARDS, isCard, type GameState, type Hand, type LogEntry } from '../engine/types';
import type { Params } from '../i18n';

const SEAT_KEYS = ['seat', 'victim', 'with', 'to', 'owner'];

/** En alemán los sustantivos van con mayúscula; en español e inglés, en minúscula dentro de una frase. */
export function lower(s: string): string {
  return prefs.get().lang === 'de' ? s : s.toLowerCase();
}

export function cardName(c: string, t: T): string {
  if (isCard(c)) return t(`res.${c}`);
  if (['soldier', 'roads', 'plenty', 'monopoly', 'point'].includes(c)) return t(`dev.${c}`);
  return t(`progress.${c}`);
}

export function handText(h: Partial<Hand>, t: T): string {
  return CARDS.filter((c) => (h[c] ?? 0) > 0).map((c) => `${h[c]} ${lower(t(`res.${c}`))}`).join(', ');
}

function cardsText(s: string, t: T): string {
  return s.split(',').filter(Boolean).map((part) => {
    const [n, c] = part.split(':');
    return `${n} ${lower(t(`res.${c}`))}`;
  }).join(', ');
}

export function formatLog(e: { k: string; p?: LogEntry['p'] }, view: GameState, t: T): string {
  const p: Params = {};
  for (const [k, v] of Object.entries(e.p ?? {})) {
    if (SEAT_KEYS.includes(k) && typeof v === 'number') p[k] = view.players[v]?.name ?? '?';
    else if ((k === 'card' || k === 'give' || k === 'get') && typeof v === 'string' && !v.includes(':')) p[k] = lower(cardName(v, t));
    else if ((k === 'cards' || k === 'give' || k === 'want' || k === 'get') && typeof v === 'string') p[k] = cardsText(v, t);
    else if (k === 'track') p[k] = t(`track.${v}`);
    else if (k === 'terrain') p[k] = lower(t(`terrain.${v}`));
    else if (k === 'kind' || k === 'target') p[k] = lower(t(`piece.${v}`));
    else if (k === 'ev') p[k] = t(`chronicle.ev.${v}`);
    else if (k === 'port') p[k] = portName(String(v), t);
    else if (k === 'id') p[k] = t(`wonder.${v}`);
    else p[k] = v as string | number;
  }
  return t(`log.${e.k}`, p);
}

/** Puerto por su tipo: «3:1» o «2:1 de lana». */
export function portName(kind: string, t: T): string {
  return kind === 'any' ? t('harbor.any') : t('harbor.res', { res: lower(t(`res.${kind}`)) });
}

export function errorText(code: string, t: T): string {
  const s = t(`err.${code}`);
  return s === `err.${code}` ? t('err.default') : s;
}

export function drawRange(level: number): string {
  return level < 1 ? '—' : `1–${Math.min(6, level + 1)}`;
}

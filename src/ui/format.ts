import type { T } from '../app/i18n';
import { CARDS, isCard, type GameState, type Hand, type LogEntry } from '../engine/types';
import type { Params } from '../i18n';

const SEAT_KEYS = ['seat', 'victim', 'with', 'to', 'owner'];

export function cardName(c: string, t: T): string {
  if (isCard(c)) return t(`res.${c}`);
  if (['soldier', 'roads', 'plenty', 'monopoly', 'point'].includes(c)) return t(`dev.${c}`);
  return t(`progress.${c}`);
}

export function handText(h: Partial<Hand>, t: T): string {
  return CARDS.filter((c) => (h[c] ?? 0) > 0).map((c) => `${h[c]} ${t(`res.${c}`).toLowerCase()}`).join(', ');
}

function cardsText(s: string, t: T): string {
  return s.split(',').filter(Boolean).map((part) => {
    const [n, c] = part.split(':');
    return `${n} ${t(`res.${c}`).toLowerCase()}`;
  }).join(', ');
}

export function formatLog(e: { k: string; p?: LogEntry['p'] }, view: GameState, t: T): string {
  const p: Params = {};
  for (const [k, v] of Object.entries(e.p ?? {})) {
    if (SEAT_KEYS.includes(k) && typeof v === 'number') p[k] = view.players[v]?.name ?? '?';
    else if ((k === 'card' || k === 'give' || k === 'get') && typeof v === 'string' && !v.includes(':')) p[k] = cardName(v, t).toLowerCase();
    else if ((k === 'cards' || k === 'give' || k === 'want' || k === 'get') && typeof v === 'string') p[k] = cardsText(v, t);
    else if (k === 'track') p[k] = t(`track.${v}`);
    else if (k === 'terrain') p[k] = t(`terrain.${v}`).toLowerCase();
    else if (k === 'kind' || k === 'target') p[k] = t(`piece.${v}`).toLowerCase();
    else p[k] = v as string | number;
  }
  return t(`log.${e.k}`, p);
}

export function errorText(code: string, t: T): string {
  const s = t(`err.${code}`);
  return s === `err.${code}` ? t('err.default') : s;
}

export function drawRange(level: number): string {
  return level < 1 ? '—' : `1–${Math.min(6, level + 1)}`;
}

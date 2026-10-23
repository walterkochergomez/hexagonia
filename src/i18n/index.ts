import es, { type Dict } from './es';
import de from './de';
import en from './en';

export type Lang = 'es' | 'de' | 'en';
export type Key = keyof Dict;
export const LANGS: Lang[] = ['es', 'de', 'en'];
const DICTS: Record<Lang, Dict> = { es, de, en };

export type Params = Record<string, string | number | boolean | null | undefined>;

export function translate(lang: Lang, key: string, params?: Params): string {
  const dict = DICTS[lang] as Record<string, string>;
  let s = dict[key] ?? (es as Record<string, string>)[key] ?? key;
  if (!params) return s;
  s = s.replace(/\{(\w+):([^|}]*)\|([^}]*)\}/g, (_m, k: string, one: string, many: string) => {
    const v = params[k];
    return `${v} ${Number(v) === 1 ? one : many}`;
  });
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] === undefined || params[k] === null ? m : String(params[k])));
}

export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'es';
  return (LANGS as string[]).includes(nav) ? (nav as Lang) : 'es';
}

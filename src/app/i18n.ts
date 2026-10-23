import { useCallback } from 'react';
import { translate, type Params } from '../i18n';
import { usePrefs } from './prefs';

export type T = (key: string, params?: Params) => string;

export function useT(): T {
  const { lang } = usePrefs();
  return useCallback((key: string, params?: Params) => translate(lang, key, params), [lang]);
}

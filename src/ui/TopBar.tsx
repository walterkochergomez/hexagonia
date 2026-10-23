import { useState } from 'react';
import { useT } from '../app/i18n';
import { prefs, usePrefs } from '../app/prefs';
import { roomLink } from '../app/router';
import { LANGS, type Lang } from '../i18n';
import type { NetStatus, UiError } from '../net/session';

export function TopBar({ code, status, error, onHome }: { code: string | null; status?: NetStatus; error?: UiError | null; onHome: () => void }) {
  const t = useT();
  const { lang, sound } = usePrefs();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(roomLink(code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin portapapeles */
    }
  };
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={onHome} title={t('over.home')}>
        <svg width="22" height="22" viewBox="-11 -11 22 22" aria-hidden="true"><path d="M0 -10 L8.7 -5 L8.7 5 L0 10 L-8.7 5 L-8.7 -5 Z" className="brand-hex" /></svg>
        <span>{t('app.name')}</span>
      </button>
      {code && code.length > 0 && (
        <button type="button" className="room-code" onClick={copy} title={t('lobby.copy')}>
          {copied ? t('lobby.copied') : code}
        </button>
      )}
      {status && status !== 'open' && status !== 'closed' && (
        <span className={`net-state ${status}`} role="status">{error ? t(error.key, error.params) : t(status === 'connecting' ? 'net.connecting' : 'net.reconnecting')}</span>
      )}
      <span className="spacer" />
      <label className="lang">
        <span className="sr">Idioma / Sprache / Language</span>
        <select value={lang} onChange={(e) => prefs.set({ lang: e.target.value as Lang })}>
          {LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </label>
      <button type="button" className={`icon-btn${sound ? ' on' : ''}`} aria-pressed={sound} title={t('act.sound')} aria-label={t('act.sound')} onClick={() => prefs.set({ sound: !sound })}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="sound-icon">
          <path d="M4 9h4l5-4v14l-5-4H4z" />
          {sound ? <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" className="waves" /> : <path d="M16 9l5 6M21 9l-5 6" className="waves" />}
        </svg>
      </button>
      <a className="icon-btn" href="#/reglas" target={code ? '_blank' : undefined} rel="noopener" title={t('home.rules')} aria-label={t('home.rules')}>?</a>
    </header>
  );
}

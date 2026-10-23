import { useState } from 'react';
import { useT } from '../app/i18n';
import { prefs, usePrefs } from '../app/prefs';
import { go } from '../app/router';
import { forgetSavedHost, loadSavedHost } from '../net/host';
import { loadSavedLocal } from '../net/local';
import { newRoomCode, normalizeCode } from '../net/protocol';
import { IslandPreview } from './IslandPreview';
import { TopBar } from './TopBar';

export const CREATING_KEY = 'hexagonia.creating';

export function Home() {
  const t = useT();
  const { name, clientId } = usePrefs();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(() => {
    const s = loadSavedHost();
    return s && s.clientId === clientId ? s : null;
  });
  const local = loadSavedLocal();
  const needName = () => {
    if (!name.trim()) {
      setError(t('home.needName'));
      document.getElementById('name')?.focus();
      return true;
    }
    return false;
  };
  const create = () => {
    if (needName()) return;
    const c = newRoomCode();
    sessionStorage.setItem(CREATING_KEY, c);
    go(`sala/${c}`);
  };
  const join = () => {
    if (needName()) return;
    const c = normalizeCode(code);
    if (c.length !== 6) {
      setError(t('home.badCode'));
      return;
    }
    go(`sala/${c}`);
  };
  return (
    <div className="page home">
      <TopBar code={null} onHome={() => go('')} />
      <main className="home-main">
        <section className="hero">
          <h1 className="wordmark">{t('app.name')}</h1>
          <p className="tagline">{t('app.tagline')}</p>
          <IslandPreview />
        </section>
        <section className="home-panel">
          <label className="field" htmlFor="name">
            <span>{t('home.name')}</span>
            <input id="name" value={name} maxLength={20} autoComplete="nickname" placeholder={t('home.namePlaceholder')}
              onChange={(e) => { prefs.set({ name: e.target.value }); setError(null); }} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && (
            <div className="resume">
              <button type="button" className="btn primary lg" onClick={() => go(`sala/${saved.code}`)}>{t('home.resume', { code: saved.code })}</button>
              <p className="muted small">{t('home.resumeHint')} <button type="button" className="link" onClick={() => { forgetSavedHost(); setSaved(null); }}>{t('home.forget')}</button></p>
            </div>
          )}
          <div className="home-block">
            <button type="button" className={`btn ${saved ? 'secondary' : 'primary'} lg`} onClick={create}>{t('home.create')}</button>
            <p className="muted small">{t('home.createHint')}</p>
          </div>
          <form className="home-block join" onSubmit={(e) => { e.preventDefault(); join(); }}>
            <label className="field" htmlFor="code">
              <span>{t('home.join')}</span>
              <span className="join-row">
                <input id="code" value={code} maxLength={8} autoCapitalize="characters" placeholder={t('home.codePlaceholder')} onChange={(e) => { setCode(normalizeCode(e.target.value)); setError(null); }} />
                <button type="submit" className="btn secondary">{t('home.joinGo')}</button>
              </span>
            </label>
          </form>
          <div className="home-block">
            <button type="button" className="btn secondary" onClick={() => go(local ? 'local/juego' : 'local')}>{t('home.local')}</button>
            <p className="muted small">{t('home.localHint')}</p>
          </div>
          <a className="link" href="#/reglas">{t('home.rules')}</a>
        </section>
      </main>
    </div>
  );
}

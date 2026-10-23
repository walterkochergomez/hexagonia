import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../app/i18n';
import { prefs, usePrefs } from '../app/prefs';
import { go } from '../app/router';
import { GuestSession } from '../net/guest';
import { HostSession, loadSavedHost } from '../net/host';
import type { Session } from '../net/session';
import { Game } from './game/Game';
import { CREATING_KEY } from './Home';
import { Lobby } from './Lobby';
import { TopBar } from './TopBar';

function useSessionSnap(s: Session) {
  return useSyncExternalStore(s.subscribe, s.get);
}

export function Room({ code }: { code: string }) {
  const t = useT();
  const { name } = usePrefs();
  const [ready, setReady] = useState(() => !!prefs.get().name.trim());
  const [draft, setDraft] = useState(name);
  if (!ready) {
    return (
      <div className="page">
        <TopBar code={code} onHome={() => go('')} />
        <main className="narrow">
          <form className="panel" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { prefs.set({ name: draft.trim() }); setReady(true); } }}>
            <h1>{t('lobby.title', { code })}</h1>
            <label className="field" htmlFor="name">
              <span>{t('home.name')}</span>
              <input id="name" autoFocus value={draft} maxLength={20} placeholder={t('home.namePlaceholder')} onChange={(e) => setDraft(e.target.value)} />
            </label>
            <button type="submit" className="btn primary" disabled={!draft.trim()}>{t('home.joinGo')}</button>
          </form>
        </main>
      </div>
    );
  }
  return <RoomSession code={code} />;
}

function RoomSession({ code }: { code: string }) {
  const { clientId, name } = prefs.get();
  const session = useMemo<Session>(() => {
    const saved = loadSavedHost();
    const creating = sessionStorage.getItem(CREATING_KEY) === code;
    if (creating) sessionStorage.removeItem(CREATING_KEY);
    if (creating || (saved && saved.code === code && saved.clientId === clientId)) {
      return new HostSession(code, clientId, name, creating ? null : saved);
    }
    return new GuestSession(code, clientId, name);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => session.leave(), [session]);
  const snap = useSessionSnap(session);
  const t = useT();
  const home = () => go('');
  if (snap.status === 'closed' && snap.kind === 'guest') {
    return (
      <div className="page">
        <TopBar code={code} onHome={home} />
        <main className="narrow"><p>{t('lobby.full')}</p><button type="button" className="btn secondary" onClick={home}>{t('over.home')}</button></main>
      </div>
    );
  }
  if (snap.lobby?.status === 'playing' && snap.view) return <Game session={session} snap={snap} onHome={home} />;
  if (snap.lobby) return <Lobby session={session} snap={snap} clientId={clientId} onHome={home} />;
  return (
    <div className="page">
      <TopBar code={code} status={snap.status} error={snap.error} onHome={home} />
      <main className="narrow connecting">
        <div className="spinner" aria-hidden="true" />
        <p>{snap.error ? t(snap.error.key, snap.error.params) : t('net.connecting')}</p>
        <p className="muted small">{t('net.blocked')}</p>
      </main>
    </div>
  );
}

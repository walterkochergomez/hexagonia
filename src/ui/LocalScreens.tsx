import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useT } from '../app/i18n';
import { prefs } from '../app/prefs';
import { go } from '../app/router';
import { BOT_NAMES } from '../net/session';
import { LocalSession, forgetSavedLocal, loadSavedLocal, type LocalSeat } from '../net/local';
import { DEFAULT_SETTINGS, type LobbySettings } from '../net/protocol';
import { PlayerMark } from './art';
import { Game } from './game/Game';
import { SettingsForm } from './SettingsForm';
import { TopBar } from './TopBar';

let pending: LocalSession | null = null;

export function LocalSetup() {
  const t = useT();
  const me = prefs.get().name || 'Jugador 1';
  const [seats, setSeats] = useState<LocalSeat[]>([
    { name: me, color: 0, bot: false },
    { name: BOT_NAMES[0], color: 1, bot: true },
    { name: BOT_NAMES[1], color: 2, bot: true },
  ]);
  const [settings, setSettings] = useState<LobbySettings>({ ...DEFAULT_SETTINGS });
  const update = (i: number, p: Partial<LocalSeat>) => setSeats(seats.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const used = new Set(seats.map((s) => s.color));
  const start = () => {
    forgetSavedLocal();
    pending = new LocalSession({ seats, settings: { ...settings } });
    go('local/juego');
  };
  return (
    <div className="page">
      <TopBar code={null} onHome={() => go('')} />
      <main className="lobby">
        <section className="panel">
          <h1>{t('local.title')}</h1>
          <h2>{t('local.players')}</h2>
          <ul className="seat-list">
            {seats.map((s, i) => (
              <li key={i} className="seat">
                <button type="button" className="swatch on" aria-label={t('lobby.color')} onClick={() => {
                  const next = [1, 2, 3, 4, 5, 0].map((d) => (s.color + d) % 6).find((c) => !used.has(c));
                  if (next !== undefined) update(i, { color: next });
                }}><PlayerMark color={s.color} size={26} /></button>
                <input value={s.name} maxLength={20} aria-label={t('home.name')} onChange={(e) => update(i, { name: e.target.value })} />
                <select value={s.bot ? 'bot' : 'human'} aria-label={t('local.human')} onChange={(e) => update(i, { bot: e.target.value === 'bot' })}>
                  <option value="human">{t('local.human')}</option>
                  <option value="bot">{t('local.bot')}</option>
                </select>
                {seats.length > 2 && <button type="button" className="btn ghost sm" onClick={() => setSeats(seats.filter((_, j) => j !== i))}>{t('lobby.remove')}</button>}
              </li>
            ))}
          </ul>
          {seats.length < 6 && (
            <button type="button" className="btn secondary" onClick={() => {
              const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
              setSeats([...seats, { name: BOT_NAMES[seats.length % BOT_NAMES.length], color, bot: true }]);
            }}>{t('lobby.addBot')}</button>
          )}
        </section>
        <section className="panel">
          <h2>{t('lobby.settings')}</h2>
          <SettingsForm value={settings} onChange={(p) => setSettings({ ...settings, ...p })} seats={seats.length} />
        </section>
        <div className="lobby-actions">
          <button type="button" className="btn primary lg" disabled={seats.some((s) => !s.name.trim())} onClick={start}>{t('local.start')}</button>
        </div>
      </main>
    </div>
  );
}

export function LocalGame() {
  const t = useT();
  const session = useMemo(() => {
    if (pending) {
      const s = pending;
      pending = null;
      return s;
    }
    const saved = loadSavedLocal();
    return saved ? new LocalSession(saved) : null;
  }, []);
  useEffect(() => {
    if (!session) go('local');
    return () => session?.leave();
  }, [session]);
  const snap = useSyncExternalStore(session?.subscribe ?? noopSub, session?.get ?? noopGet);
  if (!session || !snap) return null;
  const home = () => go('');
  if (snap.pass !== null) {
    const name = session.nameOf(snap.pass);
    return (
      <div className="page pass">
        <TopBar code={null} onHome={home} />
        <main className="narrow pass-screen">
          <h1>{t('local.pass', { name })}</h1>
          <p>{t('local.passHint', { name })}</p>
          <button type="button" className="btn primary lg" autoFocus onClick={() => session.confirmPass?.()}>{t('local.ready', { name })}</button>
        </main>
      </div>
    );
  }
  if (!snap.view) return null;
  return <Game session={session} snap={snap} onHome={home} />;
}

const noopSub = () => () => {};
const noopGet = () => null;

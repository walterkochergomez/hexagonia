import { useState } from 'react';
import { useT } from '../app/i18n';
import { roomLink } from '../app/router';
import type { Session, Snapshot } from '../net/session';
import { PlayerMark } from './art';
import { SettingsForm } from './SettingsForm';
import { TopBar } from './TopBar';
import { manualFor } from '../manual/load';

export function Lobby({ session, snap, clientId, onHome }: { session: Session; snap: Snapshot; clientId: string; onHome: () => void }) {
  const t = useT();
  const lobby = snap.lobby!;
  const host = snap.kind === 'host';
  const [copied, setCopied] = useState(false);
  const me = lobby.seats.find((s) => s.clientId === clientId);
  const link = roomLink(lobby.code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* sin portapapeles */
    }
  };
  const used = new Set(lobby.seats.map((s) => s.color));
  return (
    <div className="page">
      <TopBar manual={manualFor({ ...lobby.settings, seats: lobby.seats.length })} code={lobby.code} status={snap.status} error={snap.error} onHome={onHome} />
      <main className="lobby">
        <section className="panel share">
          <h1>{t('lobby.title', { code: lobby.code })}</h1>
          <p>{t('lobby.share')}</p>
          <div className="share-row">
            <input readOnly value={link} aria-label={t('lobby.copy')} onFocus={(e) => e.target.select()} />
            <button type="button" className="btn primary" onClick={copy}>{copied ? t('lobby.copied') : t('lobby.copy')}</button>
          </div>
          <p className="muted small">{t('net.blocked')}</p>
        </section>
        <section className="panel">
          <h2>{t('lobby.players', { n: lobby.seats.length })}</h2>
          <ul className="seat-list">
            {lobby.seats.map((s) => (
              <li key={s.clientId} className={`seat${s.connected ? '' : ' off'}`}>
                <PlayerMark color={s.color} size={22} />
                <span className="pname">{s.name}{s.clientId === clientId && <span className="muted"> ({t('common.you')})</span>}</span>
                {s.host && <span className="tag">{t('lobby.host')}</span>}
                {s.bot && <span className="tag">{t('lobby.bot')}</span>}
                {!s.connected && <span className="tag warn">{t('lobby.offline')}</span>}
                {host && !s.host && <button type="button" className="btn ghost sm" onClick={() => session.removeSeat?.(s.clientId)}>{t('lobby.remove')}</button>}
              </li>
            ))}
          </ul>
          {me && (
            <div className="color-pick" role="radiogroup" aria-label={t('lobby.color')}>
              <span>{t('lobby.color')}</span>
              {[0, 1, 2, 3, 4, 5].map((c) => (
                <button key={c} type="button" role="radio" aria-checked={me.color === c} className={`swatch${me.color === c ? ' on' : ''}`} disabled={used.has(c) && me.color !== c} onClick={() => session.setSeat?.({ color: c })} aria-label={`${t('lobby.color')} ${c + 1}`}>
                  <PlayerMark color={c} size={26} />
                </button>
              ))}
            </div>
          )}
          {host && lobby.seats.length < 6 && <button type="button" className="btn secondary" onClick={() => session.addBot?.()}>{t('lobby.addBot')}</button>}
        </section>
        <section className="panel">
          <h2>{t('lobby.settings')}</h2>
          {!host && <p className="muted">{t('lobby.onlyHost')}</p>}
          <SettingsForm value={lobby.settings} onChange={(p) => session.updateSettings?.(p)} readOnly={!host} seats={lobby.seats.length} />
        </section>
        <div className="lobby-actions">
          {host ? (
            <>
              {lobby.seats.length < 2 && <p className="muted">{t('lobby.needPlayers')}</p>}
              <button type="button" className="btn primary lg" disabled={lobby.seats.length < 2} onClick={() => session.start?.()}>{t('lobby.start')}</button>
            </>
          ) : (
            <p className="muted">{me ? t('lobby.waitingHost') : t('lobby.spectator')}</p>
          )}
          <button type="button" className="btn ghost" onClick={onHome}>{t('lobby.leave')}</button>
        </div>
      </main>
    </div>
  );
}

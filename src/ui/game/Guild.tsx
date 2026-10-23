import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Guild from '../../engine/guilds';
import { TRACKS, TRACK_COMMODITY, type Action, type GameState } from '../../engine/types';
import { CardChip, Modal } from '../common';
import { drawRange } from '../format';

export function GuildSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const p = view.players[me];
  const canAct = ['main', 'specialBuild', 'paired'].includes(view.turn.phase) && C.actorOf(view) === me && !view.steps.length;
  return (
    <Modal title={t('guild.title')} onClose={onClose} wide>
      <BarbarianMeter view={view} />
      <ul className="tracks-list">
        {TRACKS.map((tr) => {
          const lvl = p.improvements[tr];
          const next = lvl + 1;
          const metro = view.metropolis[tr];
          return (
            <li key={tr} className={`track-row tr-${tr}`}>
              <div className="track-head">
                <h3>{t(`track.${tr}`)}</h3>
                <span className="levels" aria-label={t('guild.level', { n: lvl })}>
                  {[1, 2, 3, 4, 5].map((n) => <span key={n} className={`dot${n <= lvl ? ' on' : ''}${n === 3 ? ' ability' : ''}`} />)}
                </span>
              </div>
              <p className={lvl >= 3 ? '' : 'muted'}>{t(`guild.ability.${tr}`)}</p>
              <p className="muted small">{t('guild.draws', { range: drawRange(lvl) })}</p>
              {metro && <p className="small">{t('guild.metroOf', { name: view.players[metro.owner].name })}</p>}
              {lvl < 5 ? (
                <button type="button" className="btn secondary sm" disabled={!canAct || !Guild.canImprove(view, me, tr)} onClick={() => send({ t: 'improve', track: tr })}>
                  {t('guild.next', { n: next, cost: '' })} <CardChip card={TRACK_COMMODITY[tr]} n={next} />
                </button>
              ) : (
                <p className="small">{t('guild.max')}</p>
              )}
            </li>
          );
        })}
      </ul>
      {!Guild.hasCity(view, me) && <p className="muted">{t('guild.needCity')}</p>}
    </Modal>
  );
}

export function BarbarianMeter({ view, compact }: { view: GameState; compact?: boolean }) {
  const t = useT();
  if (!view.settings.guilds) return null;
  const pos = view.barbarians.pos;
  let strength = 0;
  for (const b of Object.values(view.buildings)) if (b.kind === 'city' && !b.damaged) strength++;
  const defense = Object.values(view.knights).filter((k) => k.active).reduce((a, k) => a + k.level, 0);
  return (
    <div className={`barbarians${compact ? ' compact' : ''}`} aria-label={t('guild.barbarians')}>
      <div className="barb-track" title={`${t('guild.barbariansPos', { n: 7 - pos })} · ${t('guild.strength', { a: strength, b: defense })}`}>
        {Array.from({ length: 8 }, (_, i) => <span key={i} className={`step${i === pos ? ' ship' : ''}${i === 7 ? ' shore' : ''}`} />)}
      </div>
      {compact ? (
        <span className="small barb-numbers" aria-label={t('guild.strength', { a: strength, b: defense })}>⚔ {strength}:{defense}</span>
      ) : (
        <p className="small">{t('guild.barbariansPos', { n: 7 - pos })} · {t('guild.strength', { a: strength, b: defense })}</p>
      )}
      {!compact && view.barbarians.attacks === 0 && <p className="muted small">{t('guild.robberAsleep')}</p>}
    </div>
  );
}

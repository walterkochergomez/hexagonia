import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import { TRACKS, type GameState } from '../../engine/types';
import type { LobbyState } from '../../net/protocol';
import { PlayerMark } from '../art';

export function Players({ view, me, lobby, compact }: { view: GameState; me: number | null; lobby: LobbyState | null; compact?: boolean }) {
  const t = useT();
  const actor = view.winner === null ? C.actorOf(view) : null;
  const waiting = new Set(view.steps[0] && view.steps[0].k !== 'produce' ? C.waitingSeats(view.steps[0]) : []);
  return (
    <ol className={`players${compact ? ' compact' : ''}`} tabIndex={0} aria-label={t('act.players')}>
      {view.players.map((p) => {
        const seat = p.seat;
        if (p.neutral) {
          const label = t('player.neutral', { n: neutralLetter(view, seat) });
          return compact ? null : (
            <li key={seat} className="player neutral" data-seat={seat}>
              <div className="prow">
                <PlayerMark color={p.color} />
                <span className="pname">{label}</span>
                <span className="tag">{t('player.neutralTag')}</span>
              </div>
            </li>
          );
        }
        const vp = C.vpOf(view, seat, seat === me || view.winner !== null);
        const offline = lobby?.seats[seat] && !lobby.seats[seat].connected;
        const knights = Object.values(view.knights).filter((k) => k.owner === seat);
        const strength = knights.filter((k) => k.active).reduce((a, k) => a + k.level, 0);
        const route = C.longestRoute(view, seat);
        const badges: string[] = [];
        if (view.awards.road.owner === seat) badges.push(t('player.longest'));
        if (!view.settings.guilds && view.awards.army.owner === seat) badges.push(t('player.army'));
        if (view.awards.harbor?.owner === seat) badges.push(t('player.harbor'));
        if (view.fish?.boot === seat) badges.push(t('player.boot'));
        const wealth = C.wealthBonus(view, seat);
        if (wealth > 0) badges.push(t('player.richest'));
        if (wealth < 0) badges.push(t('player.poorest'));
        const camels = C.camelBonus(view, seat);
        if (camels) badges.push(t('player.camels', { n: camels }));
        for (const tr of TRACKS) if (view.metropolis[tr]?.owner === seat) badges.push(t('guild.metro', { track: t(`track.${tr}`) }));
        if (p.defender) badges.push(`${t('player.defender')} ×${p.defender}`);
        const bonus = p.bonus.reduce((a, b) => a + b.vp, 0);
        if (bonus) badges.push(`${t('over.breakdown.bonus')} +${bonus}`);
        const cls = ['player', actor === seat ? 'acting' : '', waiting.has(seat) ? 'waiting' : '', seat === me ? 'me' : '', view.winner === seat ? 'winner' : ''].join(' ');
        if (compact) {
          return (
            <li key={seat} className={cls} title={p.name} data-seat={seat}>
              <PlayerMark color={p.color} size={16} />
              <span className="pname">{p.name}</span>
              <span className="vp">{vp}</span>
            </li>
          );
        }
        return (
          <li key={seat} className={cls} data-seat={seat}>
            <div className="prow">
              <PlayerMark color={p.color} />
              <span className="pname">{p.name}{seat === me && <span className="muted"> ({t('common.you')})</span>}</span>
              {offline && <span className="tag warn">{t('player.offline')}</span>}
              {lobby?.seats[seat]?.bot && <span className="tag">{t('lobby.bot')}</span>}
              <span className="vp" aria-label={t('player.vp', { n: vp })}>{t('player.vp', { n: vp })}</span>
            </div>
            <div className="pstats">
              <span>{t('player.cards', { n: p.handCount ?? 0 })}</span>
              {!view.settings.guilds && <span>{t('player.dev', { n: p.devCount ?? 0 })}</span>}
              {!view.settings.guilds && p.soldiers > 0 && <span>{t('player.soldiers', { n: p.soldiers })}</span>}
              {view.settings.guilds && <span>{t('player.progress', { n: p.progressCount ?? 0 })}</span>}
              {view.settings.guilds && <span>{t('player.knights', { n: `${strength}/${knights.reduce((a, k) => a + k.level, 0)}` })}</span>}
              <span>{t('player.route', { n: route })}</span>
              {p.tokens !== undefined && <span>{t('player.tokens', { n: p.tokens })}</span>}
              {view.fish && <span>{t('player.fish', { n: p.fish?.length || p.fishCount || 0 })}</span>}
              {view.river && <span>{t('player.coins', { n: view.river.coins[seat] ?? 0 })}</span>}
              {view.settings.guilds && (
                <span className="tracks" aria-label={t('guild.title')}>
                  {TRACKS.map((tr) => <span key={tr} className={`lvl tr-${tr}`} title={`${t(`track.${tr}`)} ${p.improvements[tr]}`}>{p.improvements[tr]}</span>)}
                </span>
              )}
            </div>
            {badges.length > 0 && <div className="badges">{badges.map((b) => <span key={b} className="tag gold">{b}</span>)}</div>}
          </li>
        );
      })}
    </ol>
  );
}

/** Letra de cada neutral (A, B) en el orden de la mesa. */
export function neutralLetter(view: GameState, seat: number): string {
  const i = view.players.filter((p) => p.neutral).findIndex((p) => p.seat === seat);
  return String.fromCharCode(65 + Math.max(0, i));
}

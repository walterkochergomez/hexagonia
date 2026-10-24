import { useT } from '../../app/i18n';
import * as Duel from '../../engine/mods/duel';
import type { Action, GameState } from '../../engine/types';
import { Modal } from '../common';

/** Duelo: fichas de comercio para forzar un cambio, devolver el ladrón al desierto o canjear un soldado. */
export function DuelSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const p = view.players[me];
  const opp = Duel.opponentOf(view, me);
  const cost = Duel.tokenCost(view, me);
  const supply = view.duel?.supply ?? 0;
  const main = view.turn.phase === 'main' && view.turn.current === me && !view.steps.length;
  const items = [
    { id: 'force', label: t('duel.force'), hint: t('duel.forceHint', { name: view.players[opp].name }), ok: Duel.canUseToken(view, me, 'force'), act: { t: 'token', use: 'force' } as Action, cost },
    { id: 'robber', label: t('duel.robber'), hint: t('duel.robberHint'), ok: Duel.canUseToken(view, me, 'robber'), act: { t: 'token', use: 'robber' } as Action, cost },
    { id: 'cash', label: t('duel.cash'), hint: t('duel.cashHint'), ok: main && p.soldiers > 0 && supply > 0, act: { t: 'cashSoldier' } as Action, cost: 0 },
  ];
  return (
    <Modal title={t('duel.title')} onClose={onClose}>
      <p>{t('duel.have', { n: p.tokens ?? 0, c: cost })} <span className="muted">{t(cost === 1 ? 'duel.why1' : 'duel.why2')}</span></p>
      {view.turn.tokenUsed && <p className="muted small">{t('duel.used')}</p>}
      <ul className="build-list">
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className="build-item" disabled={!it.ok} onClick={() => { send(it.act); onClose(); }}>
              <span className="build-text">
                <span className="build-name">{it.label}</span>
                <span className="hint">{it.hint}</span>
              </span>
              {it.cost > 0 && <span className="tag gold">{t('player.tokens', { n: it.cost })}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">{t('duel.supply', { n: supply })}</p>
    </Modal>
  );
}

import { useState } from 'react';
import { useT } from '../../app/i18n';
import * as Gold from '../../engine/mods/gold';
import { RESOURCES, type Action, type GameState, type Resource } from '../../engine/types';
import { CardIcon, PlayerMark } from '../art';
import { Modal } from '../common';

/** Oro: comprar un recurso con 2 (dos veces por turno) o cambiar recursos por oro. */
export function GoldSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const gold = view.gold ?? [];
  const hand = view.players[me].hand;
  const [give, setGive] = useState<Resource | ''>('');
  const main = view.turn.phase === 'main' && view.turn.current === me && !view.steps.length;
  const ratio = Gold.sellRatio(view, me);
  return (
    <Modal title={t('gold.title')} onClose={onClose}>
      <p><strong>{t('gold.have', { n: gold[me] ?? 0 })}</strong></p>
      <ol className="coin-standings">
        {view.players.filter((x) => !x.neutral).map((x) => (
          <li key={x.seat}><PlayerMark color={x.color} size={14} /> {x.name} <span className="muted">· {t('gold.count', { n: gold[x.seat] ?? 0 })}</span></li>
        ))}
      </ol>
      <ul className="build-list">
        <li>
          <button type="button" className="build-item" disabled={!Gold.canBuy(view, me)} onClick={() => { send({ t: 'gold', use: 'buy' }); onClose(); }}>
            <span className="build-text">
              <span className="build-name">{t('gold.buy')}</span>
              <span className="hint">{t('gold.buyHint', { n: Gold.BUYS - (view.turn.goldBuys ?? 0) })}</span>
            </span>
          </button>
        </li>
      </ul>
      <div className="coin-buy">
        <label className="field">
          <span>{t('gold.sell')}</span>
          <select value={give} onChange={(e) => setGive(e.target.value as Resource | '')} disabled={!main}>
            <option value="">—</option>
            {RESOURCES.map((r) => <option key={r} value={r} disabled={hand[r] < ratio}>{t(`res.${r}`)} ({ratio}:1)</option>)}
          </select>
        </label>
        <button type="button" className="btn secondary" disabled={!main || !give || hand[give] < ratio} onClick={() => { if (give) send({ t: 'sellGold', give }); onClose(); }}>
          {give && <CardIcon card={give} size={20} />} {t('gold.sellDo', { n: ratio })}
        </button>
      </div>
      <p className="muted small">{t('gold.hint')}</p>
    </Modal>
  );
}

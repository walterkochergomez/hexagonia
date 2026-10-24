import { useState } from 'react';
import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Fish from '../../engine/mods/fish';
import * as River from '../../engine/mods/river';
import { FISH_COST, RESOURCES, type Action, type FishUse, type GameState, type Resource } from '../../engine/types';
import { CardIcon, PlayerMark } from '../art';
import { Modal } from '../common';

const USES: FishUse[] = ['robber', 'steal', 'bank', 'road', 'dev'];

/** Ficha de pescado: un pez por cada punto de valor. */
export function FishToken({ value, size = 30 }: { value: number; size?: number }) {
  return (
    <svg className="fish-token" width={size} height={size} viewBox="-15 -15 30 30" role="img" aria-label={String(value)}>
      <circle r={13.6} className="fish-token-disc" />
      {Array.from({ length: value }, (_, i) => (
        <path key={i} transform={`translate(0 ${(i - (value - 1) / 2) * 6.6}) scale(.62)`} d="M-9 0 Q-2 -7 7 -1 Q-2 6 -9 0 Z M7 -1 L12 -5 L11.4 4 Z" className="fish-token-fish" />
      ))}
    </svg>
  );
}

export function FishSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const p = view.players[me];
  const tokens = p.fish ?? [];
  const total = tokens.reduce((a, b) => a + b, 0);
  const boot = view.fish?.boot === me;
  const targets = Fish.bootTargets(view, me);
  return (
    <Modal title={t('fish.title')} onClose={onClose}>
      <div className="fish-hand" aria-label={t('fish.have', { n: total })}>
        {tokens.length ? tokens.map((v, i) => <FishToken key={i} value={v} />) : <span className="muted">{t('fish.none')}</span>}
        <span className="fish-total">{t('fish.have', { n: total })}</span>
      </div>
      <p className="muted small">{t('fish.limit', { n: Fish.FISH_LIMIT, left: view.fish?.pile ?? 0 })}</p>
      <ul className="build-list">
        {USES.map((use) => (
          <li key={use}>
            <button type="button" className="build-item" disabled={!Fish.canFish(view, me, use)} onClick={() => { send({ t: 'fish', use }); onClose(); }}>
              <span className="build-text">
                <span className="build-name">{t(`fish.use.${use}`)}</span>
                <span className="hint">{t(`fish.use.${use}Hint`)}</span>
              </span>
              <span className="tag gold">{t('fish.cost', { n: FISH_COST[use] })}</span>
            </button>
          </li>
        ))}
      </ul>
      {boot && (
        <div className="boot-box">
          <p><strong>{t('fish.bootYou')}</strong> {t('fish.bootHint')}</p>
          <div className="choice-list">
            {targets.map((x) => (
              <button key={x} type="button" className="btn secondary" onClick={() => { send({ t: 'passBoot', to: x }); onClose(); }}>
                <PlayerMark color={view.players[x].color} size={16} /> {t('fish.passTo', { name: view.players[x].name })}
              </button>
            ))}
            {!targets.length && <p className="muted small">{t('fish.bootNobody')}</p>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function CoinsSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const coins = view.river?.coins ?? [];
  const mine = coins[me] ?? 0;
  const hand = view.players[me].hand;
  const [give, setGive] = useState<Resource | ''>('');
  const main = view.turn.phase === 'main' && view.turn.current === me && !view.steps.length;
  const ratio = give ? C.ratioFor(view, me, give) : 0;
  const wealth = C.wealthBonus(view, me);
  return (
    <Modal title={t('coins.title')} onClose={onClose}>
      <p><strong>{t('coins.have', { n: mine })}</strong> {wealth > 0 ? t('coins.richest') : wealth < 0 ? t('coins.poorest') : ''}</p>
      <ol className="coin-standings">
        {view.players.filter((x) => !x.neutral).map((x) => (
          <li key={x.seat}><PlayerMark color={x.color} size={14} /> {x.name} <span className="muted">· {t('coins.count', { n: coins[x.seat] ?? 0 })}</span> {C.wealthBonus(view, x.seat) !== 0 && <span className="tag gold">{C.wealthBonus(view, x.seat) > 0 ? '+1' : '−2'}</span>}</li>
        ))}
      </ol>
      <ul className="build-list">
        <li>
          <button type="button" className="build-item" disabled={!River.canTradeCoins(view, me)} onClick={() => { send({ t: 'coins', use: 'trade' }); onClose(); }}>
            <span className="build-text">
              <span className="build-name">{t('coins.trade')}</span>
              <span className="hint">{t('coins.tradeHint', { n: River.COIN_TRADES - (view.turn.coinTrades ?? 0) })}</span>
            </span>
          </button>
        </li>
      </ul>
      <div className="coin-buy">
        <label className="field">
          <span>{t('coins.buy')}</span>
          <select value={give} onChange={(e) => setGive(e.target.value as Resource | '')} disabled={!main}>
            <option value="">—</option>
            {RESOURCES.map((r) => <option key={r} value={r} disabled={hand[r] < C.ratioFor(view, me, r)}>{t(`res.${r}`)} ({C.ratioFor(view, me, r)}:1)</option>)}
          </select>
        </label>
        <button type="button" className="btn secondary" disabled={!main || !give || hand[give] < ratio} onClick={() => { if (give) send({ t: 'buyCoin', give }); onClose(); }}>
          {give && <CardIcon card={give} size={20} />} {t('coins.buyDo', { n: ratio || 4 })}
        </button>
      </div>
    </Modal>
  );
}

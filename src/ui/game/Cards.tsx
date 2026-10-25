import { useState } from 'react';
import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Guild from '../../engine/guilds';
import * as Raid from '../../engine/mods/raid';
import { CARDS, COMMODITIES, PROGRESS_TRACK, RESOURCES, TRACKS, handTotal, type Action, type Card, type DevType, type GameState, type ProgressType, type Track } from '../../engine/types';
import { CardIcon, PlayerMark } from '../art';
import { Modal } from '../common';
import { BOARD_PROGRESS, type Mode } from './plan';

const DEV_ORDER: DevType[] = ['soldier', 'roads', 'plenty', 'monopoly', 'point'];

export function CardsSheet({ view, me, send, setMode, onClose }: { view: GameState; me: number; send: (a: Action) => void; setMode: (m: Mode) => void; onClose: () => void }) {
  const t = useT();
  const p = view.players[me];
  const turn = view.turn;
  const [asking, setAsking] = useState<ProgressType | null>(null);
  if (asking) return <ProgressDialog view={view} me={me} card={asking} send={(a) => { send(a); setAsking(null); onClose(); }} onClose={() => setAsking(null)} />;

  if (view.raid) {
    // invasión: las cartas se resuelven al comprarlas; aquí solo se ve el mazo
    const canBuy = ['main', 'specialBuild', 'paired'].includes(turn.phase) && C.actorOf(view) === me && C.hasCards(p.hand, { wool: 1, grain: 1, ore: 1 }) && !view.steps.length;
    return (
      <Modal title={t('cards.title')} onClose={onClose} wide
        actions={<button type="button" className="btn secondary" disabled={!canBuy} onClick={() => { send({ t: 'buyDev' }); onClose(); }}>{t('act.buyDev')} · <span className="muted">{t('cards.deck', { n: view.decks.dev })}</span></button>}>
        <p className="muted">{t('raid.cardsHint')}</p>
        <ul className="card-list">
          {Raid.DECK.map(([c, n]) => (
            <li key={c} className={`dev-card r-${c}`}>
              <div>
                <h3>{t(`raidcard.${c}`)} <span className="muted">×{n}</span></h3>
                <p>{t(`raidcard.${c}.d`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    );
  }

  if (!view.settings.guilds) {
    const myTurn = ((turn.phase === 'preRoll' || turn.phase === 'main') && turn.current === me) || (turn.phase === 'paired' && turn.partner === me);
    const canBuy = ['main', 'specialBuild', 'paired'].includes(turn.phase) && C.actorOf(view) === me && C.hasCards(p.hand, { wool: 1, grain: 1, ore: 1 }) && view.decks.dev > 0 && !view.steps.length;
    const groups = DEV_ORDER.map((type) => ({ type, cards: p.dev.filter((d) => d.type === type) })).filter((g) => g.cards.length);
    return (
      <Modal title={t('cards.title')} onClose={onClose} wide
        actions={<button type="button" className="btn secondary" disabled={!canBuy} onClick={() => send({ t: 'buyDev' })}>{t('act.buyDev')} · <span className="muted">{t('cards.deck', { n: view.decks.dev })}</span></button>}>
        {!groups.length && <p className="muted">{t('cards.none')}</p>}
        {p.devPlayedTurn === turn.n && <p className="muted">{t('cards.oneDev')}</p>}
        <ul className="card-list">
          {groups.map(({ type, cards }) => {
            const ready = cards.some((d) => d.turn !== turn.n);
            // bastiones: el soldado arma un barco y hace falta uno sin armar en la ruta
            const armable = type !== 'soldier' || !view.bastions || C.bastionRoute(view, me).edges.some((e) => !view.ships[e]?.war);
            const playable = type !== 'point' && myTurn && ready && p.devPlayedTurn !== turn.n && !view.steps.length && armable;
            return (
              <li key={type} className={`dev-card d-${type}`}>
                <div>
                  <h3>{t(`dev.${type}`)} {cards.length > 1 && <span className="muted">×{cards.length}</span>}</h3>
                  <p>{t(type === 'soldier' && view.bastions ? 'dev.soldier.dFort' : `dev.${type}.d`)}</p>
                  {!ready && <p className="muted small">{t('cards.new')}</p>}
                </div>
                {type !== 'point' && (
                  <button type="button" className="btn primary sm" disabled={!playable} onClick={() => { send({ t: 'playDev', card: type } as Action); onClose(); }}>{t('act.play')}</button>
                )}
              </li>
            );
          })}
        </ul>
      </Modal>
    );
  }

  const play = (card: ProgressType) => {
    if (BOARD_PROGRESS.includes(card)) {
      setMode({ k: 'progress', card, picked: [] });
      onClose();
      return;
    }
    if (['alchemist', 'crane', 'deserter', 'spy', 'masterMerchant', 'merchantFleet', 'resourceMonopoly', 'tradeMonopoly'].includes(card)) {
      setAsking(card);
      return;
    }
    send({ t: 'playProgress', card });
    onClose();
  };
  return (
    <Modal title={t('cards.title')} onClose={onClose} wide>
      {!p.progress.length && <p className="muted">{t('cards.none')}</p>}
      <ul className="card-list">
        {p.progress.map((card, i) => (
          <li key={`${card}-${i}`} className={`progress-card tr-${PROGRESS_TRACK[card]}`}>
            <div>
              <h3>{t(`progress.${card}`)}</h3>
              <p>{t(`progress.${card}.d`)}</p>
            </div>
            <button type="button" className="btn primary sm" disabled={!Guild.canPlayProgress(view, me, card)} onClick={() => play(card)}>{t('act.play')}</button>
          </li>
        ))}
      </ul>
      {p.vpCards.length > 0 && (
        <>
          <h3>{t('cards.vp')}</h3>
          <p>{p.vpCards.map((c) => t(`progress.${c}`)).join(', ')}</p>
        </>
      )}
    </Modal>
  );
}

function ProgressDialog({ view, me, card, send, onClose }: { view: GameState; me: number; card: ProgressType; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const [d, setD] = useState<[number, number]>([3, 4]);
  const play = (arg: object) => send({ t: 'playProgress', card, arg });
  const others = view.players.filter((p) => p.seat !== me);
  const myVp = C.vpOf(view, me, false);
  let body: React.ReactNode = null;
  if (card === 'alchemist') {
    body = (
      <div className="dice-pick">
        {[0, 1].map((i) => (
          <label key={i}>
            {i === 0 ? '🎲 1' : '🎲 2'}
            <select value={d[i]} onChange={(e) => { const nd: [number, number] = [...d]; nd[i] = Number(e.target.value); setD(nd); }}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        ))}
        <button type="button" className="btn primary" onClick={() => play({ dice: d })}>{t('act.play')} · {d[0] + d[1]}</button>
      </div>
    );
  } else if (card === 'crane') {
    body = (
      <div className="choice-list">
        {TRACKS.map((tr: Track) => (
          <button key={tr} type="button" className={`btn secondary tr-${tr}`} disabled={!Guild.canImprove(view, me, tr, 1)} onClick={() => play({ track: tr })}>{t(`track.${tr}`)}</button>
        ))}
      </div>
    );
  } else if (card === 'deserter' || card === 'spy' || card === 'masterMerchant') {
    const ok = (seat: number) => {
      const p = view.players[seat];
      if (card === 'deserter') return Object.values(view.knights).some((k) => k.owner === seat);
      if (card === 'spy') return (p.progressCount ?? p.progress.length) > 0;
      return C.vpOf(view, seat, false) > myVp && (p.handCount ?? handTotal(p.hand)) > 0;
    };
    body = (
      <div className="choice-list">
        {others.map((p) => (
          <button key={p.seat} type="button" className="btn secondary" disabled={!ok(p.seat)} onClick={() => play({ seat: p.seat })}>
            <PlayerMark color={p.color} size={16} /> {p.name}
          </button>
        ))}
      </div>
    );
  } else {
    const list: readonly Card[] = card === 'resourceMonopoly' ? RESOURCES : card === 'tradeMonopoly' ? COMMODITIES : CARDS;
    body = (
      <div className="card-grid">
        {list.map((c) => (
          <button key={c} type="button" className="card-btn" onClick={() => play({ card: c })}>
            <CardIcon card={c} size={30} />
            <span>{t(`res.${c}`)}</span>
          </button>
        ))}
      </div>
    );
  }
  return (
    <Modal title={t(`progress.${card}`)} onClose={onClose}>
      <p>{t(`progress.${card}.d`)}</p>
      {body}
    </Modal>
  );
}

import { useState } from 'react';
import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import { CARDS, COMMODITIES, RESOURCES, handTotal, type Action, type Card, type GameState, type Hand } from '../../engine/types';
import { CardIcon, PlayerMark } from '../art';
import { CardPicker, HandLine, Modal, Segmented } from '../common';
import { lower } from '../format';

const cardsFor = (v: GameState) => (v.settings.guilds ? CARDS : RESOURCES);

export function TradeSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const turn = view.turn;
  const canPlayers = turn.phase === 'main' && turn.current === me;
  const canBank = (turn.phase === 'main' && turn.current === me) || (turn.phase === 'paired' && turn.partner === me);
  const [tab, setTab] = useState<'players' | 'bank'>(canPlayers ? 'players' : 'bank');
  return (
    <Modal title={t('trade.title')} onClose={onClose} wide>
      <Segmented value={tab} onChange={setTab} label={t('trade.title')} options={[{ value: 'players', label: t('trade.players') }, { value: 'bank', label: t('trade.bank') }]} />
      {tab === 'players' ? (
        canPlayers ? <PlayerTrade view={view} me={me} send={send} /> : <p className="muted">{t('trade.waitTurn')}</p>
      ) : canBank ? (
        <BankTrade view={view} me={me} send={send} />
      ) : (
        <p className="muted">{t('err.notYourTurn')}</p>
      )}
    </Modal>
  );
}

function PlayerTrade({ view, me, send }: { view: GameState; me: number; send: (a: Action) => void }) {
  const t = useT();
  const hand = view.players[me].hand;
  const [give, setGive] = useState<Partial<Hand>>({});
  const [want, setWant] = useState<Partial<Hand>>({});
  const others = view.players.filter((p) => p.seat !== me);
  const [to, setTo] = useState<number[]>(others.map((p) => p.seat));
  const offer = view.trade && view.trade.from === me ? view.trade : null;
  const cards = cardsFor(view);
  if (offer) {
    return (
      <div className="trade-open">
        <p className="offer-line"><strong>{t('trade.youGive')}</strong> <HandLine hand={offer.give} /></p>
        <p className="offer-line"><strong>{t('trade.youGet')}</strong> <HandLine hand={offer.want} /></p>
        <ul className="replies">
          {offer.to.map((seat) => {
            const p = view.players[seat];
            const r = offer.replies[seat];
            return (
              <li key={seat} className={`reply ${r?.status ?? 'pending'}`}>
                <PlayerMark color={p.color} size={16} />
                <span className="pname">{p.name}</span>
                <span className="muted">{r ? t(`trade.${r.status === 'accept' ? 'accepted' : r.status === 'decline' ? 'declined' : 'countered'}`) : t('trade.pending')}</span>
                {r?.status === 'counter' && (
                  <span className="counter-terms">
                    <HandLine hand={r.give ?? {}} /> ⇄ <HandLine hand={r.want ?? {}} />
                  </span>
                )}
                {r && r.status !== 'decline' && (
                  <button type="button" className="btn primary sm" onClick={() => send({ t: 'confirmTrade', id: offer.id, with: seat })}>
                    {t('trade.confirmWith', { name: p.name })}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn secondary" onClick={() => send({ t: 'cancelTrade' })}>{t('trade.cancel')}</button>
      </div>
    );
  }
  const valid = handTotal(give) > 0 && handTotal(want) > 0 && !cards.some((c) => (give[c] ?? 0) > 0 && (want[c] ?? 0) > 0) && to.length > 0;
  return (
    <div className="trade-compose">
      <div className="two-col">
        <section>
          <h3>{t('trade.give')}</h3>
          <CardPicker cards={cards} limit={hand} value={give} onChange={setGive} />
        </section>
        <section>
          <h3>{t('trade.want')}</h3>
          <CardPicker cards={cards} limit={Object.fromEntries(cards.map((c) => [c, 9]))} value={want} onChange={setWant} />
        </section>
      </div>
      <fieldset className="to-list">
        <legend>{t('trade.to')}</legend>
        {others.map((p) => (
          <label key={p.seat} className="check">
            <input type="checkbox" checked={to.includes(p.seat)} onChange={(e) => setTo(e.target.checked ? [...to, p.seat] : to.filter((x) => x !== p.seat))} />
            <PlayerMark color={p.color} size={14} /> {p.name}
          </label>
        ))}
      </fieldset>
      <button type="button" className="btn primary" disabled={!valid} onClick={() => send({ t: 'offer', give: clean(give), want: clean(want), to })}>{t('trade.send')}</button>
    </div>
  );
}

function clean(h: Partial<Hand>): Partial<Hand> {
  return Object.fromEntries(Object.entries(h).filter(([, n]) => (n ?? 0) > 0));
}

function BankTrade({ view, me, send }: { view: GameState; me: number; send: (a: Action) => void }) {
  const t = useT();
  const hand = view.players[me].hand;
  const cards = cardsFor(view);
  const [give, setGive] = useState<Card | null>(null);
  const [get, setGet] = useState<Card | null>(null);
  const [count, setCount] = useState(1);
  const ratio = give ? C.ratioFor(view, me, give) : 4;
  const maxCount = give && get ? Math.min(Math.floor(hand[give] / ratio), view.bank[get]) : 0;
  const n = Math.min(count, Math.max(1, maxCount));
  return (
    <div className="bank-trade">
      <h3>{t('trade.bankGive')}</h3>
      <div className="card-grid">
        {cards.map((c) => {
          const r = C.ratioFor(view, me, c);
          const ok = hand[c] >= r;
          return (
            <button key={c} type="button" className={`card-btn${give === c ? ' on' : ''}`} disabled={!ok} aria-pressed={give === c} onClick={() => { setGive(c); if (get === c) setGet(null); }}>
              <CardIcon card={c} size={30} />
              <span>{t(`res.${c}`)}</span>
              <span className="ratio">{t('trade.ratio', { n: r })}</span>
            </button>
          );
        })}
      </div>
      <h3>{t('trade.bankGet')}</h3>
      <div className="card-grid">
        {cards.map((c) => (
          <button key={c} type="button" className={`card-btn${get === c ? ' on' : ''}`} disabled={c === give || view.bank[c] <= 0} aria-pressed={get === c} onClick={() => setGet(c)}>
            <CardIcon card={c} size={30} />
            <span>{t(`res.${c}`)}</span>
            <span className="muted">{view.bank[c]}</span>
          </button>
        ))}
      </div>
      {give && get && maxCount > 1 && (
        <div className="count-row">
          <button type="button" className="step-btn" disabled={n <= 1} onClick={() => setCount(n - 1)}>−</button>
          <span className="pick-n">{n}</span>
          <button type="button" className="step-btn" disabled={n >= maxCount} onClick={() => setCount(n + 1)}>+</button>
        </div>
      )}
      <button type="button" className="btn primary" disabled={!give || !get || maxCount < 1}
        onClick={() => give && get && send({ t: 'bank', give, get, count: n })}>
        {give && get ? t('trade.bankDo', { n: ratio * n, give: lower(t(`res.${give}`)), m: n, get: lower(t(`res.${get}`)) }) : t('trade.bank')}
      </button>
    </div>
  );
}

/** Oferta recibida (para quien no es el jugador del turno). */
export function IncomingTrade({ view, me, send }: { view: GameState; me: number | null; send: (a: Action) => void }) {
  const t = useT();
  const [countering, setCountering] = useState(false);
  const tr = view.trade;
  const [give, setGive] = useState<Partial<Hand>>({});
  const [want, setWant] = useState<Partial<Hand>>({});
  if (!tr || me === null || tr.from === me || !tr.to.includes(me) || view.steps.length) return null;
  const from = view.players[tr.from];
  const hand = view.players[me].hand;
  const mine = tr.replies[me];
  const can = C.hasCards(hand, tr.want);
  const cards = cardsFor(view);
  if (countering) {
    const valid = handTotal(give) > 0 && handTotal(want) > 0 && !cards.some((c) => (give[c] ?? 0) > 0 && (want[c] ?? 0) > 0);
    return (
      <Modal title={t('trade.counter')} onClose={() => setCountering(false)} wide
        actions={<button type="button" className="btn primary" disabled={!valid} onClick={() => { send({ t: 'counter', id: tr.id, give: clean(give), want: clean(want) }); setCountering(false); }}>{t('trade.sendCounter')}</button>}>
        <div className="two-col">
          <section><h3>{t('trade.give')}</h3><CardPicker cards={cards} limit={hand} value={give} onChange={setGive} /></section>
          <section><h3>{t('trade.want')}</h3><CardPicker cards={cards} limit={Object.fromEntries(cards.map((c) => [c, 9]))} value={want} onChange={setWant} /></section>
        </div>
      </Modal>
    );
  }
  return (
    <div className="incoming" role="region" aria-label={t('trade.offerFrom', { name: from.name })}>
      <p className="incoming-title"><PlayerMark color={from.color} size={16} /> {t('trade.offerFrom', { name: from.name })}</p>
      <p className="offer-line"><strong>{t('trade.youGive')}</strong> <HandLine hand={tr.want} /></p>
      <p className="offer-line"><strong>{t('trade.youGet')}</strong> <HandLine hand={tr.give} /></p>
      {mine && <p className="muted">{t(`trade.${mine.status === 'accept' ? 'accepted' : mine.status === 'decline' ? 'declined' : 'countered'}`)}</p>}
      <div className="row">
        <button type="button" className="btn primary sm" disabled={!can} onClick={() => send({ t: 'reply', id: tr.id, status: 'accept' })}>{t('trade.accept')}</button>
        <button type="button" className="btn secondary sm" onClick={() => send({ t: 'reply', id: tr.id, status: 'decline' })}>{t('trade.decline')}</button>
        <button type="button" className="btn ghost sm" onClick={() => { setGive(clean(Object.fromEntries(Object.entries(tr.want).map(([c, n]) => [c, Math.min(n ?? 0, hand[c as Card])])))); setWant({ ...tr.give }); setCountering(true); }}>{t('trade.counter')}</button>
      </div>
    </div>
  );
}

export const _unused = COMMODITIES;

import { useState } from 'react';
import { useT } from '../../app/i18n';
import { CARDS, COMMODITIES, RESOURCES, TRACKS, handTotal, type Action, type Card, type GameState, type Hand, type Resource, type Step } from '../../engine/types';
import { CardIcon, PlayerMark } from '../art';
import { CardPicker, Modal } from '../common';
import { lower } from '../format';

/** Diálogos para pasos pendientes que no se resuelven tocando el tablero. */
export function StepDialog({ view, me, st, send }: { view: GameState; me: number; st: Step; send: (a: Action) => void }) {
  const t = useT();
  const hand = view.players[me].hand;
  const [sel, setSel] = useState<Partial<Hand>>({});
  const [offers, setOffers] = useState<Record<number, Resource | ''>>({});
  const [gift, setGift] = useState<number | null>(null);
  const name = (s: number) => view.players[s]?.name ?? '?';
  const cardsInHand = (view.settings.guilds ? CARDS : RESOURCES).filter((c) => hand[c] > 0);

  switch (st.k) {
    case 'discard': {
      const n = st.waiting[me];
      return (
        <Modal title={t(st.reason === 'saboteur' ? 'step.discardSab' : 'step.discard', { n })}
          actions={<button type="button" className="btn primary" disabled={handTotal(sel) !== n} onClick={() => send({ t: 'discard', cards: sel })}>{t('common.confirm')}</button>}>
          <CardPicker cards={cardsInHand} limit={hand} value={sel} onChange={setSel} total={n} />
        </Modal>
      );
    }
    case 'steal':
      return (
        <Modal title={t('step.steal')}>
          <div className="choice-list">
            {st.from.map((s) => (
              <button key={s} type="button" className="btn secondary" onClick={() => send({ t: 'steal', from: s })}>
                <PlayerMark color={view.players[s].color} size={16} /> {name(s)} <span className="muted">· {t('player.cards', { n: view.players[s].handCount ?? 0 })}</span>
              </button>
            ))}
          </div>
        </Modal>
      );
    case 'pick': {
      const avail = RESOURCES.reduce((a, r) => a + view.bank[r], 0);
      const n = Math.min(st.waiting[me], avail);
      return (
        <Modal title={t(`step.pick.${st.reason}`, { n })}
          actions={<button type="button" className="btn primary" disabled={handTotal(sel) !== n} onClick={() => send({ t: 'pick', cards: sel })}>{t('common.confirm')}</button>}>
          <CardPicker cards={RESOURCES} limit={view.bank} value={sel} onChange={setSel} total={n} />
        </Modal>
      );
    }
    case 'monopoly':
      return (
        <Modal title={t('step.monopoly')}>
          <ResourceButtons cards={RESOURCES} onPick={(c) => send({ t: 'monopoly', card: c })} />
        </Modal>
      );
    case 'defenderPick':
      return (
        <Modal title={t('step.defenderPick')}>
          <div className="choice-list">
            {TRACKS.map((tr) => (
              <button key={tr} type="button" className={`btn secondary tr-${tr}`} disabled={!view.decks[tr]} onClick={() => send({ t: 'defenderPick', track: tr })}>
                {t(`track.${tr}`)} <span className="muted">· {t('cards.deck', { n: view.decks[tr] })}</span>
              </button>
            ))}
          </div>
        </Modal>
      );
    case 'progressLimit':
      return (
        <Modal title={t('step.progressLimit', { n: st.waiting[me] })}>
          <div className="choice-list">
            {view.players[me].progress.map((c, i) => (
              <button key={`${c}-${i}`} type="button" className="btn secondary" onClick={() => send({ t: 'progressDiscard', card: c })}>{t(`progress.${c}`)}</button>
            ))}
          </div>
        </Modal>
      );
    case 'spy':
      return (
        <Modal title={t('step.spy', { name: name(st.target) })}>
          <div className="choice-list">
            {st.cards.map((c, i) => (
              <button key={`${c}-${i}`} type="button" className="btn secondary" onClick={() => send({ t: 'spyTake', card: c })}>{t(`progress.${c}`)}</button>
            ))}
            <button type="button" className="btn ghost" onClick={() => send({ t: 'spyTake', card: null })}>{t('step.keep')}</button>
          </div>
        </Modal>
      );
    case 'masterMerchant': {
      const n = Math.min(2, handTotal(st.hand));
      return (
        <Modal title={t('step.master', { name: name(st.target), n })}
          actions={<button type="button" className="btn primary" disabled={handTotal(sel) !== n} onClick={() => send({ t: 'masterTake', cards: sel })}>{t('common.confirm')}</button>}>
          <CardPicker cards={CARDS.filter((c) => st.hand[c] > 0)} limit={st.hand} value={sel} onChange={setSel} total={n} />
        </Modal>
      );
    }
    case 'give': {
      const n = st.waiting[me];
      return (
        <Modal title={t('step.give', { n, name: name(st.to) })}
          actions={<button type="button" className="btn primary" disabled={handTotal(sel) !== n} onClick={() => send({ t: 'give', cards: sel })}>{t('common.confirm')}</button>}>
          <CardPicker cards={cardsInHand} limit={hand} value={sel} onChange={setSel} total={n} />
        </Modal>
      );
    }
    case 'gift': {
      const n = st.waiting[me];
      const to = st.to[me] ?? [];
      const only = st.reason === 'force' ? CARDS : RESOURCES;
      const target = to.length === 1 ? to[0] : gift;
      const title = st.reason === 'force' ? t('step.gift.force', { n, name: name(to[0]) }) : st.reason === 'aid' ? t('step.gift.aid') : t('step.gift.neighbors', { name: name(to[0]) });
      return (
        <Modal title={title}
          actions={<button type="button" className="btn primary" disabled={handTotal(sel) !== n || target === null} onClick={() => send({ t: 'gift', to: target!, cards: sel })}>{t('common.confirm')}</button>}>
          {to.length > 1 && (
            <div className="choice-list" role="radiogroup" aria-label={t('step.gift.to')}>
              {to.map((x) => (
                <button key={x} type="button" role="radio" aria-checked={gift === x} className={`btn ${gift === x ? 'primary' : 'secondary'}`} onClick={() => setGift(x)}>
                  <PlayerMark color={view.players[x].color} size={16} /> {name(x)}
                </button>
              ))}
            </div>
          )}
          <CardPicker cards={only.filter((c) => hand[c] > 0)} limit={hand} value={sel} onChange={setSel} total={n} />
        </Modal>
      );
    }
    case 'camelBid': {
      const limit = { wool: hand.wool, grain: hand.grain };
      return (
        <Modal title={t('step.camelBid')}
          actions={
            <>
              <button type="button" className="btn ghost" onClick={() => send({ t: 'camelBid', bid: {} })}>{t('step.camelPass')}</button>
              <button type="button" className="btn primary" disabled={handTotal(sel) === 0} onClick={() => send({ t: 'camelBid', bid: sel })}>{t('step.camelDo', { n: handTotal(sel) })}</button>
            </>
          }>
          <p className="muted small">{t('step.camelHint')}</p>
          <CardPicker cards={['wool', 'grain']} limit={limit} value={sel} onChange={setSel} />
        </Modal>
      );
    }
    case 'harborOffer': {
      const used: Partial<Hand> = {};
      for (const r of Object.values(offers)) if (r) used[r] = (used[r] ?? 0) + 1;
      const ok = RESOURCES.every((r) => (used[r] ?? 0) <= hand[r]);
      return (
        <Modal title={t('progress.commercialHarbor')}
          actions={<button type="button" className="btn primary" disabled={!ok} onClick={() => send({ t: 'harborOffer', offers: Object.fromEntries(Object.entries(offers).filter(([, r]) => r)) as Record<number, Resource> })}>{t('common.confirm')}</button>}>
          <p>{t('step.harborOffer')}</p>
          {st.targets.map((s) => (
            <label key={s} className="offer-select">
              <PlayerMark color={view.players[s].color} size={16} /> {name(s)}
              <select value={offers[s] ?? ''} onChange={(e) => setOffers({ ...offers, [s]: e.target.value as Resource | '' })}>
                <option value="">—</option>
                {RESOURCES.filter((r) => hand[r] > 0).map((r) => <option key={r} value={r}>{t(`res.${r}`)}</option>)}
              </select>
            </label>
          ))}
        </Modal>
      );
    }
    case 'harborReply':
      return (
        <Modal title={t('step.harborReply', { name: name(st.seat), res: lower(t(`res.${st.offers[me]}`)) })}>
          <ResourceButtons cards={COMMODITIES.filter((c) => hand[c] > 0)} onPick={(c) => send({ t: 'harborReply', card: c as 'paper' })} />
        </Modal>
      );
    default:
      return null;
  }
}

function ResourceButtons({ cards, onPick }: { cards: readonly Card[]; onPick: (c: Card) => void }) {
  const t = useT();
  return (
    <div className="card-grid">
      {cards.map((c) => (
        <button key={c} type="button" className="card-btn" onClick={() => onPick(c)}>
          <CardIcon card={c} size={30} />
          <span>{t(`res.${c}`)}</span>
        </button>
      ))}
    </div>
  );
}

export const DIALOG_STEPS = ['discard', 'steal', 'pick', 'monopoly', 'defenderPick', 'progressLimit', 'spy', 'masterMerchant', 'give', 'harborOffer', 'harborReply', 'gift', 'camelBid'];

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../app/i18n';
import { chime } from '../../app/sound';
import * as C from '../../engine/core';
import type { Action } from '../../engine/types';
import type { Session, Snapshot } from '../../net/session';
import { DieFace, EventFace } from '../art';
import { Board } from '../Board';
import { Toasts } from '../common';
import { errorText } from '../format';
import { TopBar } from '../TopBar';
import { BuildMenu } from './BuildMenu';
import { CardsSheet } from './Cards';
import { GameOver } from './GameOver';
import { BarbarianMeter, GuildSheet } from './Guild';
import { Hand } from './Hand';
import { LogChat } from './LogChat';
import { plan, stepForMe, type Mode } from './plan';
import { Players } from './Players';
import { DIALOG_STEPS, StepDialog } from './StepDialog';
import { IncomingTrade, TradeSheet } from './Trade';

type Sheet = null | 'build' | 'trade' | 'cards' | 'guild' | 'log' | 'players';

function stepKey(n: number, st: { k: string; reason?: string; waiting?: unknown }, me: number): string {
  const w = st.waiting && !Array.isArray(st.waiting) ? (st.waiting as Record<number, number>)[me] : '';
  return `${n}|${st.k}|${st.reason ?? ''}|${w ?? ''}`;
}

export function Game({ session, snap, onHome }: { session: Session; snap: Snapshot; onHome: () => void }) {
  const t = useT();
  const view = snap.view!;
  const me = snap.mySeat;
  const [mode, setMode] = useState<Mode>(null);
  const [routeKind, setRouteKind] = useState<'road' | 'ship'>('road');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string; tone: 'info' | 'error' | 'turn' }[]>([]);
  const [overClosed, setOverClosed] = useState(false);
  const toastId = useRef(0);
  const send = useCallback((a: Action) => session.act(a), [session]);

  const toast = useCallback((text: string, tone: 'info' | 'error' | 'turn' = 'info') => {
    const id = ++toastId.current;
    setToasts((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);

  const actor = view.winner === null ? C.actorOf(view) : null;
  const myStep = stepForMe(view, me);
  const myTurn = me !== null && actor === me && !view.steps.length;

  // salir de un modo cuando ya no corresponde
  useEffect(() => {
    if (!myTurn) setMode(null);
  }, [myTurn, view.turn.phase]);

  // errores de acciones rechazadas
  useEffect(() => {
    if (snap.actionError) toast(errorText(snap.actionError.code, t), 'error');
  }, [snap.actionError, toast, t]);

  // aviso: te toca
  const attention = me !== null && view.winner === null && (!!myStep || (myTurn && view.turn.phase !== 'main'));
  const attKey = attention ? `${view.turn.n}-${view.turn.phase}-${view.steps[0]?.k ?? ''}` : '';
  useEffect(() => {
    if (!attKey) return;
    chime();
    if (!myStep) toast(t('turn.yours'), 'turn');
  }, [attKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = plan(view, me, mode, routeKind);
  const onPick = (kind: 'vertex' | 'edge' | 'hex', id: string) => {
    const r = p.pick?.(kind, id);
    if (!r) return;
    if (r.act) send(r.act);
    if ('mode' in r) setMode(r.mode ?? null);
  };

  const flash = useMemo(() => (view.turn.dice ? { key: `${view.turn.n}:${view.turn.dice.join('-')}`, number: view.turn.dice[0] + view.turn.dice[1] } : null), [view.turn.n, view.turn.dice]);

  const nameOf = (s: number | null) => (s === null ? '' : view.players[s]?.name ?? '?');
  const translateParams = (ps?: Record<string, string | number>) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(ps ?? {})) out[k] = typeof v === 'string' && /^(track|res|terrain)\./.test(v) ? t(v) : v;
    return out;
  };

  let status: string;
  const waiting = view.steps[0] && view.steps[0].k !== 'produce' ? C.waitingSeats(view.steps[0]) : [];
  if (view.winner !== null) status = t('phase.over');
  else if (p.hint) status = t(p.hint, translateParams(p.hintParams));
  else if (myStep) status = '';
  else if (waiting.length) status = t('step.waiting', { names: waiting.map(nameOf).join(', ') });
  else {
    const ph = view.turn.phase;
    const mine = actor === me;
    const who = nameOf(actor);
    status = {
      setup: mine ? t('phase.setupBuilding') : t('phase.setupWait', { name: who }),
      preRoll: mine ? t('phase.preRoll') : t('phase.preRollWait', { name: who }),
      main: mine ? t('phase.main') : t('phase.mainWait', { name: who }),
      specialBuild: mine ? t('phase.sbp') : t('phase.sbpWait', { name: who }),
      paired: mine ? t('phase.paired') : t('phase.pairedWait', { name: who }),
      over: t('phase.over'),
    }[ph];
  }

  const ph = view.turn.phase;
  const guilds = view.settings.guilds;
  const sea = view.settings.seafarers;
  const buttons: { id: string; label: string; onClick: () => void; primary?: boolean; disabled?: boolean }[] = [];
  if (myTurn && ph === 'preRoll') {
    buttons.push({ id: 'roll', label: t('act.roll'), primary: true, onClick: () => send({ t: 'roll' }) });
  }
  if (myTurn && (ph === 'main' || ph === 'specialBuild' || ph === 'paired')) {
    buttons.push({ id: 'build', label: t('act.build'), onClick: () => setSheet('build') });
    if (ph !== 'specialBuild') buttons.push({ id: 'trade', label: t('act.trade'), onClick: () => setSheet('trade') });
    if (guilds) buttons.push({ id: 'guild', label: t('act.improve'), onClick: () => setSheet('guild') });
    if (guilds && ph !== 'specialBuild') buttons.push({ id: 'knight', label: t('act.useKnight'), onClick: () => setMode({ k: 'knight' }) });
    if (sea && ph !== 'specialBuild') buttons.push({ id: 'ship', label: t('act.moveShip'), disabled: view.turn.shipMoved.includes(me!), onClick: () => setMode({ k: 'ship' }) });
  }
  buttons.push({ id: 'cards', label: t('act.cards'), onClick: () => setSheet('cards') });
  if (guilds && !buttons.some((b) => b.id === 'guild')) buttons.push({ id: 'guild', label: t('act.improve'), onClick: () => setSheet('guild') });
  if (myTurn && (ph === 'main' || ph === 'paired')) buttons.push({ id: 'end', label: t('act.end'), primary: true, onClick: () => send({ t: 'endTurn' }) });
  if (myTurn && ph === 'specialBuild') buttons.push({ id: 'pass', label: t('act.pass'), primary: true, onClick: () => send({ t: 'endTurn' }) });

  const dice = view.turn.dice;
  const showOver = view.winner !== null && !overClosed;

  return (
    <div className="game">
      <TopBar code={snap.code} status={snap.status} error={snap.error} onHome={onHome} />
      <div className="game-main">
        <section className="board-area">
          <Players view={view} me={me} lobby={snap.lobby} compact />
          <div className="status-bar" aria-live="polite">
            {dice && (
              <span className="dice" key={flash?.key}>
                <DieFace value={dice[0]} tone={guilds ? 'red' : 'light'} />
                <DieFace value={dice[1]} tone="light" />
                {view.turn.event && <EventFace face={view.turn.event} />}
              </span>
            )}
            <span className={`status-text${attention ? ' mine' : ''}`}>{status}</span>
            <BarbarianMeter view={view} compact />
            {p.toggle && (
              <span className="segmented sm" role="radiogroup" aria-label={t('piece.road')}>
                <button type="button" role="radio" aria-checked={routeKind === 'road'} className={routeKind === 'road' ? 'on' : ''} onClick={() => setRouteKind('road')}>{t('piece.road')}</button>
                <button type="button" role="radio" aria-checked={routeKind === 'ship'} className={routeKind === 'ship' ? 'on' : ''} onClick={() => setRouteKind('ship')}>{t('piece.ship')}</button>
              </span>
            )}
            {p.chase?.robber && <button type="button" className="btn secondary sm" onClick={() => { send({ t: 'chase', from: p.chase!.from, target: 'robber' }); setMode(null); }}>{t('act.chaseRobber')}</button>}
            {p.chase?.pirate && <button type="button" className="btn secondary sm" onClick={() => { send({ t: 'chase', from: p.chase!.from, target: 'pirate' }); setMode(null); }}>{t('act.chasePirate')}</button>}
            {p.confirm && <button type="button" className="btn primary sm" onClick={() => { send(p.confirm!); setMode(null); }}>{t('pick.done')}</button>}
            {p.skip && <button type="button" className="btn ghost sm" onClick={() => send(p.skip!)}>{t('common.skip')}</button>}
            {p.cancel && <button type="button" className="btn ghost sm" onClick={() => setMode(null)}>{t('act.cancel')}</button>}
          </div>
          <Board view={view} targets={p.targets} onPick={onPick} flash={flash} />
          <IncomingTrade view={view} me={me} send={send} />
        </section>
        <aside className="rail">
          <Players view={view} me={me} lobby={snap.lobby} />
          <LogChat view={view} chat={snap.chat} onChat={(s) => session.chat(s)} canChat={snap.kind !== 'local'} />
        </aside>
      </div>
      <footer className="dock">
        <Hand view={view} me={me} onCards={() => setSheet('cards')} />
        <nav className="actions" aria-label={t('act.build')}>
          {buttons.map((b) => (
            <button key={b.id} type="button" className={`btn ${b.primary ? 'primary' : 'secondary'}`} disabled={b.disabled} onClick={b.onClick}>{b.label}</button>
          ))}
          <button type="button" className="btn ghost mobile-only" onClick={() => setSheet('log')}>{snap.kind === 'local' ? t('act.log') : `${t('act.log')} · ${t('act.chat')}`}</button>
        </nav>
      </footer>

      {sheet === 'build' && me !== null && <BuildMenu view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'trade' && me !== null && <TradeSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'cards' && me !== null && <CardsSheet view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'guild' && me !== null && <GuildSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'log' && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="modal wide" role="dialog" aria-modal="true" aria-label={t('act.log')}>
            <header className="modal-head"><h2>{t('act.log')}</h2><button type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setSheet(null)}>×</button></header>
            <div className="modal-body"><Players view={view} me={me} lobby={snap.lobby} /><LogChat view={view} chat={snap.chat} onChat={(s) => session.chat(s)} canChat={snap.kind !== 'local'} /></div>
          </div>
        </div>
      )}
      {myStep && me !== null && DIALOG_STEPS.includes(myStep.k) && <StepDialog key={stepKey(view.turn.n, myStep, me)} view={view} me={me} st={myStep} send={send} />}
      {showOver && <GameOver view={view} me={me} onHome={onHome} onRematch={session.rematch ? () => session.rematch!() : undefined} onClose={() => setOverClosed(true)} />}
      <Toasts items={toasts} />
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useT } from '../../app/i18n';
import { chime } from '../../app/sound';
import * as C from '../../engine/core';
import type { Action } from '../../engine/types';
import type { Session, Snapshot } from '../../net/session';
import { ChronicleFace, DieFace, EventFace } from '../art';
import { DiceOverlay, FxSprites, TurnBanner, useDiceRoll, useLogEffects, useTurnBanner } from './effects';
import { Board } from '../Board';
import { Toasts } from '../common';
import { errorText, portName } from '../format';
import { TopBar } from '../TopBar';
import { manualFor } from '../../manual/load';
import { BuildMenu } from './BuildMenu';
import { CardsSheet } from './Cards';
import { GameOver } from './GameOver';
import { BarbarianMeter, GuildSheet } from './Guild';
import { BarbarianReport } from './Barbarians';
import { Hand } from './Hand';
import { LogChat } from './LogChat';
import { plan, stepForMe, type Mode } from './plan';
import { Players } from './Players';
import { DIALOG_STEPS, StepDialog } from './StepDialog';
import { DuelSheet } from './Duel';
import { CoinsSheet, FishSheet } from './Shires';
import * as Duel from '../../engine/mods/duel';
import * as Bastions from '../../engine/mods/bastions';
import { AssaultSheet, WorksSheet } from './Works';
import { GoldSheet } from './Gold';
import { WagonSheet } from './Wagon';
import { FleetSheet } from './Fleet';
import * as X from '../../engine/mods/expedition';
import * as Raid from '../../engine/mods/raid';
import { IncomingTrade, TradeSheet } from './Trade';

type Sheet = null | 'build' | 'trade' | 'cards' | 'guild' | 'log' | 'players' | 'duel' | 'fish' | 'coins' | 'works' | 'assault' | 'gold' | 'wagon' | 'fleet';

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

  // animaciones: dados en el centro, aviso de turno y cartas que viajan
  const roll = useDiceRoll(view);
  const banner = useTurnBanner(view);
  useLogEffects(view, me);

  // aviso: te toca
  const attention = me !== null && view.winner === null && (!!myStep || (myTurn && view.turn.phase !== 'main'));
  const attKey = attention ? `${view.turn.n}-${view.turn.phase}-${view.steps[0]?.k ?? ''}` : '';
  useEffect(() => {
    if (!attKey) return;
    chime();
    // al empezar el turno ya aparece el aviso grande sobre el tablero
    if (!myStep && view.turn.phase !== 'preRoll' && view.turn.phase !== 'setup') toast(t('turn.yours'), 'turn');
  }, [attKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = plan(view, me, mode, routeKind);
  const onPick = (kind: 'vertex' | 'edge' | 'hex', id: string) => {
    const r = p.pick?.(kind, id);
    if (!r) return;
    if (r.act) send(r.act);
    if ('mode' in r) setMode(r.mode ?? null);
  };

  const rolls = view.turn.rolls?.length ? view.turn.rolls : view.turn.dice ? [view.turn.dice] : [];
  const rollSig = rolls.map((r) => r.join('-')).join('|');
  const flash = useMemo(() => (rolls.length ? { key: `${view.turn.n}:${rollSig}`, numbers: rolls.map((r) => r[0] + r[1]) } : null), [view.turn.n, rollSig]); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOf = (s: number | null) => (s === null ? '' : view.players[s]?.name ?? '?');
  const translateParams = (ps?: Record<string, string | number>) => {
    const out: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(ps ?? {})) out[k] = k === 'port' ? portName(String(v), t) : typeof v === 'string' && /^(track|res|terrain)\./.test(v) ? t(v) : v;
    return out;
  };

  let status: string;
  const waiting = view.steps[0] && view.steps[0].k !== 'produce' ? C.waitingSeats(view.steps[0]) : [];
  if (view.winner !== null) status = t('phase.over');
  else if (p.hint) status = t(p.hint, translateParams(p.hintParams));
  else if (myStep) status = '';
  else if (view.raid && me !== null && actor === me && view.turn.phase === 'main' && !mode && Raid.stuckAtCastle(view, me).length) status = t('raid.leaveCastle');
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
  const sea = view.settings.openSea;
  const myCards = me === null ? 0 : guilds ? view.players[me].progress.length : view.players[me].dev.length;
  const buttons: { id: string; label: string; onClick: () => void; primary?: boolean; disabled?: boolean; badge?: number; title?: string }[] = [];
  if (myTurn && ph === 'preRoll') {
    buttons.push({ id: 'roll', label: t('act.roll'), primary: true, onClick: () => send({ t: 'roll' }) });
  }
  if (myTurn && (ph === 'main' || ph === 'specialBuild' || ph === 'paired')) {
    buttons.push({ id: 'build', label: t('act.build'), onClick: () => setSheet('build') });
    if (ph !== 'specialBuild') buttons.push({ id: 'trade', label: t('act.trade'), onClick: () => setSheet('trade') });
    if (guilds) buttons.push({ id: 'guild', label: t('act.improve'), onClick: () => setSheet('guild') });
    if (guilds && ph !== 'specialBuild') buttons.push({ id: 'knight', label: t('act.useKnight'), onClick: () => setMode({ k: 'knight' }) });
    if (sea && ph !== 'specialBuild' && !view.bastions) buttons.push({ id: 'ship', label: t('act.moveShip'), disabled: view.turn.shipMoved.includes(me!), onClick: () => setMode({ k: 'ship' }) });
    if (Duel.isDuel(view) && ph === 'main') buttons.push({ id: 'tokens', label: t('act.tokens'), badge: view.players[me!].tokens ?? 0, onClick: () => setSheet('duel') });
    if (view.fish && ph === 'main') buttons.push({ id: 'fish', label: t('act.fish'), badge: (view.players[me!].fish ?? []).reduce((a, b) => a + b, 0), onClick: () => setSheet('fish') });
    if (view.river && ph === 'main') buttons.push({ id: 'coins', label: t('act.coins'), badge: view.river.coins[me!] ?? 0, onClick: () => setSheet('coins') });
    // bastiones: con la ruta en el bastión, el ataque (cierra el turno)
    const fort = view.bastions?.forts.find((f) => f.seat === me);
    if (fort && !fort.taken && ph === 'main' && C.bastionRoute(view, me!).head === fort.v) {
      const ok = Bastions.canAssault(view, me!);
      buttons.push({ id: 'assault', label: t('act.assault'), disabled: !ok, title: ok ? t('act.assaultHint') : t('act.assaultNoPiece'), onClick: () => setSheet('assault') });
    }
  }
  if (view.works) buttons.push({ id: 'works', label: t('act.wonders'), onClick: () => setSheet('works') });
  // invasión: mover caballeros y oro
  const stuck = view.raid && me !== null && myTurn && ph === 'main' ? Raid.stuckAtCastle(view, me) : [];
  if (view.raid && myTurn && ph === 'main') {
    const free = Raid.knightsOf(view, me!).filter((e) => !view.raid!.knights[e].moved).length;
    buttons.push({ id: 'guard', label: t('act.guards'), badge: free, disabled: !free, onClick: () => setMode({ k: 'guard' }) });
  }
  // carretas: la hoja de la carreta (mover, mejorar, trigo, bárbaros)
  if (view.traders && me !== null && view.traders.wagons[me].at) buttons.push({ id: 'wagon', label: t('act.wagon'), badge: myTurn && ph === 'main' ? view.traders.wagons[me].mp : 0, onClick: () => setSheet('wagon') });
  // expediciones: la hoja de los barcos
  if (view.expedition && me !== null) buttons.push({ id: 'fleet', label: t('act.fleet'), badge: X.shipsOf(view, me).length, onClick: () => setSheet('fleet') });
  if (view.gold && myTurn && ph === 'main') buttons.push({ id: 'gold', label: t('act.gold'), badge: view.gold[me!] ?? 0, onClick: () => setSheet('gold') });
  buttons.push({ id: 'cards', label: t('act.cards'), badge: myCards, onClick: () => setSheet('cards') });
  if (guilds && !buttons.some((b) => b.id === 'guild')) buttons.push({ id: 'guild', label: t('act.improve'), onClick: () => setSheet('guild') });
  if (myTurn && (ph === 'main' || ph === 'paired')) buttons.push({ id: 'end', label: t('act.end'), primary: true, disabled: stuck.length > 0, title: stuck.length ? t('raid.leaveCastle') : undefined, onClick: () => send({ t: 'endTurn' }) });
  if (myTurn && ph === 'specialBuild') buttons.push({ id: 'pass', label: t('act.pass'), primary: true, onClick: () => send({ t: 'endTurn' }) });
  // la acción principal siempre al final: en el celular queda abajo a la derecha
  buttons.sort((a, b) => Number(!!a.primary) - Number(!!b.primary));

  // en el celular el registro y el chat van en un botón junto a los jugadores, con aviso de mensajes nuevos
  const canChat = snap.kind !== 'local';
  const lastOther = snap.chat.reduce((at, m) => (m.seat !== me && m.at > at ? m.at : at), 0);
  const [seenChat, setSeenChat] = useState(lastOther);
  useEffect(() => {
    if (sheet === 'log') setSeenChat(lastOther);
  }, [sheet, lastOther]);
  const unread = canChat && lastOther > seenChat;
  const [logTab, setLogTab] = useState<'log' | 'chat'>('log');
  const openLog = () => { setLogTab(unread ? 'chat' : 'log'); setSheet('log'); };
  const logLabel = canChat ? `${t('act.log')} · ${t('act.chat')}` : t('act.log');

  const dice = view.turn.dice;
  const showOver = view.winner !== null && !overClosed;

  return (
    <div className="game">
      <TopBar manual={manualFor({ ...view.settings, seats: view.players.length })} code={snap.code ?? (snap.kind === 'local' ? '' : null)} status={snap.status} error={snap.error} onHome={() => { if (view.winner !== null || window.confirm(t('game.leaveConfirm'))) onHome(); }} />
      <main className="game-main">
        <h1 className="sr">{t('app.name')}</h1>
        <section className="board-area">
          <div className="strip">
            <Players view={view} me={me} lobby={snap.lobby} compact />
            <button type="button" className={`icon-btn strip-log${unread ? ' unread' : ''}`} data-act="log" onClick={openLog} aria-label={unread ? `${logLabel} (${t('act.newMessages')})` : logLabel} title={logLabel}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="log-icon">
                <path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 5 4.5z" />
                <path d="M8 9h8M8 12.5h5" />
              </svg>
            </button>
          </div>
          <div className="status-bar" aria-live="polite">
            {dice && (!roll || roll.settled) && (
              <span className="dice" key={flash?.key}>
                {view.settings.chronicle
                  ? (view.turn.cards?.length ? view.turn.cards : view.turn.card ? [view.turn.card] : []).map((c, i) => <ChronicleFace key={i} card={c} />)
                  : rolls.map((r, i) => (
                    <span key={i} className="dice-pair">
                      <DieFace value={r[0]} tone={guilds ? 'red' : 'light'} />
                      <DieFace value={r[1]} tone="light" />
                    </span>
                  ))}
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
            {p.far && (
              <span className="segmented sm" role="radiogroup" aria-label={t('act.guards')}>
                <button type="button" role="radio" aria-checked={!p.far.on} className={!p.far.on ? 'on' : ''} onClick={() => setMode(p.far!.set(false))}>{t('raid.near')}</button>
                <button type="button" role="radio" aria-checked={p.far.on} className={p.far.on ? 'on' : ''} disabled={!p.far.can} onClick={() => setMode(p.far!.set(true))}>{t('raid.far')}</button>
              </span>
            )}
            {p.chase?.robber && <button type="button" className="btn secondary sm" onClick={() => { send({ t: 'chase', from: p.chase!.from, target: 'robber' }); setMode(null); }}>{t('act.chaseRobber')}</button>}
            {p.chase?.pirate && <button type="button" className="btn secondary sm" onClick={() => { send({ t: 'chase', from: p.chase!.from, target: 'pirate' }); setMode(null); }}>{t('act.chasePirate')}</button>}
            {p.confirm && <button type="button" className="btn primary sm" onClick={() => { send(p.confirm!); setMode(null); }}>{t('pick.done')}</button>}
            {p.skip && <button type="button" className="btn ghost sm" onClick={() => send(p.skip!)}>{t('common.skip')}</button>}
            {p.cancel && <button type="button" className="btn ghost sm" onClick={() => setMode(null)}>{t('act.cancel')}</button>}
          </div>
          <Board view={view} targets={p.targets} onPick={onPick} flash={flash}>
            {roll && <DiceOverlay roll={roll} red={guilds} event={view.turn.event ?? null} />}
            {banner && !roll && <TurnBanner view={view} me={me} banner={banner} />}
          </Board>
          <IncomingTrade view={view} me={me} send={send} />
        </section>
        <aside className="rail">
          <Players view={view} me={me} lobby={snap.lobby} />
          <LogChat view={view} chat={snap.chat} onChat={(s) => session.chat(s)} canChat={snap.kind !== 'local'} />
        </aside>
      </main>
      <footer className="dock">
        <Hand view={view} me={me} onCards={() => setSheet('cards')} onGold={() => setSheet('gold')} />
        <nav className="actions" aria-label={t('act.build')}>
          {buttons.map((b) => (
            <button key={b.id} type="button" data-act={b.id} className={`btn ${b.primary ? 'primary' : 'secondary'}`} disabled={b.disabled} title={b.title} onClick={b.onClick}>
              {b.label}
              {b.badge ? <span className="btn-badge mobile-only">{b.badge}</span> : null}
            </button>
          ))}
        </nav>
      </footer>

      {sheet === 'build' && me !== null && <BuildMenu view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'trade' && me !== null && <TradeSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'cards' && me !== null && <CardsSheet view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'guild' && me !== null && <GuildSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'duel' && me !== null && <DuelSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'fish' && me !== null && <FishSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'coins' && me !== null && <CoinsSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'works' && <WorksSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'assault' && me !== null && <AssaultSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'gold' && me !== null && <GoldSheet view={view} me={me} send={send} onClose={() => setSheet(null)} />}
      {sheet === 'wagon' && me !== null && view.traders && <WagonSheet view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'fleet' && me !== null && view.expedition && <FleetSheet view={view} me={me} send={send} setMode={setMode} onClose={() => setSheet(null)} />}
      {sheet === 'log' && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="modal wide" role="dialog" aria-modal="true" aria-label={t('act.log')}>
            <div className="modal-head"><h2>{t('act.log')}</h2><button type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setSheet(null)}>×</button></div>
            <div className="modal-body"><Players view={view} me={me} lobby={snap.lobby} /><LogChat view={view} chat={snap.chat} onChat={(s) => session.chat(s)} canChat={canChat} initialTab={logTab} /></div>
          </div>
        </div>
      )}
      {myStep && me !== null && DIALOG_STEPS.includes(myStep.k) && <StepDialog key={stepKey(view.turn.n, myStep, me)} view={view} me={me} st={myStep} send={send} />}
      {showOver && <GameOver view={view} me={me} onHome={onHome} onRematch={session.rematch ? () => session.rematch!() : undefined} onClose={() => setOverClosed(true)} />}
      <BarbarianReport view={view} hidden={!!myStep && DIALOG_STEPS.includes(myStep.k)} />
      <Toasts items={toasts} />
      <FxSprites />
    </div>
  );
}

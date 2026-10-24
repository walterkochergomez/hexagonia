// Animaciones de la partida: tirada de dados, aviso de turno y cartas que viajan según lo que pasa en el registro.
import { useEffect, useRef, useState } from 'react';
import { useT } from '../../app/i18n';
import { diceSound } from '../../app/sound';
import { graphOf, type Graph } from '../../engine/geometry';
import { CARDS, TERRAIN_COMMODITY, TERRAIN_RESOURCE, type Card, type ChronicleCard, type GameState, type LogEntry } from '../../engine/types';
import { CardBack, CardIcon, ChronicleFace, DieFace, EventFace, PlayerMark } from '../art';
import { confetti, firstVisible, fly, reducedMotion, visible, type Flight, type Spot } from '../fx';

const PLAYER_HEX = ['#cf3f2c', '#2b5faa', '#e2a72e', '#7a4fb0', '#d85c95', '#3b4148'];

/** Modelos ocultos de las cartas: los efectos copian su dibujo. */
export function FxSprites() {
  return (
    <div className="fx-sprites" aria-hidden="true">
      {CARDS.map((c) => <span key={c} data-sprite={c}><CardIcon card={c} size={30} /></span>)}
      <span data-sprite="dev"><CardBack size={30} kind="dev" /></span>
      <span data-sprite="back"><CardBack size={30} kind="res" /></span>
    </div>
  );
}

const rnd = () => 1 + Math.floor(Math.random() * 6);

export interface RollState {
  key: string;
  /** tiradas que se muestran (en el duelo pueden ser dos) */
  faces: [number, number][];
  settled: boolean;
  /** con mazo de sucesos: las cartas en vez de dados */
  cards: ChronicleCard[] | null;
}

/** Dados (o cartas de sucesos) que aparecen en el centro del tablero cada vez que alguien tira. */
export function useDiceRoll(view: GameState): RollState | null {
  const t = view.turn;
  const rolls = t.rolls?.length ? t.rolls : t.dice ? [t.dice] : [];
  const allCards = view.settings.chronicle ? (t.cards?.length ? t.cards : t.card ? [t.card] : []) : null;
  const key = rolls.length ? `${t.n}:${rolls.map((r) => r.join('-')).join('|')}:${t.event ?? ''}` : null;
  const [roll, setRoll] = useState<RollState | null>(null);
  const prev = useRef<{ key: string | null; n: number; count: number }>({ key, n: t.n, count: rolls.length });
  useEffect(() => {
    const before = prev.current;
    prev.current = { key, n: t.n, count: rolls.length };
    if (key === before.key) return;
    if (!key || !rolls.length || reducedMotion()) {
      setRoll(null);
      return;
    }
    // si ya se vio la primera tirada del turno (por ejemplo, un 7), sólo se anima la nueva
    const from = before.n === t.n && before.count > 0 && before.count < rolls.length ? before.count : 0;
    const shown = rolls.slice(from);
    const cards = allCards ? allCards.slice(from) : null;
    diceSound();
    setRoll({ key, faces: shown.map(() => [rnd(), rnd()]), settled: false, cards });
    const spin = cards ? 0 : setInterval(() => setRoll((r) => (r && r.key === key && !r.settled ? { ...r, faces: r.faces.map(() => [rnd(), rnd()]) } : r)), 80);
    const land = setTimeout(() => {
      clearInterval(spin);
      setRoll((r) => (r && r.key === key ? { key, faces: shown, settled: true, cards } : r));
    }, 600);
    const done = setTimeout(() => setRoll((r) => (r && r.key === key ? null : r)), shown.length > 1 ? 2400 : 1850);
    return () => {
      clearInterval(spin);
      clearTimeout(land);
      clearTimeout(done);
      setRoll((r) => (r && r.key === key ? null : r));
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return roll;
}

export function DiceOverlay({ roll, red, event }: { roll: RollState; red: boolean; event: string | null }) {
  const t = useT();
  if (roll.cards) {
    return (
      <div className={`dice-roll cards${roll.settled ? ' settled' : ''}${roll.cards.length > 1 ? ' many' : ''}`} aria-hidden="true">
        <div className="dice-roll-dice">
          {roll.cards.map((c, i) => (
            <span key={i} className="roll-card" style={{ animationDelay: `${i * 140}ms` }}>
              <ChronicleFace card={c} size={roll.cards!.length > 1 ? 104 : 128} />
              {roll.settled && c.ev && c.ev !== 'raid' && <span className="roll-ev">{t(`chronicle.ev.${c.ev}`)}</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }
  const many = roll.faces.length > 1;
  return (
    <div className={`dice-roll${roll.settled ? ' settled' : ''}${many ? ' many' : ''}`} aria-hidden="true">
      {roll.faces.map((f, i) => {
        const sum = f[0] + f[1];
        return (
          <div key={i} className="roll-pair">
            <div className="dice-roll-dice">
              <span className="roll-die d1"><DieFace value={f[0]} tone={red ? 'red' : 'light'} size={many ? 52 : 66} /></span>
              <span className="roll-die d2"><DieFace value={f[1]} tone="light" size={many ? 52 : 66} /></span>
              {event && roll.settled && <span className="roll-die d3"><EventFace face={event} size={66} /></span>}
            </div>
            {roll.settled && <div className={`roll-sum${sum === 7 ? ' seven' : ''}`}>{sum}</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Aviso grande de cambio de turno (o de colocación inicial). */
export function useTurnBanner(view: GameState): { key: string; seat: number } | null {
  const t = view.turn;
  const seat = t.phase === 'setup' ? t.setupOrder[t.setupIndex] : t.current;
  const key = view.winner === null && seat !== undefined ? `${t.n}:${seat}:${t.phase === 'setup' ? t.setupIndex : 'turn'}` : null;
  const [banner, setBanner] = useState<{ key: string; seat: number } | null>(null);
  const prev = useRef(key);
  useEffect(() => {
    const before = prev.current;
    prev.current = key;
    if (!key || key === before || seat === undefined) return;
    setBanner({ key, seat });
    const id = setTimeout(() => setBanner((b) => (b && b.key === key ? null : b)), reducedMotion() ? 1200 : 1700);
    return () => clearTimeout(id);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return banner;
}

export function TurnBanner({ view, me, banner }: { view: GameState; me: number | null; banner: { key: string; seat: number } }) {
  const t = useT();
  const p = view.players[banner.seat];
  if (!p) return null;
  const mine = banner.seat === me;
  return (
    <div className={`turn-banner${mine ? ' mine' : ''}`} key={banner.key} aria-hidden="true">
      <PlayerMark color={p.color} size={22} />
      <span>{mine ? t('turn.yours') : t('banner.turn', { name: p.name })}</span>
    </div>
  );
}

// ---------- cartas que viajan ----------

function parseCards(s: unknown): { card: Card; n: number }[] {
  if (typeof s !== 'string' || !s) return [];
  return s.split(',').map((x) => x.split(':')).map(([n, c]) => ({ card: c as Card, n: Number(n) })).filter((x) => x.n > 0 && (CARDS as readonly string[]).includes(x.card));
}

function terrainsFor(card: Card | 'gold'): string[] {
  if (card === 'gold') return ['gold'];
  const out: string[] = [];
  for (const [tr, c] of Object.entries(TERRAIN_RESOURCE)) if (c === card) out.push(tr);
  for (const [tr, c] of Object.entries(TERRAIN_COMMODITY)) if (c === card) out.push(tr);
  return out;
}

const boardWrap = () => firstVisible(['.board-wrap']);
function boardCenter(): Spot {
  const b = boardWrap();
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
function deckSpot(): Spot {
  const b = boardWrap();
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { x: r.right - 48, y: r.top + 48 };
}

/** Dónde aparece un jugador en pantalla: tu mano (la carta exacta si se sabe) o su ficha en la lista. */
function seatSpot(seat: number, me: number | null, card?: string): Element | null {
  if (seat === me) {
    if (card && card !== 'back' && card !== 'dev') {
      const el = document.querySelector(`.hand-card[data-card="${card}"]`);
      if (visible(el)) return el;
    }
    if (card === 'dev') return firstVisible(['[data-act="cards"]', '.hand-extra', '.hand-cards']);
    return firstVisible(['.hand-cards', '[data-act="cards"]']);
  }
  return firstVisible([`.strip [data-seat="${seat}"]`, `.rail [data-seat="${seat}"]`]);
}

const hexEl = (id: string | undefined) => (id ? document.querySelector(`[data-hex="${id}"]`) : null);

/** Casillas de donde sale lo que cobró un jugador. */
function sourcesOf(view: GameState, g: Graph, seat: number, card: Card | 'gold', number: number | null, newVerts: string[]): string[] {
  const kinds = terrainsFor(card);
  const near = (id: string, verts: string[]) => g.hexes[id].vertices.some((v) => verts.includes(v));
  const mine = Object.entries(view.buildings).filter(([, b]) => b.owner === seat).map(([v]) => v);
  const hexes = Object.values(view.board.hexes).filter((h) => kinds.includes(h.terrain) && h.id !== view.board.robber);
  if (number !== null) return hexes.filter((h) => h.number === number && near(h.id, mine)).map((h) => h.id);
  const fresh = newVerts.filter((v) => view.buildings[v]?.owner === seat);
  return hexes.filter((h) => near(h.id, fresh.length ? fresh : mine)).map((h) => h.id);
}

function flightsFor(entries: LogEntry[], view: GameState, me: number | null, newVerts: string[]): Flight[] {
  const g = graphOf(view.board.hexes);
  const rolled = entries.some((e) => e.k === 'roll');
  const number = rolled && view.turn.dice ? view.turn.dice[0] + view.turn.dice[1] : null;
  const out: Flight[] = [];
  let i = 0;
  const base = rolled ? 780 : 60;
  const next = (extra = 0) => base + extra + (i++) * 85;
  for (const e of entries) {
    const p = e.p ?? {};
    const seat = typeof p.seat === 'number' ? p.seat : -1;
    switch (e.k) {
      case 'produce':
        for (const { card, n } of parseCards(p.cards)) {
          const src = sourcesOf(view, g, seat, card, number, newVerts);
          for (let k = 0; k < Math.min(n, 3); k++) out.push({ from: hexEl(src[k % Math.max(1, src.length)]) ?? boardCenter(), to: seatSpot(seat, me, card), card, delay: next() });
        }
        break;
      case 'pick':
        for (const { card, n } of parseCards(p.cards)) {
          const src = p.reason === 'gold' ? sourcesOf(view, g, seat, 'gold', null, []) : [];
          for (let k = 0; k < Math.min(n, 3); k++) out.push({ from: hexEl(src[k % Math.max(1, src.length)]) ?? boardCenter(), to: seatSpot(seat, me, card), card, delay: next() });
        }
        break;
      case 'steal.card':
      case 'steal':
      case 'progress.spy.card':
      case 'progress.spy': {
        const victim = Number(p.victim);
        const card = typeof p.card === 'string' ? p.card : 'back';
        out.push({ from: seatSpot(victim, me, card), to: seatSpot(seat, me, card), card, delay: next(120) });
        break;
      }
      case 'progress.master.cards':
      case 'progress.master': {
        const victim = Number(p.victim);
        const cards = parseCards(p.cards);
        const list = cards.length ? cards : [{ card: 'back' as const, n: Number(p.n) || 1 }];
        for (const { card, n } of list) for (let k = 0; k < Math.min(n, 3); k++) out.push({ from: seatSpot(victim, me, card), to: seatSpot(seat, me, card), card, delay: next(120) });
        break;
      }
      case 'trade.done': {
        const other = Number(p.with);
        for (const { card, n } of parseCards(p.give)) for (let k = 0; k < Math.min(n, 3); k++) out.push({ from: seatSpot(seat, me, card), to: seatSpot(other, me, card), card, delay: next() });
        for (const { card, n } of parseCards(p.get)) for (let k = 0; k < Math.min(n, 3); k++) out.push({ from: seatSpot(other, me, card), to: seatSpot(seat, me, card), card, delay: next() });
        break;
      }
      case 'bank': {
        const give = String(p.give);
        const get = String(p.get);
        for (let k = 0; k < Math.min(Number(p.n) || 0, 4); k++) out.push({ from: seatSpot(seat, me, give), to: boardCenter(), card: give, vanish: true, delay: next() });
        for (let k = 0; k < Math.min(Number(p.m) || 0, 3); k++) out.push({ from: boardCenter(), to: seatSpot(seat, me, get), card: get, delay: next(380) });
        break;
      }
      case 'monopoly': {
        const card = String(p.card);
        view.players.forEach((_, s) => { if (s !== seat) out.push({ from: seatSpot(s, me, card), to: seatSpot(seat, me, card), card, delay: next() }); });
        break;
      }
      case 'progress.gain':
        for (let k = 0; k < Math.min(Number(p.n) || 0, 3); k++) out.push({ from: boardCenter(), to: seatSpot(seat, me, String(p.card)), card: String(p.card), delay: next() });
        break;
      case 'discard':
        for (let k = 0; k < Math.min(Number(p.n) || 0, 4); k++) out.push({ from: seatSpot(seat, me), to: boardCenter(), card: 'back', vanish: true, delay: next() });
        break;
      case 'dev.buy.card':
      case 'dev.buy':
      case 'progress.draw.card':
      case 'progress.draw':
      case 'tribe.dev.card':
      case 'tribe.dev':
        out.push({ from: deckSpot(), to: seatSpot(seat, me, 'dev'), card: 'dev', delay: next() });
        break;
      case 'fleet.lost':
        for (let k = 0; k < Math.min(Number(p.n) || 0, 4); k++) out.push({ from: seatSpot(seat, me), to: boardCenter(), card: 'back', vanish: true, delay: next() });
        break;
    }
  }
  return out;
}

/** Mira qué entró al registro desde la última vez y lo anima; al ganar, confeti. */
export function useLogEffects(view: GameState, me: number | null) {
  const prev = useRef<{ tail: string; buildings: GameState['buildings']; winner: number | null } | null>(null);
  useEffect(() => {
    const log = view.log;
    const tail = log.length ? JSON.stringify(log[log.length - 1]) : '';
    const before = prev.current;
    prev.current = { tail, buildings: view.buildings, winner: view.winner };
    if (!before || reducedMotion()) return;
    if (before.winner === null && view.winner !== null) {
      confetti([...view.players.map((p) => PLAYER_HEX[p.color % PLAYER_HEX.length]), '#f2c230', '#ffffff']);
    }
    if (before.tail === tail) return;
    let start = -1;
    for (let i = log.length - 1; i >= 0 && log.length - i <= 80; i--) {
      if (JSON.stringify(log[i]) === before.tail) {
        start = i + 1;
        break;
      }
    }
    if (start < 0) return; // no se sabe qué es nuevo (por ejemplo, al reconectar): mejor no animar
    const fresh = log.slice(start);
    const newVerts = Object.keys(view.buildings).filter((v) => !before.buildings[v]);
    const flights = flightsFor(fresh, view, me, newVerts);
    if (flights.length) fly(flights);
  }, [view, me]);
}

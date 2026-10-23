import { applyAction, createGame } from '../engine/game';
import { whoActs } from '../engine/bot';
import { Rng, randomSeed, seedRng } from '../engine/rng';
import { viewFor } from '../engine/view';
import { GameError, type Action, type GameState, type Settings } from '../engine/types';
import { pickBotMove } from './bots';
import { BaseSession, type Session } from './session';

export const LOCAL_KEY = 'hexagonia.local';

export interface LocalSeat { name: string; color: number; bot: boolean }
export interface SavedLocal { seats: LocalSeat[]; game: GameState }

export function loadSavedLocal(): SavedLocal | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as SavedLocal) : null;
  } catch {
    return null;
  }
}

export function forgetSavedLocal() {
  try {
    localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* nada */
  }
}

export class LocalSession extends BaseSession implements Session {
  private game: GameState;
  private seats: LocalSeat[];
  private shown: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private rng = new Rng(seedRng(randomSeed()));
  private tradeSeen: { id: number; at: number } | null = null;
  private turnActions = { n: -1, count: 0 };
  private closed = false;

  constructor(init: { seats: LocalSeat[]; settings: Omit<Settings, 'seed' | 'seats'> } | SavedLocal) {
    super('local', null);
    if ('game' in init) {
      this.seats = init.seats;
      this.game = init.game;
    } else {
      this.seats = init.seats;
      this.game = createGame({ ...init.settings, seats: init.seats.length, seed: randomSeed() }, init.seats.map((s) => ({ name: s.name, color: s.color })));
    }
    this.set({ status: 'open', bots: this.botSeats() });
    this.refresh();
  }

  private botSeats(): number[] {
    return this.seats.map((s, i) => (s.bot ? i : -1)).filter((i) => i >= 0);
  }

  private humans(): number[] {
    return this.seats.map((s, i) => (s.bot ? -1 : i)).filter((i) => i >= 0);
  }

  private refresh() {
    const g = this.game;
    const humans = this.humans();
    let seat = whoActs(g);
    if (seat !== null && this.seats[seat]?.bot) {
      // mientras juega un bot, mostrar la vista de la última persona
      seat = this.shown ?? humans[0] ?? 0;
      this.scheduleBots();
    } else if (seat === null) {
      seat = this.shown ?? humans[0] ?? 0;
    }
    if (humans.length > 1 && seat !== this.shown && g.winner === null) {
      this.set({ pass: seat, view: null, mySeat: null });
    } else {
      this.shown = seat;
      this.set({ pass: null, view: viewFor(g, seat), mySeat: seat });
    }
    if (g.winner !== null) this.set({ pass: null, view: viewFor(g, this.shown ?? seat), mySeat: this.shown ?? seat });
    this.scheduleBots();
  }

  private save() {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ seats: this.seats, game: this.game } satisfies SavedLocal));
    } catch {
      /* nada */
    }
  }

  private commit(g: GameState) {
    if (g.turn.n !== this.turnActions.n) this.turnActions = { n: g.turn.n, count: 0 };
    this.turnActions.count++;
    this.game = g;
    this.save();
    this.refresh();
  }

  private scheduleBots() {
    if (this.timer || this.closed || this.game.winner !== null) return;
    const bots = new Set(this.botSeats());
    if (!bots.size) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const g = this.game;
      if (g.trade && this.tradeSeen?.id !== g.trade.id) this.tradeSeen = { id: g.trade.id, at: Date.now() };
      const age = g.trade && this.tradeSeen ? Date.now() - this.tradeSeen.at : 0;
      const move = pickBotMove(g, bots, this.rng, age, this.turnActions.count);
      if (!move) {
        if (g.trade && bots.has(g.trade.from)) this.scheduleBots();
        return;
      }
      try {
        this.commit(applyAction(g, move.seat, move.a));
      } catch {
        try {
          this.commit(applyAction(g, move.seat, { t: 'endTurn' }));
        } catch {
          /* se reintenta en la próxima actualización */
        }
      }
    }, 600);
  }

  nameOf(seat: number): string {
    return this.seats[seat]?.name ?? '';
  }

  confirmPass() {
    if (this.snap.pass === null) return;
    this.shown = this.snap.pass;
    this.set({ pass: null });
    this.refresh();
  }

  act(a: Action) {
    const seat = this.snap.mySeat;
    if (seat === null) return;
    try {
      this.commit(applyAction(this.game, seat, a));
    } catch (e) {
      this.set({ actionError: { code: e instanceof GameError ? e.code : 'default', at: Date.now() } });
    }
  }

  chat() {
    /* sin chat en partidas locales */
  }

  leave() {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.set({ status: 'closed' });
  }
}

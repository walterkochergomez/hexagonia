import { applyAction, createGame } from '../engine/game';
import { Rng, randomSeed, seedRng } from '../engine/rng';
import { viewFor } from '../engine/view';
import { GameError, type Action, type GameState } from '../engine/types';
import { pickBotMove } from './bots';
import { Decoder, makePeer, sendMsg, type DataConnection, type Peer } from './peer';
import { DEFAULT_SETTINGS, PEER_PREFIX, type ChatMsg, type LobbySeat, type LobbySettings, type LobbyState, type ToGuest, type ToHost } from './protocol';
import { BOT_NAMES, BaseSession, botPause, cleanName, type Session } from './session';

declare const __BUILD__: string;
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';
export const HOST_KEY = 'hexagonia.host';

export interface SavedHost { code: string; clientId: string; lobby: LobbyState; game: GameState | null; chat: ChatMsg[] }

export function loadSavedHost(): SavedHost | null {
  try {
    const raw = localStorage.getItem(HOST_KEY);
    return raw ? (JSON.parse(raw) as SavedHost) : null;
  } catch {
    return null;
  }
}

export function forgetSavedHost() {
  try {
    localStorage.removeItem(HOST_KEY);
  } catch {
    /* sin almacenamiento */
  }
}

interface Link { conn: DataConnection; dec: Decoder; clientId: string | null; lastSeen: number; seqs: Set<number> }

export class HostSession extends BaseSession implements Session {
  private peer: Peer | null = null;
  private links = new Map<string, Link>();
  private game: GameState | null;
  private lobby: LobbyState;
  private chatLog: ChatMsg[];
  private closed = false;
  private retries = 0;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private botSeen: { roll?: string; turn?: string } = {};
  private pingTimer: ReturnType<typeof setInterval>;
  private rng = new Rng(seedRng(randomSeed()));
  private tradeSeen: { id: number; at: number } | null = null;
  private turnActions = { n: -1, count: 0 };

  constructor(private code: string, private clientId: string, name: string, saved?: SavedHost | null) {
    super('host', code);
    if (saved && saved.code === code) {
      this.lobby = saved.lobby;
      this.game = saved.game;
      this.chatLog = saved.chat ?? [];
      for (const s of this.lobby.seats) s.connected = !!s.bot || s.clientId === clientId;
    } else {
      this.lobby = { code, status: 'lobby', seats: [{ clientId, name: cleanName(name), color: 0, host: true, connected: true }], settings: { ...DEFAULT_SETTINGS } };
      this.game = null;
      this.chatLog = [];
    }
    this.publish();
    this.open();
    this.pingTimer = setInterval(() => this.checkLinks(), 5000);
    this.scheduleBots();
  }

  // ---------- red ----------

  private open() {
    if (this.closed) return;
    const peer = makePeer(PEER_PREFIX + this.code);
    this.peer = peer;
    peer.on('open', () => {
      this.retries = 0;
      this.set({ status: 'open', error: null });
    });
    peer.on('connection', (conn) => this.attach(conn));
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err: Error & { type?: string }) => {
      if (this.closed) return;
      const type = err.type ?? '';
      if (type === 'peer-unavailable') return;
      if (type === 'unavailable-id' || ['network', 'server-error', 'socket-error', 'socket-closed'].includes(type)) {
        this.set({ status: 'reconnecting', error: { key: type === 'unavailable-id' ? 'net.idTaken' : 'net.reconnecting' } });
        peer.destroy();
        this.retries++;
        setTimeout(() => this.open(), Math.min(15000, 2000 + this.retries * 1500));
        return;
      }
      this.set({ status: 'error', error: { key: 'net.error', params: { msg: type || err.message } } });
    });
  }

  private attach(conn: DataConnection) {
    const link: Link = { conn, dec: new Decoder(), clientId: null, lastSeen: Date.now(), seqs: new Set() };
    this.links.set(conn.peer, link);
    conn.on('data', (raw) => {
      const msg = link.dec.feed(raw) as ToHost | undefined;
      if (!msg || typeof msg !== 'object') return;
      link.lastSeen = Date.now();
      this.onMessage(link, msg);
    });
    const drop = () => this.dropLink(conn.peer);
    conn.on('close', drop);
    conn.on('error', drop);
  }

  private dropLink(peerId: string) {
    const link = this.links.get(peerId);
    if (!link) return;
    this.links.delete(peerId);
    try {
      link.conn.close();
    } catch {
      /* ya cerrada */
    }
    if (link.clientId && ![...this.links.values()].some((l) => l.clientId === link.clientId)) {
      const seat = this.lobby.seats.find((s) => s.clientId === link.clientId);
      if (seat) {
        seat.connected = false;
        this.lobbyChanged();
      }
    }
  }

  private checkLinks() {
    const now = Date.now();
    for (const [id, l] of this.links) if (now - l.lastSeen > 25000) this.dropLink(id);
  }

  private send(link: Link, msg: ToGuest) {
    sendMsg(link.conn, msg);
  }

  private seatIndex(clientId: string | null): number | null {
    if (!clientId || this.lobby.status !== 'playing') return null;
    const i = this.lobby.seats.findIndex((s) => s.clientId === clientId);
    return i >= 0 ? i : null;
  }

  private onMessage(link: Link, msg: ToHost) {
    switch (msg.t) {
      case 'hello': {
        const clientId = String(msg.clientId ?? '').slice(0, 40);
        if (!clientId) return;
        link.clientId = clientId;
        let seat = this.lobby.seats.find((s) => s.clientId === clientId);
        if (seat) {
          seat.connected = true;
          if (this.lobby.status === 'lobby') seat.name = cleanName(String(msg.name ?? seat.name));
        } else if (this.lobby.status === 'lobby' && this.lobby.seats.length < 6) {
          const used = new Set(this.lobby.seats.map((s) => s.color));
          const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
          seat = { clientId, name: cleanName(String(msg.name ?? '')), color, connected: true };
          this.lobby.seats.push(seat);
        }
        const idx = this.lobby.seats.findIndex((s) => s.clientId === clientId);
        this.send(link, { t: 'welcome', seat: this.lobby.status === 'playing' && idx >= 0 ? idx : null, build: BUILD });
        if (msg.build && msg.build !== BUILD) this.send(link, { t: 'error', code: 'version' });
        this.send(link, { t: 'chatLog', msgs: this.chatLog });
        this.lobbyChanged();
        if (this.game) this.send(link, { t: 'state', view: viewFor(this.game, this.seatIndex(clientId)) });
        return;
      }
      case 'seat': {
        if (this.lobby.status !== 'lobby' || !link.clientId) return;
        const seat = this.lobby.seats.find((s) => s.clientId === link.clientId);
        if (!seat) return;
        if (typeof msg.name === 'string') seat.name = cleanName(msg.name);
        if (typeof msg.color === 'number' && msg.color >= 0 && msg.color < 6 && !this.lobby.seats.some((s) => s !== seat && s.color === msg.color)) seat.color = msg.color;
        this.lobbyChanged();
        return;
      }
      case 'act': {
        const seat = this.seatIndex(link.clientId);
        if (seat === null || !this.game) {
          this.send(link, { t: 'error', code: 'notYourTurn', seq: msg.seq });
          return;
        }
        if (typeof msg.seq === 'number') {
          if (link.seqs.has(msg.seq)) return;
          link.seqs.add(msg.seq);
          if (link.seqs.size > 200) link.seqs.delete(link.seqs.values().next().value!);
        }
        const err = this.apply(seat, msg.a);
        if (err) this.send(link, { t: 'error', code: err, seq: msg.seq });
        return;
      }
      case 'chat': {
        const seatObj = this.lobby.seats.find((s) => s.clientId === link.clientId);
        const text = String(msg.text ?? '').trim().slice(0, 300);
        if (!text) return;
        this.addChat({ seat: this.seatIndex(link.clientId), name: seatObj?.name ?? '?', color: seatObj?.color ?? 0, text, at: Date.now() });
        return;
      }
      case 'ping':
        this.send(link, { t: 'pong', at: msg.at });
        return;
    }
  }

  // ---------- estado ----------

  private apply(seat: number, a: Action): string | null {
    if (!this.game) return 'over';
    try {
      this.commit(applyAction(this.game, seat, a));
      return null;
    } catch (e) {
      return e instanceof GameError ? e.code : 'default';
    }
  }

  private commit(game: GameState) {
    if (!this.game || game.turn.n !== this.turnActions.n) this.turnActions = { n: game.turn.n, count: 0 };
    this.turnActions.count++;
    this.game = game;
    for (const link of this.links.values()) {
      if (link.clientId) this.send(link, { t: 'state', view: viewFor(game, this.seatIndex(link.clientId)) });
    }
    this.publish();
    this.scheduleBots();
  }

  private lobbyChanged() {
    for (const link of this.links.values()) if (link.clientId) this.send(link, { t: 'lobby', lobby: this.lobby });
    this.publish();
  }

  private addChat(m: ChatMsg) {
    this.chatLog = [...this.chatLog, m].slice(-100);
    for (const link of this.links.values()) if (link.clientId) this.send(link, { t: 'chat', msg: m });
    this.publish();
  }

  private publish() {
    const mySeat = this.seatIndex(this.clientId);
    const bots = this.lobby.seats.map((s, i) => (s.bot ? i : -1)).filter((i) => i >= 0);
    this.set({
      lobby: structuredClone(this.lobby),
      view: this.game ? viewFor(this.game, mySeat) : null,
      mySeat,
      chat: this.chatLog,
      bots,
    });
    this.save();
  }

  private save() {
    try {
      const data: SavedHost = { code: this.code, clientId: this.clientId, lobby: this.lobby, game: this.game, chat: this.chatLog.slice(-30) };
      localStorage.setItem(HOST_KEY, JSON.stringify(data));
    } catch {
      /* almacenamiento lleno o bloqueado */
    }
  }

  private scheduleBots() {
    if (this.botTimer || !this.game || this.lobby.status !== 'playing') return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      this.runBots();
    }, botPause(this.game, this.botSeen));
  }

  private runBots() {
    const g = this.game;
    if (!g || this.closed) return;
    const bots = new Set(this.lobby.seats.map((s, i) => (s.bot ? i : -1)).filter((i) => i >= 0));
    if (g.trade && this.tradeSeen?.id !== g.trade.id) this.tradeSeen = { id: g.trade.id, at: Date.now() };
    const age = g.trade && this.tradeSeen ? Date.now() - this.tradeSeen.at : 0;
    const move = pickBotMove(g, bots, this.rng, age, this.turnActions.count);
    if (!move) {
      if (g.trade && bots.has(g.trade.from)) this.scheduleBots();
      return;
    }
    const err = this.apply(move.seat, move.a);
    if (err && move.a.t !== 'endTurn') {
      // un bot nunca debe trabar la partida
      this.apply(move.seat, { t: 'endTurn' });
    }
  }

  // ---------- acciones de la interfaz ----------

  act(a: Action) {
    const seat = this.seatIndex(this.clientId);
    if (seat === null) return;
    const err = this.apply(seat, a);
    if (err) this.set({ actionError: { code: err, at: Date.now() } });
  }

  chat(text: string) {
    const seatObj = this.lobby.seats.find((s) => s.clientId === this.clientId);
    const t = text.trim().slice(0, 300);
    if (t) this.addChat({ seat: this.seatIndex(this.clientId), name: seatObj?.name ?? '?', color: seatObj?.color ?? 0, text: t, at: Date.now() });
  }

  updateSettings(p: Partial<LobbySettings>) {
    if (this.lobby.status !== 'lobby') return;
    this.lobby.settings = { ...this.lobby.settings, ...p };
    this.lobbyChanged();
  }

  setSeat(p: { name?: string; color?: number }) {
    const seat = this.lobby.seats.find((s) => s.clientId === this.clientId);
    if (!seat || this.lobby.status !== 'lobby') return;
    if (p.name !== undefined) seat.name = cleanName(p.name);
    if (p.color !== undefined && !this.lobby.seats.some((s) => s !== seat && s.color === p.color)) seat.color = p.color;
    this.lobbyChanged();
  }

  addBot() {
    if (this.lobby.status !== 'lobby' || this.lobby.seats.length >= 6) return;
    const used = new Set(this.lobby.seats.map((s) => s.color));
    const color = [0, 1, 2, 3, 4, 5].find((c) => !used.has(c)) ?? 0;
    const names = BOT_NAMES.filter((n) => !this.lobby.seats.some((s) => s.name === n));
    const seat: LobbySeat = { clientId: `bot-${Math.random().toString(36).slice(2, 8)}`, name: names[0] ?? 'Bot', color, bot: true, connected: true };
    this.lobby.seats.push(seat);
    this.lobbyChanged();
  }

  removeSeat(clientId: string) {
    if (this.lobby.status !== 'lobby' || clientId === this.clientId) return;
    this.lobby.seats = this.lobby.seats.filter((s) => s.clientId !== clientId);
    for (const [id, l] of this.links) {
      if (l.clientId === clientId) {
        this.send(l, { t: 'kicked' });
        this.dropLink(id);
      }
    }
    this.lobbyChanged();
  }

  start() {
    if (this.lobby.status !== 'lobby' || this.lobby.seats.length < 2) return;
    const st = this.lobby.settings;
    const game = createGame(
      { ...st, seats: this.lobby.seats.length, seed: randomSeed() },
      this.lobby.seats.map((s) => ({ name: s.name, color: s.color })),
    );
    this.lobby.status = 'playing';
    this.game = null;
    this.lobbyChanged();
    this.commit(game);
  }

  rematch() {
    if (!this.game || this.game.winner === null) return;
    this.lobby.status = 'lobby';
    this.game = null;
    for (const link of this.links.values()) if (link.clientId) this.send(link, { t: 'welcome', seat: null, build: BUILD });
    this.lobbyChanged();
  }

  leave() {
    this.closed = true;
    clearInterval(this.pingTimer);
    if (this.botTimer) clearTimeout(this.botTimer);
    for (const l of this.links.values()) {
      try {
        l.conn.close();
      } catch {
        /* nada */
      }
    }
    this.peer?.destroy();
    this.set({ status: 'closed' });
  }
}

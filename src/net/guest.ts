import type { Action } from '../engine/types';
import { Decoder, makePeer, sendMsg, type DataConnection, type Peer } from './peer';
import { PEER_PREFIX, type ToGuest, type ToHost } from './protocol';
import { BaseSession, type Session } from './session';

declare const __BUILD__: string;
const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

export class GuestSession extends BaseSession implements Session {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private dec = new Decoder();
  private seq = 0;
  private closed = false;
  private lastHeard = Date.now();
  private timer: ReturnType<typeof setInterval>;
  private redialTimer: ReturnType<typeof setTimeout> | null = null;
  private attempts = 0;
  private onVisible = () => {
    if (document.visibilityState === 'visible' && (!this.conn || !this.conn.open)) this.redial(0);
  };

  constructor(private code: string, private clientId: string, private name: string) {
    super('guest', code);
    this.boot();
    this.timer = setInterval(() => this.heartbeat(), 5000);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible);
  }

  private boot() {
    if (this.closed) return;
    this.peer?.destroy();
    const peer = makePeer();
    this.peer = peer;
    peer.on('open', () => this.dial());
    peer.on('disconnected', () => {
      if (!this.closed && !peer.destroyed) setTimeout(() => !peer.destroyed && peer.reconnect(), 1500);
    });
    peer.on('error', (err: Error & { type?: string }) => {
      if (this.closed) return;
      const type = err.type ?? '';
      if (type === 'peer-unavailable') {
        this.set({ status: 'error', error: { key: 'net.notFound', params: { code: this.code } } });
        this.redial(4000);
        return;
      }
      if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(type)) {
        this.set({ status: 'reconnecting', error: { key: 'net.reconnecting' } });
        setTimeout(() => this.boot(), 3000);
        return;
      }
      this.set({ status: 'error', error: { key: 'net.error', params: { msg: type || err.message } } });
    });
  }

  private dial() {
    if (this.closed || !this.peer || this.peer.destroyed) return;
    if (this.peer.disconnected) {
      this.boot();
      return;
    }
    this.attempts++;
    try {
      this.conn?.close();
    } catch {
      /* nada */
    }
    const conn = this.peer.connect(PEER_PREFIX + this.code, { reliable: true, serialization: 'json' });
    this.conn = conn;
    this.dec = new Decoder();
    conn.on('open', () => {
      if (conn !== this.conn) return;
      this.attempts = 0;
      this.lastHeard = Date.now();
      this.set({ status: 'open', error: null });
      this.send({ t: 'hello', name: this.name, clientId: this.clientId, build: BUILD });
    });
    conn.on('data', (raw) => {
      if (conn !== this.conn) return;
      const msg = this.dec.feed(raw) as ToGuest | undefined;
      if (!msg || typeof msg !== 'object') return;
      this.lastHeard = Date.now();
      this.onMessage(msg);
    });
    const lost = () => {
      if (conn !== this.conn || this.closed) return;
      this.set({ status: 'reconnecting', error: { key: 'net.hostLost' } });
      this.redial(2000);
    };
    conn.on('close', lost);
    conn.on('error', lost);
    // si nunca abre, reintenta
    setTimeout(() => {
      if (conn === this.conn && !conn.open && !this.closed) this.redial(0);
    }, 12000);
  }

  private redial(ms: number) {
    if (this.redialTimer || this.closed) return;
    const wait = ms + Math.min(8000, this.attempts * 1000);
    this.redialTimer = setTimeout(() => {
      this.redialTimer = null;
      this.dial();
    }, wait);
  }

  private heartbeat() {
    if (this.closed) return;
    if (this.conn?.open) {
      this.send({ t: 'ping', at: Date.now() });
      if (Date.now() - this.lastHeard > 16000) {
        this.set({ status: 'reconnecting', error: { key: 'net.hostLost' } });
        this.redial(0);
      }
    }
  }

  private send(msg: ToHost) {
    sendMsg(this.conn, msg);
  }

  private onMessage(msg: ToGuest) {
    switch (msg.t) {
      case 'welcome':
        if (msg.seat === null) this.set({ mySeat: null, view: null });
        return;
      case 'lobby': {
        const bots = msg.lobby.seats.map((s, i) => (s.bot ? i : -1)).filter((i) => i >= 0);
        this.set({ lobby: msg.lobby, bots, ...(msg.lobby.status === 'lobby' ? { view: null, mySeat: null } : {}) });
        return;
      }
      case 'state':
        this.set({ view: msg.view, mySeat: msg.view.viewer ?? null });
        return;
      case 'error':
        if (msg.code === 'version') this.set({ error: { key: 'net.version' } });
        else this.set({ actionError: { code: msg.code, at: Date.now() } });
        return;
      case 'chat':
        this.set({ chat: [...this.snap.chat, msg.msg].slice(-100) });
        return;
      case 'chatLog':
        this.set({ chat: msg.msgs });
        return;
      case 'kicked':
        this.leave();
        return;
      case 'pong':
        return;
    }
  }

  act(a: Action) {
    this.send({ t: 'act', a, seq: ++this.seq });
  }

  chat(text: string) {
    const t = text.trim();
    if (t) this.send({ t: 'chat', text: t.slice(0, 300) });
  }

  setSeat(p: { name?: string; color?: number }) {
    if (p.name) this.name = p.name;
    this.send({ t: 'seat', ...p });
  }

  leave() {
    this.closed = true;
    clearInterval(this.timer);
    if (this.redialTimer) clearTimeout(this.redialTimer);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
    try {
      this.conn?.close();
    } catch {
      /* nada */
    }
    this.peer?.destroy();
    this.set({ status: 'closed' });
  }
}

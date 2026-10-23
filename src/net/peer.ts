import Peer, { type DataConnection, type PeerOptions } from 'peerjs';

/** Opciones de PeerJS. `?peer=host:puerto` usa un servidor de señalización propio (pruebas locales). */
export function peerOptions(): PeerOptions {
  const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  const custom = q.get('peer');
  if (!custom) return { debug: 0 };
  const url = new URL(custom.includes('://') ? custom : `http://${custom}`);
  const secure = url.protocol === 'https:';
  return {
    debug: 0,
    host: url.hostname,
    port: Number(url.port || (secure ? 443 : 80)),
    path: url.pathname || '/',
    secure,
    config: { iceServers: [] },
  };
}

export function makePeer(id?: string): Peer {
  return id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
}

const CHUNK = 12000;

export function sendMsg(conn: DataConnection | null | undefined, msg: unknown) {
  if (!conn || !conn.open) return;
  const s = JSON.stringify(msg);
  try {
    if (s.length <= CHUNK) {
      conn.send({ m: s });
      return;
    }
    const id = Math.random().toString(36).slice(2, 10);
    const n = Math.ceil(s.length / CHUNK);
    for (let i = 0; i < n; i++) conn.send({ c: id, i, n, d: s.slice(i * CHUNK, (i + 1) * CHUNK) });
  } catch {
    // la conexión se cerró a mitad de envío: la reconexión lo resuelve
  }
}

function parse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

export class Decoder {
  private parts = new Map<string, { n: number; got: number; d: string[] }>();

  feed(raw: unknown): unknown {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as { m?: unknown; c?: unknown; i?: unknown; n?: unknown; d?: unknown };
    if (typeof r.m === 'string') return parse(r.m);
    if (typeof r.c === 'string' && typeof r.i === 'number' && typeof r.n === 'number' && typeof r.d === 'string' && r.n < 500) {
      let e = this.parts.get(r.c);
      if (!e) {
        e = { n: r.n, got: 0, d: [] };
        this.parts.set(r.c, e);
        if (this.parts.size > 20) this.parts.delete(this.parts.keys().next().value!);
      }
      if (e.d[r.i] === undefined) {
        e.d[r.i] = r.d;
        e.got++;
      }
      if (e.got === e.n) {
        this.parts.delete(r.c);
        return parse(e.d.join(''));
      }
    }
    return undefined;
  }
}

export type { Peer, DataConnection };

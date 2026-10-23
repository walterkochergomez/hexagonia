import { useEffect, useRef, useState } from 'react';
import { useT } from '../../app/i18n';
import type { GameState } from '../../engine/types';
import type { ChatMsg } from '../../net/protocol';
import { PlayerMark } from '../art';
import { formatLog } from '../format';
import { Segmented } from '../common';

export function LogChat({ view, chat, onChat, canChat }: { view: GameState; chat: ChatMsg[]; onChat: (s: string) => void; canChat: boolean }) {
  const t = useT();
  const [tab, setTab] = useState<'log' | 'chat'>('log');
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const entries = view.log.slice(-80);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries.length, chat.length, tab]);
  const seatColor = (p: Record<string, unknown> | undefined) => {
    const s = p?.seat;
    return typeof s === 'number' && view.players[s] ? view.players[s].color : null;
  };
  return (
    <div className="logchat">
      {canChat && (
        <Segmented value={tab} onChange={setTab} label={t('act.log')} options={[{ value: 'log', label: t('act.log') }, { value: 'chat', label: t('act.chat') }]} />
      )}
      <div className="log-list" ref={listRef} aria-live="polite" tabIndex={0} aria-label={tab === 'log' ? t('act.log') : t('act.chat')}>
        {tab === 'log'
          ? entries.map((e, i) => {
              const c = seatColor(e.p);
              return (
                <p key={`${e.n}-${i}`} className={`log-line k-${e.k.split('.')[0]}`}>
                  {c !== null && <PlayerMark color={c} size={12} />}
                  <span>{formatLog(e, view, t)}</span>
                </p>
              );
            })
          : chat.map((m, i) => (
              <p key={`${m.at}-${i}`} className="log-line chat">
                <PlayerMark color={m.color} size={12} />
                <span><strong>{m.name}</strong> {m.text}</span>
              </p>
            ))}
      </div>
      {canChat && tab === 'chat' && (
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onChat(text); setText(''); } }}>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} aria-label={t('act.chat')} placeholder={t('act.chat')} />
          <button type="submit" className="btn secondary">↵</button>
        </form>
      )}
    </div>
  );
}

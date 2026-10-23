import { useEffect, useRef, useState } from 'react';
import { useT } from '../../app/i18n';
import type { GameState } from '../../engine/types';
import { PlayerMark } from '../art';
import { Modal } from '../common';

/** Resumen del último ataque bárbaro, una vez por ataque. */
export function BarbarianReport({ view, hidden }: { view: GameState; hidden?: boolean }) {
  const t = useT();
  const seen = useRef(view.barbarians.attacks);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (view.barbarians.attacks > seen.current) {
      seen.current = view.barbarians.attacks;
      setOpen(true);
    }
  }, [view.barbarians.attacks]);
  const r = view.barbarians.last;
  if (hidden || !open || !r || !view.settings.guilds) return null;
  const names = (xs: number[]) => xs.map((s) => view.players[s]?.name ?? '?').join(', ');
  return (
    <Modal title={t('barb.title')} onClose={() => setOpen(false)} actions={<button type="button" className="btn primary" onClick={() => setOpen(false)}>{t('common.ok')}</button>}>
      <p className="barb-score">{t('guild.strength', { a: r.strength, b: r.defense })}</p>
      <p><strong>{r.won ? t('barb.won') : t('barb.lost')}</strong></p>
      {r.won && r.defender !== null && <p>{t('barb.defender', { name: view.players[r.defender].name })}</p>}
      {r.won && r.tied.length > 0 && <p>{t('barb.tied', { names: names(r.tied) })}</p>}
      {!r.won && <p>{r.losers.length ? t('barb.losers', { names: names(r.losers) }) : t('barb.none')}</p>}
      <h3>{t('barb.contrib')}</h3>
      <ul className="contrib">
        {view.players.map((p) => (
          <li key={p.seat}><PlayerMark color={p.color} size={14} /> {p.name} <strong>{r.contributions[p.seat]}</strong></li>
        ))}
      </ul>
    </Modal>
  );
}

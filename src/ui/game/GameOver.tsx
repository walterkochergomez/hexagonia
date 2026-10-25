import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import type { GameState } from '../../engine/types';
import { PlayerMark } from '../art';
import { Modal } from '../common';

const PARTS = ['settlements', 'cities', 'metropolis', 'road', 'army', 'harbor', 'camels', 'wealth', 'gifts', 'cloth', 'prisoners', 'cards', 'defender', 'merchant', 'bonus'] as const;

export function GameOver({ view, me, onHome, onRematch, onClose }: { view: GameState; me: number | null; onHome: () => void; onRematch?: () => void; onClose: () => void }) {
  const t = useT();
  if (view.winner === null) return null;
  const w = view.players[view.winner];
  const rows = view.players
    .filter((p) => !p.neutral)
    .map((p) => ({ p, vp: C.vpOf(view, p.seat), parts: C.vpBreakdown(view, p.seat) }))
    .sort((a, b) => b.vp - a.vp);
  const used = PARTS.filter((k) => rows.some((r) => r.parts[k] !== 0));
  const rolls = view.stats.rolls.slice(2);
  const max = Math.max(1, ...rolls);
  return (
    <Modal title={view.winner === me ? t('over.titleYou') : t('over.title', { name: w.name })} onClose={onClose} wide
      actions={
        <>
          {onRematch && <button type="button" className="btn primary" onClick={onRematch}>{t('lobby.rematch')}</button>}
          <button type="button" className="btn secondary" onClick={onHome}>{t('over.home')}</button>
        </>
      }>
      <table className="score-table">
        <thead>
          <tr>
            <th scope="col">{t('act.players')}</th>
            {used.map((k) => <th key={k} scope="col">{t(`over.breakdown.${k}`)}</th>)}
            <th scope="col">{t('over.points')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, vp, parts }) => (
            <tr key={p.seat} className={p.seat === view.winner ? 'winner' : ''}>
              <th scope="row"><PlayerMark color={p.color} size={14} /> {p.name}</th>
              {used.map((k) => <td key={k}>{parts[k] || ''}</td>)}
              <td className="total">{vp}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t('over.dice')}</h3>
      <div className="histogram" role="img" aria-label={rolls.map((n, i) => `${i + 2}: ${n}`).join(', ')}>
        {rolls.map((n, i) => (
          <div key={i} className="bar-col">
            <span className="bar" style={{ height: `${(n / max) * 100}%` }} />
            <span className="small">{i + 2}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

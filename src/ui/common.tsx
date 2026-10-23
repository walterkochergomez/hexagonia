import { useEffect, useRef, type ReactNode } from 'react';
import { useT } from '../app/i18n';
import type { Card, Hand } from '../engine/types';
import { CardIcon } from './art';

export function Modal({ title, children, onClose, wide, actions }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean; actions?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('button:not([disabled]), input, select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div ref={ref} className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          {onClose && <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}>×</button>}
        </header>
        <div className="modal-body">{children}</div>
        {actions && <footer className="modal-actions">{actions}</footer>}
      </div>
    </div>
  );
}

export function Segmented<V extends string>({ value, options, onChange, label }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  return (
    <label className={`toggle${disabled ? ' disabled' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true"><span className="knob" /></span>
      <span className="toggle-text">
        <span className="toggle-label">{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </span>
    </label>
  );
}

export function CardChip({ card, n, dim }: { card: Card; n?: number; dim?: boolean }) {
  const t = useT();
  return (
    <span className={`card-chip${dim ? ' dim' : ''}`} title={t(`res.${card}`)}>
      <CardIcon card={card} size={22} />
      {n !== undefined && <span className="n">{n}</span>}
      <span className="sr">{t(`res.${card}`)}</span>
    </span>
  );
}

export function HandLine({ hand, empty }: { hand: Partial<Hand>; empty?: string }) {
  const entries = Object.entries(hand).filter(([, n]) => (n ?? 0) > 0) as [Card, number][];
  if (!entries.length) return <span className="muted">{empty ?? '—'}</span>;
  return <span className="hand-line">{entries.map(([c, n]) => <CardChip key={c} card={c} n={n} />)}</span>;
}

/** Elegir cartas con + y −. `limit` es lo disponible por tipo; `total` el número exacto requerido (si aplica). */
export function CardPicker({ cards, limit, value, onChange, total }: { cards: readonly Card[]; limit: Partial<Hand>; value: Partial<Hand>; onChange: (h: Partial<Hand>) => void; total?: number }) {
  const t = useT();
  const sum = Object.values(value).reduce((a, b) => a + (b ?? 0), 0);
  const set = (c: Card, n: number) => onChange({ ...value, [c]: Math.max(0, n) });
  return (
    <div className="picker">
      {cards.map((c) => {
        const n = value[c] ?? 0;
        const max = limit[c] ?? 0;
        return (
          <div key={c} className={`pick-row${max === 0 ? ' dim' : ''}`}>
            <CardIcon card={c} size={30} />
            <span className="pick-name">{t(`res.${c}`)}<span className="muted"> · {max}</span></span>
            <button type="button" className="step-btn" aria-label={`− ${t(`res.${c}`)}`} disabled={n <= 0} onClick={() => set(c, n - 1)}>−</button>
            <span className="pick-n" aria-live="polite">{n}</span>
            <button type="button" className="step-btn" aria-label={`+ ${t(`res.${c}`)}`} disabled={n >= max || (total !== undefined && sum >= total)} onClick={() => set(c, n + 1)}>+</button>
          </div>
        );
      })}
      {total !== undefined && <p className={`pick-total${sum === total ? ' ok' : ''}`}>{t('common.of', { a: sum, b: total })}</p>}
    </div>
  );
}

export function Toasts({ items }: { items: { id: number; text: string; tone: 'info' | 'error' | 'turn' }[] }) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((i) => <div key={i.id} className={`toast ${i.tone}`}>{i.text}</div>)}
    </div>
  );
}

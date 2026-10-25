import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useT, type T } from '../../app/i18n';
import * as River from '../../engine/mods/river';
import * as Traders from '../../engine/mods/traders';
import * as X from '../../engine/mods/expedition';
import { COST, type GameState, type Hand } from '../../engine/types';
import { CardBack, CargoIcon, CityShape, KnightShape, SettlementShape, ShipShape } from '../art';
import { HandLine } from '../common';

interface Row { id: string; label: string; cost: Partial<Hand>; icon: ReactNode; note?: string }

const icon = (node: ReactNode) => <svg width={34} height={34} viewBox="-20 -23 40 40" aria-hidden="true">{node}</svg>;

/** Lo que cuesta cada cosa en esta partida (con los módulos y el escenario elegidos). */
function rowsFor(view: GameState, me: number | null, t: T): Row[] {
  const c = me !== null ? view.players[me].color : 0;
  const road = <g className={`road p${c}`}><path d="M-12 7 L12 -7" className="road-outline" /><path d="M-12 7 L12 -7" className="road-fill" /><path d="M-12 5.7 L12 -8.3" className="road-shine" /></g>;
  const rows: Row[] = [
    { id: 'road', label: t('piece.road'), cost: COST.road, icon: icon(road) },
    { id: 'settlement', label: t('piece.settlement'), cost: COST.settlement, icon: icon(<SettlementShape color={c} />) },
    { id: 'city', label: t('piece.city'), cost: COST.city, icon: icon(<CityShape color={c} />) },
  ];
  if (view.settings.openSea) rows.push({ id: 'ship', label: t('piece.ship'), cost: COST.ship, icon: icon(<ShipShape color={c} />) });
  if (view.river) {
    rows.push({ id: 'bridge', label: t('piece.bridge'), cost: River.BRIDGE_COST,
      icon: icon(<g className={`bridge p${c}`}><path d="M-12 7 L12 -7" className="bridge-deck" /><path d="M-12 7 L12 -7" className="bridge-planks" pathLength={1} /><path d="M-9.5 10.3 L14.5 -3.7 M-14.5 3.7 L9.5 -10.3" className="bridge-rail" /></g>) });
  }
  if (view.expedition) {
    rows.push(
      { id: 'xship', label: t('piece.xship'), cost: X.SHIP_COST, icon: icon(<ShipShape color={c} />) },
      { id: 'pioneer', label: t('cargo.pioneer'), cost: X.PIONEER_COST, icon: icon(<g transform="translate(0 -3) scale(2.4)"><CargoIcon cargo="pioneer" color={c} /></g>) },
      { id: 'crew', label: t('cargo.crew'), cost: X.CREW_COST, icon: icon(<g transform="translate(0 -3) scale(2.4)"><CargoIcon cargo="crew" /></g>) },
    );
  }
  if (view.settings.guilds) {
    rows.push(
      { id: 'wall', label: t('piece.wall'), cost: COST.wall, icon: icon(<CityShape color={c} wall />) },
      { id: 'recruit', label: t('act.recruit'), cost: COST.knight, icon: icon(<KnightShape color={c} level={1} active={false} />) },
      { id: 'activate', label: t('act.activate'), cost: COST.activate, icon: icon(<KnightShape color={c} level={1} active />) },
      { id: 'promote', label: t('act.promote'), cost: COST.promote, icon: icon(<KnightShape color={c} level={2} active />) },
      { id: 'improve', label: t('act.improve'), cost: {}, note: t('cost.improveNote'), icon: icon(<CityShape color={c} metro="science" />) },
    );
  } else {
    rows.push({ id: 'dev', label: view.raid ? t('cost.raidCard') : t('cost.dev'), cost: COST.dev, icon: icon(<g transform="translate(-16 -19)"><CardBack size={32} kind="dev" /></g>) });
  }
  // carretas: el próximo nivel de la carreta propia
  const w = me !== null ? view.traders?.wagons[me] : undefined;
  if (w && w.level < Traders.MAX_LEVEL) {
    rows.push({ id: 'wagon', label: t('wagon.up', { n: w.level + 1 }), cost: Traders.LEVELS[w.level].cost, icon: null });
  }
  return rows;
}

/** Botón flotante sobre el tablero que despliega la tarjeta de costos; se puede abrir en cualquier momento. */
export function CostCard({ view, me, onOpen }: { view: GameState; me: number | null; onOpen?: (open: boolean) => void }) {
  const t = useT();
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => { setOpenState(v); onOpen?.(v); };
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    // tocar fuera de la tarjeta la cierra
    const onDown = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open]);
  const rows = rowsFor(view, me, t);
  return (
    <div className="cost-wrap" ref={ref}>
      <button type="button" className={`icon-btn cost-fab${open ? ' on' : ''}`} aria-expanded={open} aria-controls={open ? 'cost-card' : undefined}
        aria-label={t('cost.open')} title={t('cost.open')} onClick={() => setOpen(!open)}>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="tool-icon">
          <rect x="4.5" y="3" width="15" height="18" rx="2.2" />
          <path d="M8 8 H16 M8 12 H16 M8 16 H12.5" />
        </svg>
      </button>
      {open && (
        <div className="cost-card" id="cost-card" role="dialog" aria-label={t('cost.title')}>
          <div className="cost-head">
            <h2>{t('cost.title')}</h2>
            <button type="button" className="icon-btn sm" aria-label={t('common.close')} onClick={() => setOpen(false)}>×</button>
          </div>
          <ul className="cost-list">
            {rows.map((r) => (
              <li key={r.id} data-cost={r.id}>
                <span className="cost-icon">{r.icon}</span>
                <span className="cost-name">
                  {r.label}
                  {r.note && <span className="muted small">{r.note}</span>}
                </span>
                {Object.keys(r.cost).length > 0 && <span className="cost-cards"><HandLine hand={r.cost} /></span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

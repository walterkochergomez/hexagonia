import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Guild from '../../engine/guilds';
import { COST, type Action, type GameState, type Hand } from '../../engine/types';
import { CityShape, KnightShape, SettlementShape, ShipShape } from '../art';
import { HandLine, Modal } from '../common';
import type { Mode } from './plan';

interface Item {
  id: string;
  label: string;
  cost: Partial<Hand>;
  left?: number;
  ok: boolean;
  icon: React.ReactNode;
  run: () => void;
}

export function BuildMenu({ view, me, send, setMode, onClose }: { view: GameState; me: number; send: (a: Action) => void; setMode: (m: Mode) => void; onClose: () => void }) {
  const t = useT();
  const p = view.players[me];
  const left = C.piecesLeft(view, me);
  const can = (cost: Partial<Hand>) => C.hasCards(p.hand, cost);
  const color = p.color;
  const sbp = view.turn.phase === 'specialBuild';
  const pick = (m: Mode) => () => {
    setMode(m);
    onClose();
  };
  const damaged = Object.values(view.buildings).some((b) => b.owner === me && b.damaged);
  const icon = (node: React.ReactNode) => <svg width={34} height={34} viewBox="-17 -17 34 34" aria-hidden="true">{node}</svg>;
  const items: Item[] = [
    { id: 'road', label: t('piece.road'), cost: COST.road, left: left.road, ok: can(COST.road) && left.road > 0 && C.legalRoads(view, me).length > 0,
      icon: icon(<path d="M-12 8 L12 -8" className={`road-fill pstroke p${color}`} />), run: pick({ k: 'build', what: 'road' }) },
  ];
  if (view.settings.openSea) {
    items.push({ id: 'ship', label: t('piece.ship'), cost: COST.ship, left: left.ship, ok: can(COST.ship) && left.ship > 0 && C.legalShips(view, me).length > 0,
      icon: icon(<ShipShape color={color} />), run: pick({ k: 'build', what: 'ship' }) });
  }
  items.push(
    { id: 'settlement', label: t('piece.settlement'), cost: COST.settlement, left: left.settlement, ok: can(COST.settlement) && left.settlement > 0 && !damaged && C.legalSettlements(view, me).length > 0,
      icon: icon(<SettlementShape color={color} />), run: pick({ k: 'build', what: 'settlement' }) },
    { id: 'city', label: t('piece.city'), cost: COST.city, left: left.city, ok: can(COST.city) && C.legalCities(view, me).length > 0 && (left.city > 0 || damaged),
      icon: icon(<CityShape color={color} />), run: pick({ k: 'build', what: 'city' }) },
  );
  if (view.settings.guilds) {
    const cities = Object.values(view.buildings).filter((b) => b.owner === me && b.kind === 'city' && !b.damaged && !b.wall).length;
    const mine = Object.entries(view.knights).filter(([, k]) => k.owner === me);
    items.push(
      { id: 'wall', label: t('piece.wall'), cost: COST.wall, left: left.wall, ok: can(COST.wall) && left.wall > 0 && cities > 0,
        icon: icon(<CityShape color={color} wall />), run: pick({ k: 'build', what: 'wall' }) },
      { id: 'recruit', label: t('act.recruit'), cost: COST.knight, left: left.knights[1], ok: can(COST.knight) && left.knights[1] > 0 && C.recruitSpots(view, me).length > 0,
        icon: icon(<KnightShape color={color} level={1} active={false} />), run: pick({ k: 'recruit' }) },
      { id: 'activate', label: t('act.activate'), cost: COST.activate, ok: can(COST.activate) && mine.some(([, k]) => !k.active),
        icon: icon(<KnightShape color={color} level={1} active />), run: pick({ k: 'activate' }) },
      { id: 'promote', label: t('act.promote'), cost: COST.promote, ok: can(COST.promote) && mine.some(([v]) => Guild.canPromote(view, me, v)),
        icon: icon(<KnightShape color={color} level={2} active />), run: pick({ k: 'promote' }) },
    );
  } else {
    items.push({ id: 'dev', label: t('act.buyDev'), cost: COST.dev, left: view.decks.dev, ok: can(COST.dev) && view.decks.dev > 0,
      icon: icon(<rect x={-8} y={-11} width={16} height={22} rx={3} className="devcard" />), run: () => { send({ t: 'buyDev' }); onClose(); } });
  }
  return (
    <Modal title={t('act.build')} onClose={onClose}>
      <ul className="build-list">
        {items.map((it) => (
          <li key={it.id}>
            <button type="button" className="build-item" disabled={!it.ok} onClick={it.run}>
              <span className="build-icon">{it.icon}</span>
              <span className="build-text">
                <span className="build-name">{it.label}</span>
                <span className="build-cost"><HandLine hand={it.cost} /></span>
              </span>
              {it.left !== undefined && <span className="muted small">{t('cost.left', { n: it.left })}</span>}
            </button>
          </li>
        ))}
      </ul>
      {sbp && <p className="muted small">{t('phase.sbp')}</p>}
    </Modal>
  );
}

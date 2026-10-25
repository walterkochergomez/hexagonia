import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Guild from '../../engine/guilds';
import * as River from '../../engine/mods/river';
import * as X from '../../engine/mods/expedition';
import { COST, type Action, type GameState, type Hand } from '../../engine/types';
import { CardBack, CityShape, KnightShape, SettlementShape, ShipShape } from '../art';
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
  const icon = (node: React.ReactNode) => <svg width={38} height={38} viewBox="-20 -23 40 40" aria-hidden="true">{node}</svg>;
  const items: Item[] = [
    { id: 'road', label: t('piece.road'), cost: COST.road, left: left.road, ok: can(COST.road) && left.road > 0 && C.legalRoads(view, me).length > 0,
      icon: icon(<g className={`road p${color}`}><path d="M-12 7 L12 -7" className="road-outline" /><path d="M-12 7 L12 -7" className="road-fill" /><path d="M-12 5.7 L12 -8.3" className="road-shine" /></g>), run: pick({ k: 'build', what: 'road' }) },
  ];
  const broken = Object.values(view.roads).some((r) => r.owner === me && r.broken);
  if (broken) {
    items.push({ id: 'repair', label: t('act.repair'), cost: COST.road, ok: can(COST.road),
      icon: icon(<g className={`road p${color} broken`}><path d="M-12 7 L12 -7" className="road-outline" /><path d="M-12 7 L12 -7" className="road-fill" /><path d="M-1 -4 L1 1 L-2 3 L0 7" className="road-crack" /></g>), run: pick({ k: 'build', what: 'repair' }) });
  }
  if (view.river) {
    const mine = Object.values(view.roads).filter((r) => r.owner === me && r.bridge).length;
    items.push({ id: 'bridge', label: t('piece.bridge'), cost: River.BRIDGE_COST, left: River.BRIDGES_MAX - mine, ok: can(River.BRIDGE_COST) && River.legalBridges(view, me).length > 0,
      icon: icon(<g className={`bridge p${color}`}><path d="M-12 7 L12 -7" className="bridge-deck" /><path d="M-12 7 L12 -7" className="bridge-planks" pathLength={1} /><path d="M-9.5 10.3 L14.5 -3.7 M-14.5 3.7 L9.5 -10.3" className="bridge-rail" /></g>), run: pick({ k: 'bridge' }) });
  }
  if (view.expedition) {
    items.push({ id: 'xship', label: t('piece.xship'), cost: X.SHIP_COST, left: X.MAX_SHIPS - X.shipsOf(view, me).length, ok: X.canBuildShip(view, me),
      icon: icon(<ShipShape color={color} />), run: pick({ k: 'xship' }) });
  }
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
    items.push({ id: 'dev', label: t('act.buyDev'), cost: COST.dev, left: view.decks.dev, ok: can(COST.dev) && (view.decks.dev > 0 || !!view.raid),
      icon: icon(<g transform="translate(-16 -19)"><CardBack size={32} kind="dev" /></g>), run: () => { send({ t: 'buyDev' }); onClose(); } });
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

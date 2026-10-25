import { useT } from '../../app/i18n';
import * as Traders from '../../engine/mods/traders';
import type { Action, GameState } from '../../engine/types';
import { CardIcon, WagonShape } from '../art';
import { HandLine, Modal } from '../common';
import { lower, orList } from '../format';
import type { Mode } from './plan';

/** La carreta: dónde va, cuánto le queda, mejorarla, acelerarla con trigo y ahuyentar bárbaros. */
export function WagonSheet({ view, me, send, setMode, onClose }: { view: GameState; me: number; send: (a: Action) => void; setMode: (m: Mode) => void; onClose: () => void }) {
  const t = useT();
  const tr = view.traders!;
  const w = tr.wagons[me];
  const color = view.players[me].color;
  const main = view.turn.phase === 'main' && view.turn.current === me && !view.steps.length;
  const canMove = main && Traders.trips(view, me).size > 0;
  const drive = main ? Traders.drivable(view, me) : [];
  const lv = Traders.LEVELS[w.level - 1];
  const next = w.level < Traders.MAX_LEVEL ? Traders.LEVELS[w.level] : null;
  const goal = w.cargo ? Traders.DEST[w.cargo] : null;
  const icon = (node: React.ReactNode) => <svg width={38} height={38} viewBox="-20 -20 40 40" aria-hidden="true">{node}</svg>;
  return (
    <Modal title={t('wagon.title')} onClose={onClose} wide>
      <div className="wagon-head">
        <svg width={72} height={60} viewBox="-18 -18 36 30" aria-hidden="true"><WagonShape color={color} level={w.level} cargo={w.cargo} /></svg>
        <div>
          <p><strong>{t('wagon.level', { n: w.level })}</strong> · {w.stopped ? t('wagon.stopped') : t('wagon.mp', { n: w.mp })}</p>
          <p>{w.cargo && goal ? t('wagon.cargo', { goods: lower(t(`goods.${w.cargo}`)), market: lower(t(`terrain.${goal}`)) }) : t('wagon.empty')}</p>
        </div>
      </div>
      <ul className="build-list">
        <li>
          <button type="button" className="build-item" data-wagon="move" disabled={!canMove} onClick={() => { setMode({ k: 'wagon' }); onClose(); }}>
            <span className="build-icon">{icon(<WagonShape color={color} level={w.level} cargo={null} />)}</span>
            <span className="build-text"><span className="build-name">{t('wagon.move')}</span></span>
          </button>
        </li>
        <li>
          <button type="button" className="build-item" data-wagon="boost" disabled={!Traders.canBoost(view, me)} onClick={() => send({ t: 'wagonBoost' })}>
            <span className="build-icon"><CardIcon card="grain" size={34} /></span>
            <span className="build-text"><span className="build-name">{t('wagon.boost')}</span></span>
          </button>
        </li>
        {next && (
          <li>
            <button type="button" className="build-item" data-wagon="up" disabled={!Traders.canUpgrade(view, me)} onClick={() => send({ t: 'wagonUp' })}>
              <span className="build-icon">{icon(<WagonShape color={color} level={w.level + 1} cargo={null} />)}</span>
              <span className="build-text">
                <span className="build-name">{t('wagon.up', { n: w.level + 1 })}</span>
                <span className="build-cost"><HandLine hand={next.cost} /></span>
                <span className="hint">{t('wagon.upHint')}</span>
              </span>
            </button>
          </li>
        )}
        {drive.map((e) => (
          <li key={e}>
            <button type="button" className="build-item" data-wagon="drive" onClick={() => { send({ t: 'drive', edge: e }); onClose(); }}>
              <span className="build-text">
                <span className="build-name">{t('wagon.drive')}</span>
                <span className="hint">{t('wagon.driveHint', { dice: orList(lv.drive) })}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!next && <p>{t('wagon.max')}</p>}
      {!lv.drive.length && <p className="muted small">{t('wagon.noDrive')}</p>}
      <table className="wagon-levels">
        <thead>
          <tr>
            <th scope="col">{t('wagon.col.level')}</th>
            <th scope="col">{t('wagon.col.mp')}</th>
            <th scope="col">{t('wagon.col.gold')}</th>
            <th scope="col">{t('wagon.col.drive')}</th>
            <th scope="col">{t('wagon.col.cost')}</th>
          </tr>
        </thead>
        <tbody>
          {Traders.LEVELS.map((l, i) => (
            <tr key={i} className={i + 1 === w.level ? 'on' : ''}>
              <td>{i + 1}</td>
              <td>{l.mp}</td>
              <td>{l.gold}</td>
              <td>{l.drive.length > 1 ? `${l.drive[0]}–${l.drive[l.drive.length - 1]}` : l.drive.length ? l.drive[0] : '—'}</td>
              <td>{i ? <HandLine hand={l.cost} /> : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">{t('wagon.costHint')}</p>
    </Modal>
  );
}

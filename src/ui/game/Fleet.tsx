import { useT } from '../../app/i18n';
import * as X from '../../engine/mods/expedition';
import type { Action, Cargo, GameState } from '../../engine/types';
import { CargoIcon, ShipShape } from '../art';
import { HandLine, Modal } from '../common';
import type { Mode } from './plan';

/** Barcos de expedición: dónde están, qué llevan y qué pueden hacer ahora. */
export function FleetSheet({ view, me, send, setMode, onClose }: { view: GameState; me: number; send: (a: Action) => void; setMode: (m: Mode) => void; onClose: () => void }) {
  const t = useT();
  const ships = X.shipsOf(view, me);
  const color = view.players[me].color;
  const main = view.turn.phase === 'main' && view.turn.current === me && !view.steps.length;
  const hold = X.holdOf(view, me);
  const go = (m: Mode) => { setMode(m); onClose(); };
  const act = (a: Action) => { send(a); };
  const adv = view.expedition?.adv[me] ?? [];
  return (
    <Modal title={t('fleet.title')} onClose={onClose} wide>
      {!ships.length && <p className="muted">{t('fleet.none')}</p>}
      <ul className="fleet-list">
        {ships.map((sh, i) => {
          const reach = main ? X.reach(view, sh.id).size : 0;
          const found = main ? X.foundSpots(view, sh.id) : [];
          const fish = main ? X.fishSpots(view, sh.id) : [];
          const crew = main ? X.crewSpots(view, sh.id) : [];
          const port = X.inPort(view, sh);
          const slots: (Cargo | null)[] = [...sh.cargo, ...Array<null>(Math.max(0, hold - sh.cargo.length)).fill(null)];
          return (
            <li key={sh.id} className="fleet-ship" data-ship={sh.id}>
              <div className="fleet-head">
                <svg width={44} height={40} viewBox="-16 -18 32 30" aria-hidden="true"><ShipShape color={color} /></svg>
                <div>
                  <strong>{t('fleet.ship', { n: i + 1 })}</strong>
                  <span className="muted"> · {t('fleet.mp', { n: main ? sh.mp : X.moveOf(view, me) })}{port ? ` · ${t('fleet.inPort')}` : ''}</span>
                  <div className="fleet-cargo" aria-label={t('fleet.cargo')}>
                    {slots.map((c, k) => (
                      <svg key={k} width={22} height={22} viewBox="-7 -7 14 14" className={c ? '' : 'empty'}>
                        {c ? <CargoIcon cargo={c} color={color} /> : <circle r={5.6} className="cargo-disc empty" />}
                        {c && <title>{t(`cargo.${c}`)}</title>}
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <div className="fleet-actions">
                <button type="button" className="btn secondary sm" data-x="sail" disabled={!reach} onClick={() => go({ k: 'sail', ship: sh.id })}>{t('fleet.sail')}</button>
                <button type="button" className="btn secondary sm" data-x="pioneer" disabled={!X.canLoad(view, me, sh.id, 'pioneer')} onClick={() => act({ t: 'xload', ship: sh.id, what: 'pioneer' })}>
                  {t('fleet.loadPioneer')} <HandLine hand={X.PIONEER_COST} />
                </button>
                <button type="button" className="btn secondary sm" data-x="crew" disabled={!X.canLoad(view, me, sh.id, 'crew')} onClick={() => act({ t: 'xload', ship: sh.id, what: 'crew' })}>
                  {t('fleet.loadCrew')} <HandLine hand={X.CREW_COST} />
                </button>
                {found.length > 0 && <button type="button" className="btn primary sm" data-x="found" onClick={() => (found.length === 1 ? act({ t: 'found', ship: sh.id, at: found[0] }) : go({ k: 'found', ship: sh.id }))}>{t('fleet.found')}</button>}
                {fish.length > 0 && <button type="button" className="btn primary sm" data-x="fish" onClick={() => act({ t: 'xfish', ship: sh.id, hex: fish[0] })}>{t('fleet.fish')}</button>}
                {main && X.canDeliver(view, sh.id) && <button type="button" className="btn primary sm" data-x="deliver" onClick={() => act({ t: 'xdeliver', ship: sh.id })}>{t('fleet.deliver')}</button>}
                {crew.length > 0 && <button type="button" className="btn primary sm" data-x="mission" onClick={() => (crew.length === 1 ? act({ t: 'xcrew', ship: sh.id, hex: crew[0] }) : go({ k: 'xcrew', ship: sh.id }))}>{t('fleet.crewOff')}</button>}
              </div>
            </li>
          );
        })}
      </ul>
      {adv.length > 0 && <p>{t('fleet.adv')}: {adv.map((a) => t(`adv.${a}`)).join(', ')}</p>}
      <p className="muted small">{t('fleet.hint')}</p>
    </Modal>
  );
}

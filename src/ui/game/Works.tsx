import { useT } from '../../app/i18n';
import * as C from '../../engine/core';
import * as Bastions from '../../engine/mods/bastions';
import * as Works from '../../engine/mods/works';
import { WONDER_COST, WONDER_LEVELS, type Action, type GameState } from '../../engine/types';
import { FortShape, PlayerMark, WonderArt } from '../art';
import { HandLine, Modal } from '../common';

/** Las cinco grandes obras: requisito, costo por nivel, quién la levanta y hasta dónde. */
export function WorksSheet({ view, me, send, onClose }: { view: GameState; me: number | null; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const w = view.works!;
  const mine = me === null ? null : Works.wonderOf(view, me);
  return (
    <Modal title={t('wonder.title')} onClose={onClose} wide>
      <p className="muted small">{t('wonder.goal', { n: view.settings.vpTarget })} {t('wonder.oneEach')}</p>
      <ul className="wonder-list">
        {w.wonders.map((x) => {
          const owner = x.owner === null ? null : view.players[x.owner];
          const can = me !== null && Works.canBuild(view, me, x.id);
          const ownIt = mine?.id === x.id;
          const meets = me !== null && Works.meets(view, me, x.id);
          return (
            <li key={x.id} className={`wonder-item${ownIt ? ' mine' : ''}${owner && !ownIt ? ' taken' : ''}`} data-wonder={x.id}>
              <WonderArt id={x.id} level={x.level} />
              <div>
                <h3>
                  {t(`wonder.${x.id}`)}
                  <span className="wonder-pips" aria-label={t('wonder.level', { n: x.level })}>
                    {Array.from({ length: WONDER_LEVELS }, (_, i) => <i key={i} className={i < x.level ? 'on' : ''} />)}
                  </span>
                </h3>
                <p className="small">{t(`wonder.req.${x.id}`)}{!owner && me !== null && meets && <span className="tag gold"> ✓</span>}</p>
                <p className="small muted">{t('wonder.each')} <HandLine hand={WONDER_COST[x.id]} /></p>
                <p className="small">{owner ? <><PlayerMark color={owner.color} size={14} /> {t('wonder.of', { name: owner.name })} · {t('wonder.level', { n: x.level })}</> : <span className="muted">{t('wonder.free')}</span>}</p>
              </div>
              {me !== null && (!mine || ownIt) && x.level < WONDER_LEVELS && (owner === null || ownIt) && (
                <button type="button" className="btn primary sm" disabled={!can} onClick={() => send({ t: 'wonder', id: x.id })}>
                  {x.owner === null ? t('wonder.start') : t('wonder.build', { n: x.level + 1 })}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}

/** Confirmación del ataque al bastión, con lo que puede pasar. */
export function AssaultSheet({ view, me, send, onClose }: { view: GameState; me: number; send: (a: Action) => void; onClose: () => void }) {
  const t = useT();
  const f = C.fortOf(view, me)!;
  const w = Bastions.warships(view, me);
  return (
    <Modal title={t('act.assault')} onClose={onClose}
      actions={<button type="button" className="btn primary" disabled={!Bastions.canAssault(view, me)} onClick={() => { send({ t: 'assault' }); onClose(); }}>{t('act.assault')}</button>}>
      <div className="assault-row">
        <svg width={64} height={64} viewBox="-16 -22 32 34" aria-hidden="true"><FortShape color={view.players[me].color} chips={f.chips} /></svg>
        <p><strong>{t('player.warships', { n: w })}</strong> · {t('fort.title', { name: view.players[me].name, n: f.chips })}</p>
      </div>
      <p className="small">{t('act.assaultHint')}</p>
    </Modal>
  );
}

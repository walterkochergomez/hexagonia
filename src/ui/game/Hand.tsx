import { useT } from '../../app/i18n';
import { COMMODITIES, RESOURCES, type GameState } from '../../engine/types';
import { CardIcon } from '../art';

export function Hand({ view, me, onCards }: { view: GameState; me: number | null; onCards: () => void }) {
  const t = useT();
  if (me === null) return <div className="hand" />;
  const p = view.players[me];
  const cards = view.settings.guilds ? [...RESOURCES, ...COMMODITIES] : [...RESOURCES];
  const extra = view.settings.guilds ? p.progress.length : p.dev.length;
  return (
    <div className="hand" aria-label={t('act.hand')}>
      <ul className="hand-cards">
        {cards.map((c) => (
          <li key={c} className={`hand-card${p.hand[c] ? '' : ' zero'}`} title={t(`res.${c}`)}>
            <CardIcon card={c} size={34} />
            <span className="n">{p.hand[c]}</span>
            <span className="sr">{t(`res.${c}`)}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="hand-extra" onClick={onCards}>
        <span className="n">{extra}</span>
        <span>{view.settings.guilds ? t('cards.progress') : t('cards.dev')}</span>
      </button>
    </div>
  );
}

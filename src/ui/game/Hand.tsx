import { useT } from '../../app/i18n';
import { COMMODITIES, RESOURCES, type GameState } from '../../engine/types';
import { CardIcon } from '../art';

export function Hand({ view, me, onCards, onGold }: { view: GameState; me: number | null; onCards: () => void; onGold: () => void }) {
  const t = useT();
  if (me === null) return <div className="hand" />;
  const p = view.players[me];
  const cards = view.settings.guilds ? [...RESOURCES, ...COMMODITIES] : [...RESOURCES];
  const extra = view.settings.guilds ? p.progress.length : p.dev.length;
  return (
    <div className="hand" aria-label={t('act.hand')}>
      <ul className="hand-cards">
        {cards.map((c) => (
          <li key={c} className={`hand-card${p.hand[c] ? '' : ' zero'}`} title={t(`res.${c}`)} data-card={c}>
            <CardIcon card={c} size={34} />
            <span className="n">{p.hand[c]}</span>
            <span className="sr">{t(`res.${c}`)}</span>
          </li>
        ))}
      </ul>
      {view.gold && (
        <button type="button" className="hand-extra gold" onClick={onGold}>
          <span className="n">{view.gold[me] ?? 0}</span>
          <span>{t('gold.title')}</span>
        </button>
      )}
      {!view.raid && (
        <button type="button" className="hand-extra" onClick={onCards}>
          <span className="n">{extra}</span>
          <span>{view.settings.guilds ? t('cards.progress') : t('cards.dev')}</span>
        </button>
      )}
    </div>
  );
}

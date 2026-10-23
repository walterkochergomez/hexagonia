import { useT } from '../app/i18n';
import { go } from '../app/router';
import { TopBar } from './TopBar';

const SECTIONS: [string, string[]][] = [
  ['base', ['1', '2', '3', '4', '5', '6', '7']],
  ['five', ['1']],
  ['sea', ['1', '2', '3', '4', '5']],
  ['guilds', ['1', '2', '3', '4', '5', '6']],
  ['combo', ['1']],
  ['online', ['1']],
];

export function Rules() {
  const t = useT();
  return (
    <div className="page">
      <TopBar code={null} onHome={() => go('')} />
      <main className="rules">
        <h1>{t('rules.title')}</h1>
        <p className="lead">{t('rules.intro')}</p>
        {SECTIONS.map(([id, items]) => (
          <section key={id} className="rules-section">
            <h2>{t(`rules.${id}.title`)}</h2>
            {items.map((i) => <p key={i}>{t(`rules.${id}.${i}`)}</p>)}
          </section>
        ))}
        <button type="button" className="btn secondary" onClick={() => history.length > 1 ? history.back() : go('')}>{t('common.back')}</button>
      </main>
    </div>
  );
}

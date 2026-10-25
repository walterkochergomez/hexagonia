import { Fragment, useEffect, type ReactNode } from 'react';
import { useT } from '../../app/i18n';
import { usePrefs } from '../../app/prefs';
import { go } from '../../app/router';
import { PROGRESS_DECKS, type Card, type Track } from '../../engine/types';
import { useManualBook } from '../../manual/load';
import { MANUAL_ORDER, type Block, type CostIcon, type CostRow, type Manual, type ManualBook, type ManualId, type Section } from '../../manual/types';
import { CardBack, CardIcon, CityShape, KnightShape, SettlementShape, ShipShape, WonderArt, CargoIcon } from '../art';
import { TileDefs } from '../tiles';
import { TopBar } from '../TopBar';
import { Cover, Figure } from './figures';

/** `**negrita**` dentro del texto. */
function inline(text: string): ReactNode {
  const parts = text.split('**');
  return parts.map((p, i) => (i % 2 ? <strong key={i}>{p}</strong> : <Fragment key={i}>{p}</Fragment>));
}

function PieceIcon({ icon }: { icon: CostIcon }) {
  if (icon.startsWith('w-')) return <WonderArt id={icon.slice(2)} level={4} size={40} />;
  const c = 0;
  const node = {
    road: <g className={`road p${c}`}><path d="M-12 7 L12 -7" className="road-outline" /><path d="M-12 7 L12 -7" className="road-fill" /><path d="M-12 5.7 L12 -8.3" className="road-shine" /></g>,
    ship: <ShipShape color={c} />,
    settlement: <SettlementShape color={c} />,
    city: <CityShape color={c} />,
    wall: <CityShape color={c} wall />,
    knight: <KnightShape color={c} level={1} active={false} />,
    activate: <KnightShape color={c} level={1} active />,
    promote: <KnightShape color={c} level={2} active />,
    dev: <g transform="translate(-16 -19)"><CardBack size={32} kind="dev" /></g>,
    progress: <g transform="translate(-16 -19)"><CardBack size={32} kind="dev" /></g>,
    pioneer: <g transform="translate(0 -3) scale(2.6)"><CargoIcon cargo="pioneer" color={c} /></g>,
    crew: <g transform="translate(0 -3) scale(2.6)"><CargoIcon cargo="crew" /></g>,
  }[icon as Exclude<CostIcon, `w-${string}`>];
  return <svg width={40} height={40} viewBox="-20 -23 40 40" aria-hidden="true">{node}</svg>;
}

function Costs({ rows }: { rows: CostRow[] }) {
  const t = useT();
  return (
    <ul className="m-costs">
      {rows.map((r) => {
        const cards = (Object.entries(r.cost) as [Card, number][]).flatMap(([c, n]) => Array.from({ length: n }, () => c));
        return (
          <li key={r.label}>
            <span className="m-cost-icon"><PieceIcon icon={r.icon} /></span>
            <span className="m-cost-name">{r.label}</span>
            <span className="m-cost-cards">
              <span className="sr">{(Object.entries(r.cost) as [Card, number][]).map(([c, n]) => `${n} ${t(`res.${c}`)}`).join(', ')}</span>
              {cards.map((c, i) => <CardIcon key={i} card={c} size={30} />)}
            </span>
            {r.note && <span className="m-cost-note">{r.note}</span>}
          </li>
        );
      })}
    </ul>
  );
}

const DEV_COUNTS = (big: boolean): [string, number][] => [['soldier', big ? 20 : 14], ['roads', big ? 3 : 2], ['plenty', big ? 3 : 2], ['monopoly', big ? 3 : 2], ['point', 5]];

function CardTable({ rows }: { rows: [string, number, string][] }) {
  const t = useT();
  return (
    <div className="m-table">
      <table>
        <thead><tr><th scope="col">{t('manual.th.card')}</th><th scope="col" className="num">{t('manual.th.count')}</th><th scope="col">{t('manual.th.effect')}</th></tr></thead>
        <tbody>{rows.map(([name, n, d]) => <tr key={name}><th scope="row">{name}</th><td className="num">{n}</td><td>{d}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function BlockView({ b }: { b: Block }) {
  const t = useT();
  switch (b.t) {
    case 'p': return <p>{inline(b.text)}</p>;
    case 'h3': return <h3>{b.text}</h3>;
    case 'list': return <ul className="m-list">{b.items.map((x, i) => <li key={i}>{inline(x)}</li>)}</ul>;
    case 'steps': return <ol className="m-steps">{b.items.map((x, i) => <li key={i}><span>{inline(x)}</span></li>)}</ol>;
    case 'costs': return <Costs rows={b.rows} />;
    case 'note': return <p className="m-note">{inline(b.text)}</p>;
    case 'fig': return <Figure id={b.id} caption={b.caption} />;
    case 'table':
      return (
        <div className="m-table">
          <table>
            <thead><tr>{b.head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{inline(c)}</th> : <td key={j}>{inline(c)}</td>))}</tr>)}</tbody>
          </table>
        </div>
      );
    case 'devCards':
      return <CardTable rows={DEV_COUNTS(!!b.big).map(([k, n]) => [t(`dev.${k}`), n, t(`dev.${k}.d`)])} />;
    case 'progressCards':
      return <CardTable rows={PROGRESS_DECKS[b.track as Track].map(([k, n]) => [t(`progress.${k}`), n, t(`progress.${k}.d`)])} />;
  }
}

function SectionView({ s }: { s: Section }) {
  return (
    <section className="m-section" id={`m-${s.id}`} aria-labelledby={`m-${s.id}-h`}>
      <h2 id={`m-${s.id}-h`}>{s.title}</h2>
      {s.blocks.map((b, i) => <BlockView key={i} b={b} />)}
    </section>
  );
}

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function ManualView({ m, book }: { m: Manual; book: ManualBook }) {
  const t = useT();
  useEffect(() => { window.scrollTo(0, 0); }, [m.id]);
  const others = MANUAL_ORDER.filter((id) => id !== m.id && book.manuals[id]);
  return (
    <main className="manual">
      <header className="m-hero">
        <Cover id={m.id} label={m.title} />
        <div className="m-hero-text">
          <h1>{m.title}</h1>
          <p className="lead">{m.summary}</p>
          <ul className="m-meta">{m.meta.map((x) => <li key={x}>{x}</li>)}</ul>
          <div className="m-actions">
            <button type="button" className="btn primary" onClick={() => window.print()}>{t('manual.print')}</button>
            {m.id !== 'base' && <a className="btn secondary" href="#/reglas/base">{t('manual.base')}</a>}
            <a className="btn ghost" href="#/reglas">{t('manual.all')}</a>
          </div>
        </div>
      </header>
      <div className={`m-body${m.sections.length > 1 ? '' : ' single'}`}>
        {m.sections.length > 1 && (
          <nav className="m-toc" aria-label={t('manual.contents')}>
            <h2>{t('manual.contents')}</h2>
            <ol>{m.sections.map((s) => <li key={s.id}><a href={`#/reglas/${m.id}`} onClick={scrollTo(`m-${s.id}`)}>{s.title}</a></li>)}</ol>
          </nav>
        )}
        <article className="m-article">
          {m.sections.map((s) => <SectionView key={s.id} s={s} />)}
          <footer className="m-foot">
            <h2>{t('manual.more')}</h2>
            <ul>{others.map((id) => <li key={id}><a href={`#/reglas/${id}`}>{book.manuals[id]!.title}</a></li>)}</ul>
          </footer>
        </article>
      </div>
    </main>
  );
}

function Shelf({ book }: { book: ManualBook }) {
  const t = useT();
  const list = MANUAL_ORDER.filter((id) => book.manuals[id]);
  return (
    <main className="manuals">
      <h1>{t('manual.index')}</h1>
      <p className="lead">{t('manual.indexLead')}</p>
      <ul className="m-shelf">
        {list.map((id) => {
          const m = book.manuals[id]!;
          return (
            <li key={id}>
              <a href={`#/reglas/${id}`} className="m-book">
                <Cover id={id} label={m.title} />
                <span className="m-book-title">{m.title}</span>
                <span className="m-meta m-book-meta">{m.meta.map((x) => <span key={x}>{x}</span>)}</span>
                <span className="m-book-sum">{m.summary}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <div className="m-app">{book.app.map((s) => <SectionView key={s.id} s={s} />)}</div>
      <button type="button" className="btn secondary" onClick={() => (history.length > 1 ? history.back() : go(''))}>{t('common.back')}</button>
    </main>
  );
}

export function Manuals({ id }: { id?: string }) {
  const { lang } = usePrefs();
  const t = useT();
  const book = useManualBook(lang);
  const m = id && book ? book.manuals[id as ManualId] : undefined;
  useEffect(() => {
    document.title = m ? `${m.title} · ${t('app.name')}` : `${t('manual.index')} · ${t('app.name')}`;
    return () => { document.title = t('app.name'); };
  }, [m, t]);
  return (
    <div className="page manual-page">
      <TopBar code={null} onHome={() => go('')} />
      {/* definiciones de las fichas, una sola vez para todas las figuras */}
      <svg className="defs-only" width={0} height={0} aria-hidden="true" focusable="false"><TileDefs /></svg>
      {!book ? <main className="manuals"><p className="muted">{t('manual.loading')}</p></main> : m ? <ManualView m={m} book={book} /> : <Shelf book={book} />}
    </div>
  );
}

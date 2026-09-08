import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { navigate, pageSearch, pages, type PageId } from './pages';
import { LineCards } from '../production/LineCards';

export function PageLink({ page, children, className = '', details = {}, current }: { page: PageId; children: ReactNode; className?: string; details?: Record<string, string>; current?: boolean }) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(page, details);
  };
  return <a href={pageSearch(page, location.search, details)} onClick={click} className={className} aria-current={current ? 'page' : undefined}>{children}</a>;
}
const primary = [['home', 'Home', '⌂'], ['map', 'Map', '▦'], ['assets', 'Assets', '◇'], ['documents', 'Docs', '▤'], ['more', 'More', '•••']] as const;
export default function AppShell({ page, children, navigationKey }: { page: PageId; children: ReactNode; navigationKey: number }) {
  const facility = useFacility();
  const { ready } = useFacilityEditor();
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { scroll.current?.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); document.title = `${pages[page][0]} · Industrial Asset Graph`; }, [page, navigationKey]);
  const group = page === 'asset' ? 'assets' : primary.some(([id]) => id === page) ? page : 'more';
  return <div className={`app-shell app-pages page-${page}`}>
    <a className="page-skip" href="#page-content">Skip to page content</a>
    <header className="page-header"><PageLink page="home" className="page-brand"><span aria-hidden="true">IAG</span><span>Industrial Asset Graph<small>{facility.facility.name}</small></span></PageLink><PageLink page="account" className="page-account-link">Account</PageLink></header>
    <nav className="page-navigation" aria-label="Main navigation">{primary.map(([id, label, icon]) => <PageLink key={id} page={id} current={group === id}><span aria-hidden="true">{icon}</span>{label}</PageLink>)}</nav>
    <div className="page-scroll" ref={scroll} id="page-content" tabIndex={-1}>
      <div className="page-title"><div>{page !== 'home' && <PageLink page={page === 'asset' ? 'assets' : group === 'more' && page !== 'more' ? 'more' : 'home'} className="page-back">← {page === 'asset' ? 'Assets' : group === 'more' && page !== 'more' ? 'More' : 'Home'}</PageLink>}<h1 ref={heading} tabIndex={-1}>{pages[page][0]}</h1><p>{pages[page][1]}</p></div>{page === 'map' && <button type="button" disabled={!ready} onClick={() => dispatchEvent(new CustomEvent('iag-open-map-editor'))}>Edit map</button>}{page === 'assets' && <PageLink page="assetAdd" className="page-primary">Add equipment</PageLink>}</div>
      <div className="page-workspace">{children}</div>
    </div>
  </div>;
}

export function HomePage() {
  const facility = useFacility(); const editor = useFacilityEditor();
  return <main className="simple-home"><LineCards/><section className="home-intro"><span className="page-eyebrow">YOUR FACILITY</span><h2>One task at a time.</h2><p>Find equipment, check a document, or capture something from the floor.</p><PageLink page="field" className="page-primary">Start field documentation →</PageLink></section><div className="home-destinations">{(['map','assets','documents','cabinet'] as PageId[]).map(id => <PageLink page={id} key={id} className="destination-card"><strong>{pages[id][0]} <span aria-hidden="true">↗</span></strong><p>{pages[id][1]}</p><small>{id === 'assets' ? `${facility.assets.length} equipment records` : id === 'documents' ? `${facility.documents.length} documents` : 'Open page'}</small></PageLink>)}</div><section className="home-followup"><div><h2>Continue your work</h2><p>{editor.pendingChanges.length} changes awaiting review · {editor.queuedMutationCount} queued for sync</p><small>{editor.sync.phase === 'LOCAL_ONLY' ? 'Saved on this device. Shared sync is not configured.' : `Sync: ${editor.sync.phase.toLowerCase().replaceAll('_', ' ')}`}</small></div><PageLink page={editor.sync.conflicts.length ? 'conflicts' : 'review'}>Open review →</PageLink></section></main>;
}
const groups: { title: string; ids: PageId[] }[] = [
  { title: 'On the floor', ids: ['lines','documentation','maintenance','dependencies','field','observation','evidence','cabinet','wulftec','relationships'] },
  { title: 'Records & review', ids: ['manage','assetAdd','connection','review','health','conflicts'] },
  { title: 'Workspace', ids: ['database','import','setup','settings','account','help'] },
];
export function MorePage() { return <main className="more-page">{groups.map(group => <section key={group.title}><h2>{group.title}</h2><div className="page-link-list">{group.ids.map(id => <PageLink key={id} page={id}><span><strong>{pages[id][0]}</strong><small>{pages[id][1]}</small></span><span aria-hidden="true">›</span></PageLink>)}</div></section>)}</main>; }

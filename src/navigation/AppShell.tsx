import { useEffect, useRef, type ReactNode, type MouseEvent } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { navigate, pageSearch, pages, type PageId } from './pages';
import { LineCards } from '../production/LineCards';
import PublicationStatus from '../facility/PublicationStatus';
import { useFacilityGuide } from '../features/facility-guide';
import { GuideReminder } from '../features/facility-guide/GuideReminder';
import SectionPicker from './SectionPicker';
import MachineParts from '../inventory/MachineParts';
import { toolGroups, toolGroupFor } from './toolGroups';

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
  const guide = useFacilityGuide();
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { scroll.current?.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); document.title = `${pages[page][0]} · Industrial Asset Graph`; }, [page, navigationKey]);
  const group = page === 'asset' ? 'assets' : primary.some(([id]) => id === page) ? page : 'more';
  return <div className={`app-shell app-pages page-${page}`}>
    <a className="page-skip" href="#page-content">Skip to page content</a>
    <header className="page-header"><PageLink page="home" className="page-brand"><span aria-hidden="true">IAG</span><span>Industrial Asset Graph<small>{facility.facility.name}</small></span></PageLink><PageLink page="account" className="page-account-link">Account</PageLink></header>
    <nav className="page-navigation" aria-label="Main navigation">{primary.map(([id, label, icon]) => <PageLink key={id} page={id} current={group === id}><span aria-hidden="true">{icon}</span>{id === 'documents' ? <><span className="nav-wide-label">Documents</span><span className="nav-short-label">Docs</span></> : label}</PageLink>)}</nav>
    <div className="page-scroll" ref={scroll} id="page-content" tabIndex={-1}>
      <div className="page-title"><div>{page !== 'home' && <PageLink page={page === 'asset' ? 'assets' : group === 'more' && page !== 'more' ? 'more' : 'home'} details={toolGroupFor(page) ? { tools: toolGroupFor(page)!.id } : {}} className="page-back">← {page === 'asset' ? 'Assets' : group === 'more' && page !== 'more' ? 'More' : 'Home'}</PageLink>}<h1 ref={heading} tabIndex={-1}>{pages[page][0]}</h1><p>{pages[page][1]}</p></div><div className="page-title-actions">{page === 'map' && <button type="button" disabled={!ready} onClick={() => dispatchEvent(new CustomEvent('iag-open-map-editor'))}>Edit map</button>}{page === 'assets' && <PageLink page="assetAdd" className="page-primary">Add equipment</PageLink>}
      {page !== 'help' && <button type="button" onClick={() => {
        const p = new URLSearchParams(location.search);
        guide.setOpen(true);
        navigate('help', { from: page, asset: p.get('asset') ?? (page === 'cabinet' ? facility.featureConfig.featuredCabinetAssetId ?? '' : ''), area: p.get('area') ?? '', connection: p.get('connection') ?? '', edit: p.get('edit') ?? '' });
      }}>Ask Genie <span aria-hidden="true">↗</span></button>}</div></div>
      <div className="page-workspace"><GuideReminder/><PublicationStatus/>{['component','cabinet','wulftec','relationships','maintenance','documentation'].includes(page) && <MachineParts assetId={new URLSearchParams(location.search).get('asset') ?? (page === 'cabinet' ? facility.featureConfig.featuredCabinetAssetId : page === 'wulftec' ? facility.featureConfig.featuredMachineAssetId : facility.components.find(c => c.id === new URLSearchParams(location.search).get('component'))?.parentId)}/> }{children}</div>
    </div>
  </div>;
}

const homeTasks = [
  { page: 'inventory', title: 'Find a part', detail: 'Find spares, take photos, and check stock.' },
  { page: 'assets', title: 'Find an asset', detail: 'Search equipment and open its record.' },
  { page: 'map', title: 'Map', detail: 'Locate equipment and explore an area.' },
  { page: 'documents', title: 'Documents', detail: 'Open manuals, drawings and photos.' },
  { page: 'observation', title: 'Notes', detail: 'Record a finding from the floor.' },
  { page: 'relationships', title: 'Troubleshooting', detail: 'Follow documented connections.' },
  { page: 'field', title: 'Field documentation', detail: 'Check equipment and attach evidence.' },
] as const;

export function HomePage() {
  const facility = useFacility();
  const editor = useFacilityEditor();
  return <main className="simple-home">
    <section className="home-intro"><span className="page-eyebrow">{facility.facility.name}</span><h2>What do you need to do?</h2><p>Choose a task to get started.</p></section>
    <div className="home-destinations">{homeTasks.map(task => <PageLink page={task.page} key={task.page} className="destination-card"><strong>{task.title}<span aria-hidden="true">↗</span></strong><p>{task.detail}</p></PageLink>)}</div>
    <section className="home-followup"><div><h2>Continue your work</h2><p>{editor.pendingChanges.length} changes awaiting review · {editor.queuedMutationCount} queued for sync</p><small>{editor.publication.phase !== 'DISABLED' ? editor.publication.message : editor.sync.phase === 'LOCAL_ONLY' ? 'Saved on this device. Shared sync is not configured.' : `Sync: ${editor.sync.phase.toLowerCase().replaceAll('_', ' ')}`}</small></div><PageLink page={editor.sync.conflicts.length ? 'conflicts' : 'review'}>Open review →</PageLink></section>
    <LineCards/>
    <PageLink page="cabinet" className="destination-card"><strong>Control cabinet ↗</strong><p>Explore the drawing and select a device.</p></PageLink>
  </main>;
}

export function MorePage() {
  const selected = new URLSearchParams(location.search).get('tools');
  const group = toolGroups.find(item => item.id === selected) ?? toolGroups[0];
  return <main className="more-page">
    <SectionPicker label="Choose a tool group" options={toolGroups} value={group.id} onChange={tools => navigate('more', { tools })}/>
    <section aria-label={group.label}><h2>{group.label}</h2><p>{group.description}</p><div className="page-link-list">{group.ids.map(id => <PageLink key={id} page={id}><span><strong>{id === 'observation' ? 'Notes' : pages[id][0]}</strong><small>{pages[id][1]}</small></span><span aria-hidden="true">›</span></PageLink>)}</div></section>
    {group.id === 'advanced' && <section><h2>Deployed source files</h2><div className="page-link-list"><a href={`${import.meta.env.BASE_URL}facility-content/lieb-foods/index.html`}><span><strong>Recovered plant evidence</strong><small>Source register, conflicts and field tasks.</small></span><span aria-hidden="true">↗</span></a><a href={`${import.meta.env.BASE_URL}assets/evidence/index.html`} target="_blank" rel="noreferrer"><span><strong>Evidence archive</strong><small>KOSME photos, OEM pages, CR22/CR30 packets, Wulftec master packet, and plant dossier.</small></span><span aria-hidden="true">↗</span></a></div></section>}
  </main>;
}

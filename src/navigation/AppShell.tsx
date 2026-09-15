import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { navigate, pageSearch, pages, type PageId } from './pages';
import PublicationStatus from '../facility/PublicationStatus';
import { useFacilityGuide } from '../features/facility-guide';
import { GuideReminder } from '../features/facility-guide/GuideReminder';
import SectionPicker from './SectionPicker';
import { toolGroups, toolGroupFor } from './toolGroups';

export function PageLink({ page, children, className = '', details = {}, current }: { page: PageId; children: ReactNode; className?: string; details?: Record<string, string>; current?: boolean }) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); navigate(page, details);
  };
  return <a href={pageSearch(page, location.search, details)} onClick={click} className={className} aria-current={current ? 'page' : undefined}>{children}</a>;
}
export default function AppShell({ page, children, navigationKey }: { page: PageId; children: ReactNode; navigationKey: number }) {
  const facility = useFacility();
  const editor = useFacilityEditor();
  const guide = useFacilityGuide();
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const context = new URLSearchParams(location.search);
  const assetId = context.get('asset') ?? '';
  const machine = facility.assets.find(a => a.id === assetId);
  const work = ['repairs','repair','repairSummary','submission'].includes(page);
  const backPage: PageId = ['repair','repairSummary'].includes(page) ? (machine ? 'machine' : 'repairs') : page === 'machine' ? 'assets' : toolGroupFor(page) && !['assets','documents','map','inventory'].includes(page) ? 'more' : 'home';
  const title = page === 'machine' && machine ? machine.name : pages[page][0];
  useEffect(() => { scroll.current?.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); document.title = title + ' · Industrial Asset Graph'; }, [title, navigationKey]);
  return <div className={'app-shell app-pages page-' + page}>
    <a className="page-skip" href="#page-content">Skip to page content</a>
    <header className="page-header"><PageLink page="home" className="page-brand"><span aria-hidden="true">IAG</span><span>Industrial Asset Graph<small>{facility.facility.name}</small></span></PageLink><PageLink page="account" className="page-account-link">Account</PageLink></header>
    <nav className="page-navigation" aria-label="Main navigation"><PageLink page="home" current={!work}>Directory</PageLink><PageLink page="repairs" current={work}>My work</PageLink></nav>
    <div className="page-scroll" ref={scroll} id="page-content" tabIndex={-1}>
      <div className="page-title"><div>{page !== 'home' && <PageLink page={backPage} details={backPage === 'machine' ? {asset:assetId} : toolGroupFor(page) ? {tools:toolGroupFor(page)!.id} : {}} className="page-back">← {backPage === 'machine' ? 'Machine' : backPage === 'assets' ? 'Equipment' : backPage === 'more' ? 'More' : backPage === 'repairs' ? 'My work' : 'Directory'}</PageLink>}{machine && page !== 'machine' && <p className="machine-context">{machine.name}</p>}<h1 ref={heading} tabIndex={-1}>{title}</h1>{pages[page][1] && <p>{pages[page][1]}</p>}</div><div className="page-title-actions">
      {page === 'map' && editor.currentUser?.role === 'admin' && <button type="button" disabled={!editor.ready} onClick={() => dispatchEvent(new CustomEvent('iag-open-map-editor'))}>Edit map</button>}
      {page === 'assets' && editor.currentUser?.role === 'admin' && <PageLink page="assetAdd" className="page-primary">Add equipment</PageLink>}
      {!['home','machine','repair','repairSummary','inbox','submission','admin','repairs','help'].includes(page) && <button type="button" onClick={() => {
        guide.setOpen(true); navigate('help', { from: page, asset: assetId || (page === 'cabinet' ? facility.featureConfig.featuredCabinetAssetId ?? '' : ''), area: context.get('area') ?? '', connection: context.get('connection') ?? '', edit: context.get('edit') ?? '' });
      }}>Ask Genie <span aria-hidden="true">↗</span></button>}</div></div>
      <div className="page-workspace">{<GuideReminder/>}{['admin','conflicts','review'].includes(page) ? <PublicationStatus/> : ['ERROR','CONFLICT'].includes(editor.publication.phase) && <PageLink page="conflicts" className="sync-attention">Shared save needs attention →</PageLink>}{children}{editor.currentUser?.role==='admin'&&['map','evidence','database','manage'].includes(page)&&<details className="slate-sync-detail"><summary>Shared save status</summary><PublicationStatus/></details>}</div>
    </div>
  </div>;
}
const homeTasks = [
  {page:'assets',title:'Equipment'}, {page:'repairs',title:'Repairs'},
  {page:'inventory',title:'Inventory'}, {page:'documents',title:'Documents'},
  {page:'map',title:'Facility Map'}, {page:'admin',title:'Administration'},
] as const;
export function HomePage() {
  const [query,setQuery] = useState('');
  return <main className="simple-home">
    <form className="directory-search" onSubmit={e=>{e.preventDefault();navigate('assets',{q:query});}}><label className="sr-only" htmlFor="directory-search">Search equipment, parts, and documents</label><input id="directory-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search equipment, parts…"/><button type="submit">Search</button></form>
    <div className="home-destinations">{homeTasks.map(task=><PageLink page={task.page} key={task.page} className="destination-card"><strong>{task.title}<span aria-hidden="true">›</span></strong></PageLink>)}</div>
    <PageLink page="repair" className="slate-text-link">Quick note or photo →</PageLink>
    <PageLink page="more" className="slate-text-link">Tools, account & help →</PageLink>
  </main>;
}
export function MorePage() {
  const selected = new URLSearchParams(location.search).get('tools');
  const group = toolGroups.find(item => item.id === selected) ?? toolGroups[0];
  return <main className="more-page">
    <SectionPicker label="Choose a tool group" options={toolGroups} value={group.id} onChange={tools => navigate('more', { tools })}/>
    <section aria-label={group.label}><h2>{group.label}</h2><p>{group.description}</p><div className="page-link-list">{group.ids.map(id => <PageLink key={id} page={id}><span><strong>{id === 'observation' ? 'Notes' : pages[id][0]}</strong><small>{pages[id][1]}</small></span><span aria-hidden="true">›</span></PageLink>)}</div></section>
    {group.id === 'advanced' && <section><h2>Deployed source files</h2><div className="page-link-list"><a href={import.meta.env.BASE_URL + 'facility-content/lieb-foods/index.html'}><span><strong>Recovered plant evidence</strong><small>Source register, conflicts and field tasks.</small></span><span aria-hidden="true">↗</span></a><a href={import.meta.env.BASE_URL + 'assets/evidence/index.html'} target="_blank" rel="noreferrer"><span><strong>Evidence archive</strong><small>Original plant and OEM sources.</small></span><span aria-hidden="true">↗</span></a></div></section>}
  </main>;
}

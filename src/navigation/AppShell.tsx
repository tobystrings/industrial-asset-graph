import { useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { useFacility, useFacilityEditor } from '../facility';
import { navigate, navigateBack, backDestination, backLabel, rememberScroll, pageSearch, pages, type PageId } from './pages';
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
  const [,refreshContext] = useState(0);
  useEffect(() => {
    const refresh = () => refreshContext(value=>value+1);
    addEventListener('iag-navigation-context',refresh);
    return () => removeEventListener('iag-navigation-context',refresh);
  },[]);
  const heading = useRef<HTMLHeadingElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | undefined>(undefined);
  const context = new URLSearchParams(location.search);
  const assetId = context.get('asset') ?? '';
  const machine = facility.assets.find(a => a.id === assetId);
  const work = ['repairs','repair','repairSummary','submission'].includes(page);
  const back = backDestination(location.search,history.state);
  const selectedDocument = page === 'machine' && context.get('section') === 'manuals'
    ? facility.documents.find(document => document.id === context.get('doc') && document.assetId === assetId)
    : undefined;
  const title = selectedDocument?.title ?? (page === 'machine' && machine ? machine.name : pages[page][0]);
  useEffect(() => {
    const top = history.state?.iagScroll ?? 0;
    const pane = scroll.current;
    heading.current?.focus({ preventScroll: true });
    document.title = title + ' · Industrial Asset Graph';
    if (!pane) return;
    // Lazy workspaces may not have their full height on the first render.
    const restore = () => pane.scrollTo(0,top);
    restore();
    const observer = new MutationObserver(restore);
    if (top > 0) observer.observe(pane,{childList:true,subtree:true});
    const stop = () => observer.disconnect();
    pane.addEventListener('wheel',stop,{once:true});
    pane.addEventListener('touchstart',stop,{once:true});
    const timer = window.setTimeout(stop,2000);
    return () => { stop(); clearTimeout(timer); clearTimeout(scrollTimer.current); pane.removeEventListener('wheel',stop); pane.removeEventListener('touchstart',stop); };
  }, [title, navigationKey]);
  return <div className={'app-shell app-pages page-' + page}>
    <a className="page-skip" href="#page-content">Skip to page content</a>
    <header className="page-header"><PageLink page="home" className="page-brand"><span aria-hidden="true">IAG</span><span>Industrial Asset Graph<small>{facility.facility.name}</small></span></PageLink><PageLink page="account" className="page-account-link">Account</PageLink></header>
    <nav className="page-navigation" aria-label="Main navigation"><PageLink page="home" current={!work}>Directory</PageLink><PageLink page="repairs" current={work}>My work</PageLink></nav>
    <div className="page-scroll" ref={scroll} id="page-content" tabIndex={-1} onScroll={event=>{
      const top=event.currentTarget.scrollTop, route=location.search;
      clearTimeout(scrollTimer.current);
      scrollTimer.current=window.setTimeout(()=>{if(location.search===route)rememberScroll(top);},250);
    }}>
      <div className="page-title"><div>{page !== 'home' && <a href={back.search} className="page-back" onClick={event=>{if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigateBack();}}>← {backLabel(back.search)}</a>}{machine && !['machine','asset','maintenance','field'].includes(page) && <p className="machine-context">{machine.name}</p>}<h1 ref={heading} tabIndex={-1}>{title}</h1>{pages[page][1] && <p>{pages[page][1]}</p>}</div><div className="page-title-actions">
      {page === 'assets' && editor.currentUser?.role === 'admin' && <PageLink page="assetAdd" className="page-primary">Add equipment</PageLink>}
</div></div>
      <div className="page-workspace">{<GuideReminder/>}{['ERROR','CONFLICT'].includes(editor.publication.phase) && <PageLink page="conflicts" className="sync-attention">Shared save needs attention →</PageLink>}{children}<div className="page-help-action">{!['map','home','machine','repair','repairSummary','inbox','submission','admin','repairs','help'].includes(page) && <button type="button" onClick={() => {
        guide.setOpen(true); navigate('help', { from: page, asset: assetId || (page === 'cabinet' ? facility.featureConfig.featuredCabinetAssetId ?? '' : ''), area: context.get('area') ?? '', connection: context.get('connection') ?? '', edit: context.get('edit') ?? '' });
      }}>Ask Genie <span aria-hidden="true">↗</span></button>}</div>{page === 'map' && <section className="slate-workspace map-secondary-actions" aria-label="More map options"><h2>More map options</h2>      {page === 'map' && facility.areas.filter(a=>a.visible===false&&a.assetIds.length>0).map(a=><PageLink key={a.id} page="area" details={{area:a.id,tab:'record'}} className="page-primary map-unplaced-link">{a.name} equipment</PageLink>)}
      {page === 'map' && editor.currentUser?.role === 'admin' && <button type="button" disabled={!editor.ready} onClick={() => { dispatchEvent(new CustomEvent('iag-open-map-editor')); scroll.current?.scrollTo(0,0); }}>Edit map</button>}
<PageLink page="help" details={{from:'map'}} className="slate-card">Get help with the map →</PageLink></section>}{(['admin','conflicts','review'].includes(page)||(editor.currentUser?.role==='admin'&&['map','evidence','database','manage'].includes(page)))&&<details className="slate-sync-detail" open={['ERROR','CONFLICT'].includes(editor.publication.phase) || undefined}><summary>Shared save status</summary><PublicationStatus/></details>}</div>
    </div>
  </div>;
}
const homeTasks = [
  {page:'assets',title:'Equipment',description:'Find a machine and choose what you need.'},
  {page:'repairs',title:'Repairs',description:'Start a repair or pick up where you left off.'},
  {page:'inventory',title:'Inventory',description:'Find a spare part and check stock.'},
  {page:'documents',title:'Documents',description:'Open a manual, drawing, or saved file.'},
  {page:'map',title:'Facility Map',description:'Choose an area to see its equipment.'},
  {page:'admin',title:'Administration',description:'Review submissions and manage the plant.'},
] as const;
export function HomePage() {
  const [query,setQuery] = useState('');
  return <main className="simple-home">
    <h2 className="home-prompt">What do you need to do?</h2>
    <form className="directory-search" onSubmit={e=>{e.preventDefault();navigate('assets',{q:query});}}><label className="sr-only" htmlFor="directory-search">Search equipment, parts, and documents</label><input id="directory-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search equipment, parts…"/><button type="submit">Search</button></form>
    <div className="home-destinations">{homeTasks.map(task=><PageLink page={task.page} key={task.page} className="destination-card"><strong>{task.title}<span aria-hidden="true">›</span></strong><p>{task.description}</p></PageLink>)}</div>
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
    {group.id === 'advanced' && <section><h2>Deployed source files</h2><div className="page-link-list"><a href={import.meta.env.BASE_URL + 'facility-content/lieb-foods/browse.html'}><span><strong>Recovered plant evidence</strong><small>Source register, conflicts and field tasks.</small></span><span aria-hidden="true">↗</span></a><a href={import.meta.env.BASE_URL + 'assets/evidence/index.html'} target="_blank" rel="noreferrer"><span><strong>Evidence archive</strong><small>Original plant and OEM sources.</small></span><span aria-hidden="true">↗</span></a></div></section>}
  </main>;
}

export const pages = {
  machine: ['Machine', ''],
  repairs: ['My work', 'Repairs, notes, and submissions.'],
  repair: ['Repair', ''],
  repairSummary: ['Finish repair', 'Review your summary before submitting.'],
  admin: ['Administration', ''],
  inbox: ['Review Inbox', 'Review original submissions and proposed changes.'],
  submission: ['Review submission', ''],
  requests: ['App-change requests', 'Approved requests follow the code-review and release process.'],
  inventory: ['Parts Inventory', 'Find spares, capture labels, and account for stock.'],
  history: ['Historical evidence', 'Review recovered sources, uncertainties and field tasks.'],
  lines: ['Production lines', 'Document equipment, flow and shared systems.'],
  documentation: ['Documentation queue', 'Prioritize field knowledge and survey missing facts.'],
  maintenance: ['Equipment field sheet', 'Line membership, dependencies and service history.'],
  dependencies: ['Dependency records', 'Capture typed connections and their evidence.'],
  home: ['Directory', ''],
  map: ['Map', 'Find an area or a piece of equipment.'],
  assets: ['Equipment', 'Find a machine by name.'],
  asset: ['Asset record', 'Equipment details and supporting evidence.'],
  area: ['Area details', 'Documented equipment and field observations for this area.'],
  documents: ['Documents', 'Manuals, drawings, and evidence in one library.'],
  cabinet: ['Control cabinet', 'Explore the drawing and select a device.'],
  wulftec: ['Wulftec 3D model', 'Rotate the WCRT-200 and explore its assemblies.'],
  component: ['Component record', 'Documented identity, evidence, and connections.'],
  field: ['Field documentation', 'Capture what you see and keep its source.'],
  relationships: ['Troubleshooting', 'Follow documented connections.'],
  more: ['More', 'Capture, review, and manage your workspace.'],
  account: ['Account', 'Your username, password, and passkeys.'],
  review: ['Review changes', 'Compare proposed changes before approving them.'],
  assetAdd: ['Add equipment', 'Record a known asset.'],
  manage: ['Manage assets', 'Update existing equipment records.'],
  connection: ['Connections', 'Document a relationship and its evidence.'],
  evidence: ['Attach evidence', 'Keep photos and files with their equipment.'],
  observation: ['Record a finding', 'Save a field observation for review.'],
  setup: ['Plant setup', 'Facility details and map configuration.'],
  database: ['Plant database', 'Backups and private equipment packages.'],
  settings: ['Settings', 'Display, accessibility, and map preferences.'],
  conflicts: ['Resolve sync conflicts', 'Compare local and shared versions.'],
  health: ['Data health', 'Find gaps that need verification.'],
  import: ['Import records', 'Preview a CSV before adding its records.'],
  help: ['Guide & training', 'Get help with the workspace or open the project tour.'],
} as const;
export type PageId = keyof typeof pages;
const managerPages: Record<string, PageId> = { overview: 'more', asset: 'assetAdd', manage: 'manage', relationship: 'connection', evidence: 'evidence', observation: 'observation', setup: 'setup', database: 'database', users: 'account', settings: 'settings', conflicts: 'conflicts', health: 'health', import: 'import' };
export function readPage(search: string): PageId {
  const p = new URLSearchParams(search);
  const page = p.get('page');
  if (page && Object.hasOwn(pages, page)) return page as PageId;
  if (p.has('manager')) return managerPages[p.get('manager')!] ?? 'more';
  if (p.get('field') === '1') return 'field';
  if (p.has('trace') || p.get('command') === 'trace') return 'relationships';
  const view = p.get('view');
  if (view === 'assets' || view === 'documents' || view === 'cabinet') return view;
  if (view === 'film' || p.get('film') === '1') return 'help';
  if (p.has('area') || p.has('asset') || p.has('map')) return 'map';
  return 'home';
}
export function pageSearch(page: PageId, current = '', details: Record<string, string> = {}): string {
  const previous = new URLSearchParams(current);
  const p = new URLSearchParams({ page });
  const facility = previous.get('facilityId');
  if (facility) p.set('facilityId', facility);
  for (const [key, value] of Object.entries(details)) if (value) p.set(key, value);
  return `?${p}`;
}
export function parentSearch(current: string): string {
  const p = new URLSearchParams(current), page = readPage(current);
  const details = Object.fromEntries(['asset','work','area','image','facilityId'].flatMap(key => p.get(key) ? [[key,p.get(key)!]] : []));
  const target = (page: PageId, extra: Record<string,string> = {}) => pageSearch(page, current, {...details,...extra});
  if (page === 'machine') {
    if (p.has('doc')) return target('machine', {section:'manuals'});
    if (p.has('section')) return target('machine');
    return pageSearch('assets', current);
  }
  if (page === 'repairSummary') return target('repair');
  if (page === 'repair') return p.has('asset') ? target('machine') : pageSearch('repairs',current);
  if (page === 'submission') return pageSearch('inbox',current);
  if (page === 'inbox' || page === 'requests') return pageSearch('admin',current);
  if (page === 'documents' && p.has('doc')) return target('documents', {docState:p.get('docState') ?? ''});
  if (page === 'cabinet' && p.has('component')) return target('cabinet');
  if (page === 'inventory' && p.has('part')) return target('inventory');
  if (page === 'lines' && p.has('line')) return pageSearch('lines',current);
  if (['component','asset','maintenance','evidence','manage','wulftec','cabinet'].includes(page) && p.has('asset')) return target('machine');
  if (page === 'area') return pageSearch('map',current, {area:p.get('area') ?? ''});
  const groups: Partial<Record<PageId,string>> = {
    field:'everyday',relationships:'everyday',cabinet:'everyday',lines:'everyday',documentation:'everyday',maintenance:'everyday',wulftec:'everyday',help:'everyday',observation:'everyday',
    manage:'records',assetAdd:'records',connection:'records',dependencies:'records',review:'records',health:'records',conflicts:'records',history:'records',
    setup:'admin',account:'admin',settings:'admin',database:'advanced',import:'advanced',
  };
  return groups[page] ? pageSearch('more',current,{tools:groups[page]!}) : pageSearch('home',current);
}

export function backLabel(search: string): string {
  const p = new URLSearchParams(search), page = readPage(search);
  if (page === 'machine' && p.has('section')) {
    const labels: Record<string,string> = {overview:'Overview',troubleshooting:'Troubleshooting',history:'Repair history',electrical:'Electrical',controls:'Controls',parts:'Parts',manuals:'Manuals',photos:'Photos'};
    return labels[p.get('section')!] ?? 'Machine';
  }
  return pages[page][0];
}

export function backDestination(current: string, state: unknown): {search:string; recorded:boolean} {
  const previous = (state as {iagPrevious?:unknown} | null)?.iagPrevious;
  if (typeof previous === 'string' && previous.startsWith('?') && previous !== current &&
      new URLSearchParams(previous).get('facilityId') === new URLSearchParams(current).get('facilityId')) {
    return {search:previous,recorded:true};
  }
  return {search:parentSearch(current),recorded:false};
}

export function rememberScroll(top: number) {
  history.replaceState({...history.state,iagScroll:top},'');
}

export function navigateBack() {
  const destination = backDestination(location.search,history.state);
  if (destination.recorded) { history.back(); return; }
  // A direct link has no in-app predecessor. Go up without leaving the app.
  history.replaceState({iagScroll:0},'',`${location.pathname}${destination.search}`);
  dispatchEvent(new PopStateEvent('popstate'));
}

export function navigate(page: PageId, details: Record<string, string> = {}) {
  const search = pageSearch(page,location.search,details);
  if (search === location.search) return;
  pushPageSearch(search);
  dispatchEvent(new PopStateEvent('popstate'));
}

/** Internal panels can add a history entry without remounting unfinished forms. */
export function pushPageSearch(search: string) {
  rememberScroll(document.querySelector('.page-scroll')?.scrollTop ?? 0);
  history.pushState({iagPrevious:location.search || '?page=home',iagScroll:0}, '', `${location.pathname}${search}`);
  dispatchEvent(new Event('iag-navigation-context'));
}

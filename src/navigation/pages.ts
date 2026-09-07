export const pages = {
  home: ['Home', 'Choose what you want to work on.'],
  map: ['Map', 'Find an area or a piece of equipment.'],
  assets: ['Assets', 'Find equipment and open its record.'],
  asset: ['Asset record', 'Equipment details and supporting evidence.'],
  area: ['Area details', 'Documented equipment and field observations for this area.'],
  documents: ['Documents', 'Manuals, drawings, and evidence in one library.'],
  cabinet: ['Control cabinet', 'Explore the drawing and select a device.'],
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
export function navigate(page: PageId, details: Record<string, string> = {}) {
  history.pushState(null, '', `${location.pathname}${pageSearch(page, location.search, details)}`);
  dispatchEvent(new PopStateEvent('popstate'));
}

import type { PageId } from './pages';

export const toolGroups = [
  { id: 'everyday', label: 'Everyday tasks', description: 'Capture a note, find equipment information, or follow a documented connection.', ids: ['observation', 'field', 'evidence', 'relationships', 'cabinet', 'lines', 'documentation', 'maintenance', 'wulftec', 'help'] },
  { id: 'records', label: 'Records & review', description: 'Update records and check proposed changes.', ids: ['manage', 'assetAdd', 'connection', 'dependencies', 'review', 'health', 'conflicts', 'history'] },
  { id: 'admin', label: 'Admin', description: 'Facility setup, account access and display preferences.', ids: ['setup', 'account', 'settings'] },
  { id: 'advanced', label: 'Advanced Tools', description: 'Import records, make backups, and browse source archives.', ids: ['database', 'import'] },
] as const satisfies readonly { id: string; label: string; description: string; ids: readonly PageId[] }[];

export function toolGroupFor(page: PageId) {
  return toolGroups.find(group => (group.ids as readonly PageId[]).includes(page));
}

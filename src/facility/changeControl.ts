import type { FacilityPackage } from './types';

const IDENTITY_KEY = 'iag-change-control-user';
const ADMIN_HASH_KEY = 'iag-change-control-admin-hash';
const CHANGES_KEY = 'iag-change-control-pending-changes';
const AUDIT_KEY = 'iag-change-control-audit-log';

export type IagUser = { name: string; role: 'technician' | 'admin' };
export type PendingChange = {
  id: string;
  entityId: string;
  reason: string;
  proposedBy: string;
  proposedAt: string;
  next: FacilityPackage;
};
export type AuditEvent = { id: string; actor: string; action: string; detail: string; at: string };

function read<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) ?? '') as T; } catch { return fallback; }
}

function write(key: string, value: unknown) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadCurrentUser(): IagUser | null { return read<IagUser | null>(IDENTITY_KEY, null); }
export function saveCurrentUser(user: IagUser | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) write(IDENTITY_KEY, user); else localStorage.removeItem(IDENTITY_KEY);
}
export function loadPendingChanges(): PendingChange[] { return read<PendingChange[]>(CHANGES_KEY, []); }
export function savePendingChanges(changes: PendingChange[]) { write(CHANGES_KEY, changes); }
export function loadAuditEvents(): AuditEvent[] { return read<AuditEvent[]>(AUDIT_KEY, []); }
export function saveAuditEvents(events: AuditEvent[]) { write(AUDIT_KEY, events.slice(0, 100)); }
export function hasAdminCredential(): boolean { return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(ADMIN_HASH_KEY)); }

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function setAdminPassphrase(passphrase: string) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(ADMIN_HASH_KEY, await digest(passphrase));
}

export async function verifyAdminPassphrase(passphrase: string): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false;
  const expected = localStorage.getItem(ADMIN_HASH_KEY);
  return Boolean(expected) && expected === await digest(passphrase);
}

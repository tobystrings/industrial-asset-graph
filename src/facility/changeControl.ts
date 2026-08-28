import type { FacilityPackage } from './types';
import type { MutationOperation, SyncEntityType } from './syncContract';

const IDENTITY_KEY = 'iag-change-control-user';
const ADMIN_HASH_KEY = 'iag-change-control-admin-hash';
const ADMIN_PIN_VERSION_KEY = 'iag-admin-pin-version';
const CHANGES_KEY = 'iag-change-control-pending-changes';
const AUDIT_KEY = 'iag-change-control-audit-log';
// Static GitHub Pages cannot keep a secret. This value is a functional demo
// credential only; production deployments must replace verification server-side.
export const INITIAL_ADMIN_PIN = '5652';

export type IagUser = { id: string; name: string; role: 'technician' | 'admin' };
export type PendingChange = {
  id: string;
  entityId: string;
  reason: string;
  proposedBy: string;
  proposedAt: string;
  basePackageRevision?: number;
  entityType?: SyncEntityType;
  operation?: MutationOperation;
  value?: Record<string, unknown>;
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

export function loadCurrentUser(): IagUser | null {
  const user = read<Partial<IagUser> | null>(IDENTITY_KEY, null);
  if (!user?.name || (user.role !== 'technician' && user.role !== 'admin')) return null;
  return { id: user.id ?? `legacy-${user.role}-${user.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name: user.name, role: user.role };
}
export function saveCurrentUser(user: IagUser | null) {
  if (typeof localStorage === 'undefined') return;
  if (user) write(IDENTITY_KEY, user); else localStorage.removeItem(IDENTITY_KEY);
}
export function loadPendingChanges(): PendingChange[] { return read<PendingChange[]>(CHANGES_KEY, []); }
export function savePendingChanges(changes: PendingChange[]) { write(CHANGES_KEY, changes); }
export function loadAuditEvents(): AuditEvent[] { return read<AuditEvent[]>(AUDIT_KEY, []); }
export function saveAuditEvents(events: AuditEvent[]) { write(AUDIT_KEY, events.slice(0, 100)); }
export function hasAdminCredential(): boolean { return typeof localStorage !== 'undefined' && Boolean(localStorage.getItem(ADMIN_HASH_KEY)); }

export function clientIdentity(): string {
  const key = 'iag-change-control-client-id';
  if (typeof localStorage === 'undefined') return 'server-render-client';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function setAdminPassphrase(passphrase: string) {
  if (typeof localStorage === 'undefined') return;
  if (!/^\d{4}$/.test(passphrase)) throw new Error('Administrator PIN must be exactly 4 numeric digits.');
  localStorage.setItem(ADMIN_HASH_KEY, await digest(passphrase));
}

export async function verifyAdminPassphrase(passphrase: string): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false;
  if (!/^\d{4}$/.test(passphrase)) return false;
  const expected = localStorage.getItem(ADMIN_HASH_KEY);
  return Boolean(expected) && expected === await digest(passphrase);
}

export async function ensureInitialAdminPin(): Promise<void> {
  if (typeof localStorage === 'undefined' || localStorage.getItem(ADMIN_PIN_VERSION_KEY) === '1') return;
  await setAdminPassphrase(INITIAL_ADMIN_PIN);
  localStorage.setItem(ADMIN_PIN_VERSION_KEY, '1');
}

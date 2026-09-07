import type { FacilityPackage } from './types';
import type { MutationOperation, SyncEntityType } from './syncContract';

const CHANGES_KEY = 'iag-change-control-pending-changes';
const AUDIT_KEY = 'iag-change-control-audit-log';
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

export function facilityStorageKey(facilityId: string, key: string) {
  return `iag:${encodeURIComponent(facilityId)}:${key}`;
}

function readFacilityScoped<T>(facilityId: string, key: string, fallback: T): T {
  const scoped = facilityStorageKey(facilityId, key);
  if (typeof localStorage === 'undefined') return fallback;
  if (localStorage.getItem(scoped) !== null) return read(scoped, fallback);
  // Preserve legacy J. Lieb browser state once, without exposing it to another facility.
  if (facilityId === 'facility-j-lieb' && localStorage.getItem(key) !== null) {
    const legacy = read(key, fallback);
    write(scoped, legacy);
    return legacy;
  }
  return fallback;
}
export function loadPendingChanges(facilityId: string): PendingChange[] { return readFacilityScoped<PendingChange[]>(facilityId, CHANGES_KEY, []); }
export function savePendingChanges(facilityId: string, changes: PendingChange[]) { write(facilityStorageKey(facilityId, CHANGES_KEY), changes); }
export function loadAuditEvents(facilityId: string): AuditEvent[] { return readFacilityScoped<AuditEvent[]>(facilityId, AUDIT_KEY, []); }
export function saveAuditEvents(facilityId: string, events: AuditEvent[]) { write(facilityStorageKey(facilityId, AUDIT_KEY), events.slice(0, 1000)); }
export function clientIdentity(): string {
  const key = 'iag-change-control-client-id';
  if (typeof localStorage === 'undefined') return 'server-render-client';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

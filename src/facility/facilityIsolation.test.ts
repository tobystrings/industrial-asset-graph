import { beforeEach, describe, expect, it } from 'vitest';
import { facilityDatabaseName } from './runtimeDb';
import { facilityStorageKey, loadAuditEvents, loadPendingChanges, saveAuditEvents, savePendingChanges, type AuditEvent, type PendingChange } from './changeControl';

describe('facility persistence isolation', () => {
  beforeEach(() => Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new MapStorage() }));

  it('uses a distinct IndexedDB database per facility', () => {
    expect(facilityDatabaseName('facility-j-lieb')).not.toBe(facilityDatabaseName('facility-synthetic-test'));
  });

  it('does not expose one facility pending review state to another', () => {
    const change = { id: 'change-1' } as PendingChange;
    savePendingChanges('facility-j-lieb', [change]);
    expect(loadPendingChanges('facility-j-lieb')).toEqual([change]);
    expect(loadPendingChanges('facility-synthetic-test')).toEqual([]);
    expect(facilityStorageKey('facility-j-lieb', 'pending')).not.toBe(facilityStorageKey('facility-synthetic-test', 'pending'));
  });

  it('retains the durable audit window without crossing facility boundaries', () => {
    const events = Array.from({ length: 1001 }, (_, index) => ({ id: `audit-${index}`, actor: 'tester', action: 'Checked', detail: String(index), at: new Date(2026, 0, 1, 0, index).toISOString() } satisfies AuditEvent));
    saveAuditEvents('facility-j-lieb', events);
    expect(loadAuditEvents('facility-j-lieb')).toHaveLength(1000);
    expect(loadAuditEvents('facility-j-lieb')[0].id).toBe('audit-0');
    expect(loadAuditEvents('facility-j-lieb').at(-1)?.id).toBe('audit-999');
    expect(loadAuditEvents('facility-synthetic-test')).toEqual([]);
  });
});

class MapStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

import { beforeEach, describe, expect, it } from 'vitest';
import { facilityDatabaseName } from './runtimeDb';
import { facilityStorageKey, loadPendingChanges, savePendingChanges, type PendingChange } from './changeControl';

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
});

class MapStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

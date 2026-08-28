import { beforeEach, describe, expect, it } from 'vitest';
import { INITIAL_ADMIN_PIN, setAdminPassphrase, verifyAdminPassphrase } from './changeControl';

describe('admin PIN foundation', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { clear: () => store.clear(), getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value), removeItem: (key: string) => store.delete(key) } });
  });
  it('keeps the initial PIN centralized and accepts exactly four digits', async () => {
    expect(INITIAL_ADMIN_PIN).toBe('5652');
    await setAdminPassphrase(INITIAL_ADMIN_PIN);
    expect(await verifyAdminPassphrase('5652')).toBe(true);
    expect(await verifyAdminPassphrase('565')).toBe(false);
    expect(await verifyAdminPassphrase('56a2')).toBe(false);
  });
  it('rejects non-four-digit credentials when configuring', async () => {
    await expect(setAdminPassphrase('12345')).rejects.toThrow(/exactly 4/);
    await expect(setAdminPassphrase('12ab')).rejects.toThrow(/exactly 4/);
  });
});

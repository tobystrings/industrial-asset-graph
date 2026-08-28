import { beforeEach, describe, expect, it } from 'vitest';
import { ensureInitialAdminPin, INITIAL_ADMIN_PIN, setAdminPassphrase, verifyAdminPassphrase } from './changeControl';

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
  it('migrates an existing browser credential to the initial PIN once', async () => {
    await setAdminPassphrase('9999');
    await ensureInitialAdminPin();
    expect(await verifyAdminPassphrase(INITIAL_ADMIN_PIN)).toBe(true);
    expect(await verifyAdminPassphrase('9999')).toBe(false);
  });
  it('keeps the configured PIN valid without browser storage', async () => {
    localStorage.clear();
    expect(await verifyAdminPassphrase(INITIAL_ADMIN_PIN)).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { canWriteCanonical } from './auth';
describe('canonical mutation authorization', () => {
  it('rejects a technician claiming that their mutation is approved', () => {
    expect(canWriteCanonical({ id: 'tech', role: 'technician' }, 'APPROVED')).toBe(false);
    expect(canWriteCanonical({ id: 'tech', role: 'technician' }, 'CONFLICT')).toBe(false);
  });
  it('requires an approved or conflict replay state even for an administrator', () => {
    expect(canWriteCanonical({ id: 'admin', role: 'admin' }, 'APPROVED')).toBe(true);
    expect(canWriteCanonical({ id: 'admin', role: 'admin' }, 'CONFLICT')).toBe(true);
    for (const state of ['LOCAL_DRAFT', 'SUBMITTED', 'REJECTED', undefined]) expect(canWriteCanonical({ id: 'admin', role: 'admin' }, state)).toBe(false);
  });
});

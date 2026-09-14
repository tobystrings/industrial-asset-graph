import { describe, expect, it } from 'vitest';
import { appendMovement, applyInventoryChange, emptyInventory, findParts, mergeInventory, newPart, stock, validateInventory, validateInventoryTransition, type StockMovement } from './inventory';
import { emptyPublication, mergePublication } from './publicationModel';
import { liebFacilityPackage } from './activeFacility';
import { portablePlantPackage } from './runtimeDb';

const event = (type: StockMovement['type'], quantity: number, sequence = 1): StockMovement => ({ id: `event-${sequence}-${type}`, type, quantity, sequence, actor: 'Inventory test', at: '2026-09-14T12:00:00Z', reason: 'Isolated fixture', machineId: liebFacilityPackage.assets[0].id });
function fixture() {
  const pkg = structuredClone(liebFacilityPackage);
  const part = { ...newPart(pkg.facility.id), name: 'Synthetic contactor', partNumber: 'TEST-240', specifications: '24 V coil' };
  pkg.facility.inventory = { ...emptyInventory(), parts: [part] };
  return { pkg, part };
}
describe('parts inventory accounting', () => {
  it('applies independent proposals without erasing other parts and rejects stale edits', () => {
    const { part } = fixture(), base = emptyInventory();
    const first = { ...base, parts: [part] };
    const other = { ...part, id: 'second-part' };
    expect(applyInventoryChange(first, base, { ...base, parts: [other] }).parts).toHaveLength(2);
    const newer = { ...first, parts: [{ ...part, notes: 'Newer field review' }] };
    expect(() => applyInventoryChange(newer, first, { ...first, parts: [{ ...part, notes: 'Old draft' }] })).toThrow('changed after');
  });
  it('receives, reserves, releases, issues, returns and verifies without losing history', () => {
    let { part } = fixture();
    for (const [type, quantity] of [['Receive', 10], ['Reserve', 3], ['Release reservation', 2], ['Issue / install', 4], ['Return', 1], ['Verify count', 6]] as const) part = appendMovement(part, event(type, quantity, part.ledger.length + 1));
    expect(stock(part)).toEqual({ onHand: 6, reserved: 1, available: 5, lastVerified: '2026-09-14T12:00:00Z' });
    expect(part.ledger).toHaveLength(6);
  });
  it('deduplicates retries and rejects ID reuse, stale sequence, negative and reserved stock', () => {
    const { part } = fixture(), receive = event('Receive', 2);
    const saved = appendMovement(part, receive);
    expect(appendMovement(saved, receive)).toBe(saved);
    expect(appendMovement(saved, Object.fromEntries(Object.entries(receive).reverse()) as unknown as StockMovement)).toBe(saved);
    expect(() => appendMovement(saved, { ...receive, quantity: 9 })).toThrow('already used');
    expect(() => appendMovement(saved, event('Issue / install', 3, 2))).toThrow('Insufficient');
    expect(() => appendMovement(saved, { ...event('Receive', 1, 1), id: 'stale-client' })).toThrow('out-of-order');
    const reserved = appendMovement(saved, event('Reserve', 2, 2));
    expect(() => appendMovement(reserved, event('Verify count', 1, 3))).toThrow('Insufficient');
    expect(() => appendMovement(saved, { ...event('Adjust', 0, 2), reason: '' })).toThrow('reason');
  });
  it('requires valid facility machine references and sources for verified compatibility', () => {
    const { pkg, part } = fixture();
    part.machines = [{ id: 'other-facility-machine', status: 'Verified spare', position: '', source: 'Test source' }];
    expect(() => validateInventory(pkg)).toThrow('facility machine');
    part.machines[0].id = pkg.assets[0].id; part.machines[0].source = '';
    expect(() => validateInventory(pkg)).toThrow('source');
    part.machines[0].source = 'OEM fixture'; validateInventory(pkg);
    part.facilityId = 'other-facility'; expect(() => validateInventory(pkg)).toThrow('facility');
  });
  it('rejects a stale review that removes or changes existing stock history', () => {
    const { pkg, part } = fixture(), stale = structuredClone(pkg);
    pkg.facility.inventory!.parts[0] = appendMovement(part, event('Receive', 5));
    expect(() => validateInventoryTransition(pkg, stale)).toThrow('history changed');
  });
  it('preserves a longer ledger on backup merge and rejects divergent histories', () => {
    const { pkg, part } = fixture(), older = structuredClone(pkg.facility.inventory!);
    pkg.facility.inventory!.parts[0] = appendMovement(part, event('Receive', 5));
    expect(mergeInventory(pkg.facility.inventory, older)!.parts[0].ledger).toHaveLength(1);
    older.parts[0] = appendMovement(part, event('Receive', 6));
    expect(() => mergeInventory(pkg.facility.inventory, older)).toThrow('Conflicting');
  });
  it('blocks automatic combination of concurrent stock changes during publication', () => {
    const { pkg, part } = fixture();
    const base = emptyPublication(pkg), local = structuredClone(base), shared = structuredClone(base);
    local.plant.facility.inventory!.parts[0] = appendMovement(part, event('Receive', 5));
    shared.plant.facility.inventory!.parts[0] = appendMovement(part, { ...event('Receive', 3), id: 'other-device' });
    expect(mergePublication(base, local, shared).conflicts.some(c => c.path.endsWith('.ledger'))).toBe(true);
  });
  it('searches label text and ranks verified spares before uncertain matches', () => {
    const { pkg, part } = fixture(), verified = { ...structuredClone(part), id: 'verified', name: 'Z spare', machines: [{ id: pkg.assets[0].id, status: 'Verified spare' as const, position: '', source: 'OEM' }] };
    part.labelText = 'ABCD barcode';
    expect(findParts([part, verified], 'ABCD')).toEqual([part]);
    expect(findParts([part, verified], '24 coil', pkg.assets[0].id)[0].id).toBe('verified');
  });
  it('migrates absent inventory as empty and removes private photo references from portable exports', () => {
    const { pkg, part } = fixture();
    part.photos = [{ id: 'private', role: 'Label', access: 'LOCAL_ONLY' }, { id: 'shared', role: 'Part', access: 'PUBLIC_APP' }];
    expect(portablePlantPackage(pkg).facility.inventory!.parts[0].photos.map(p => p.id)).toEqual(['shared']);
    delete pkg.facility.inventory; expect(() => validateInventory(pkg)).not.toThrow();
  });
});

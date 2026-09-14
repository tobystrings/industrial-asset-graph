import type { FacilityPackage } from './types';

function stable(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export const partCategories = ['Motor', 'VFD', 'Contactor', 'Relay', 'Sensor', 'Photoeye', 'Fuse', 'Breaker', 'PLC / IO', 'Belt', 'Bearing', 'Pneumatic', 'Valve', 'Hardware', 'Consumable', 'Other'] as const;
export const compatibilityStates = ['Verified installed', 'Verified spare', 'Likely compatible', 'Needs confirmation', 'Not compatible'] as const;
export type CompatibilityState = typeof compatibilityStates[number];
export const movementTypes = ['Receive', 'Issue / install', 'Return', 'Reserve', 'Release reservation', 'Adjust', 'Dispose', 'Verify count'] as const;
export type MovementType = typeof movementTypes[number];
export const photoRoles = ['Part', 'Label', 'Package', 'Barcode / QR', 'Location', 'Installed reference'] as const;
export interface StockMovement {
  id: string; sequence: number; type: MovementType; quantity: number; actor: string; at: string; reason: string; machineId?: string;
}
export interface InventoryPart {
  id: string; facilityId: string; name: string; description: string; manufacturer: string; partNumber: string; model: string; serialLot: string;
  category: string; subcategory: string; specifications: string; unit: string; minStock: number; reorderQuantity: number;
  location: { building: string; area: string; cabinet: string; rack: string; shelf: string; bin: string };
  supplier: string; supplierSku: string; supplierUrl: string; cost: string; leadTime: string;
  condition: 'New' | 'Used / tested' | 'Repairable' | 'Reserved' | 'Obsolete' | 'Disposed';
  notes: string; tags: string; references: string; labelText: string; identityReviewed: boolean;
  addedAt: string; updatedAt: string; archived: boolean;
  photos: Array<{ id: string; role: typeof photoRoles[number]; access: 'PUBLIC_APP' | 'LOCAL_ONLY' | 'RESTRICTED' }>;
  machines: Array<{ id: string; status: CompatibilityState; position: string; source: string }>;
  alternates: Array<{ id: string; approved: boolean; reason: string }>;
  ledger: StockMovement[];
}
export interface PartsInventory { version: 1; parts: InventoryPart[]; requests: Array<{ id: string; machineId: string; description: string; actor: string; at: string; status: 'Open' | 'Resolved' }> }
export const emptyInventory = (): PartsInventory => ({ version: 1, parts: [], requests: [] });
/** Apply only changed records so separate technician proposals cannot erase each other. */
export function applyInventoryChange(current: PartsInventory, base: PartsInventory, next: PartsInventory): PartsInventory {
  const apply = <T extends { id: string }>(live: T[], before: T[], after: T[]) => {
    const result = new Map(live.map(row => [row.id, row]));
    for (const old of before) if (!after.some(row => row.id === old.id)) throw new Error('Archive inventory records instead of deleting them.');
    for (const row of after) {
      const old = before.find(item => item.id === row.id), present = result.get(row.id);
      if (stable(old) === stable(row)) continue;
      if (stable(present) !== stable(old) && stable(present) !== stable(row)) throw new Error('This inventory record changed after the draft was opened. Reload it before applying the change.');
      result.set(row.id, row);
    }
    return [...result.values()];
  };
  return { version: 1, parts: apply(current.parts, base.parts, next.parts), requests: apply(current.requests, base.requests, next.requests) };
}
export function newPart(facilityId: string): InventoryPart {
  return { id: `part-${crypto.randomUUID()}`, facilityId, name: '', description: '', manufacturer: '', partNumber: '', model: '', serialLot: '', category: 'Other', subcategory: '', specifications: '', unit: 'each', minStock: 0, reorderQuantity: 1,
    location: { building: '', area: '', cabinet: '', rack: '', shelf: '', bin: '' }, supplier: '', supplierSku: '', supplierUrl: '', cost: '', leadTime: '', condition: 'New', notes: '', tags: '', references: '', labelText: '', identityReviewed: false,
    addedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), archived: false, photos: [], machines: [], alternates: [], ledger: [] };
}
export function stock(part: Pick<InventoryPart, 'ledger'>) {
  let onHand = 0, reserved = 0;
  let lastVerified = '';
  const seen = new Set<string>();
  for (const [index, event] of part.ledger.entries()) {
    if (!event.id || seen.has(event.id) || event.sequence !== index + 1) throw new Error('Duplicate or out-of-order stock movement.');
    seen.add(event.id);
    if (!movementTypes.includes(event.type) || !Number.isFinite(event.quantity) || event.quantity < 0 || !event.actor?.trim() || !event.reason?.trim() || !Number.isFinite(Date.parse(event.at))) throw new Error('Stock movements require a valid quantity, person, date, and reason.');
    if (['Receive', 'Return'].includes(event.type)) onHand += event.quantity;
    if (['Issue / install', 'Dispose'].includes(event.type)) onHand -= event.quantity;
    if (event.type === 'Reserve') reserved += event.quantity;
    if (event.type === 'Release reservation') reserved -= event.quantity;
    if (['Adjust', 'Verify count'].includes(event.type)) onHand = event.quantity;
    if (event.type === 'Verify count') lastVerified = event.at;
    if (onHand < 0 || reserved < 0 || reserved > onHand) throw new Error('Insufficient available stock. Release reservations before issuing, disposing, or reducing the count.');
    if (['Issue / install', 'Reserve'].includes(event.type) && !event.machineId) throw new Error('Choose the machine for this stock movement.');
  }
  return { onHand, reserved, available: onHand - reserved, lastVerified };
}
export function appendMovement(part: InventoryPart, event: StockMovement): InventoryPart {
  const previous = part.ledger.find(row => row.id === event.id);
  if (previous) {
    if (stable(previous) !== stable(event)) throw new Error('Movement ID already used with different values.');
    return part;
  }
  const next = { ...part, ledger: [...part.ledger, event], updatedAt: event.at };
  stock(next);
  return next;
}
export function validateInventory(pkg: FacilityPackage) {
  const inventory = pkg.facility.inventory;
  if (!inventory) return;
  if (inventory.version !== 1 || !Array.isArray(inventory.parts) || !Array.isArray(inventory.requests)) throw new Error('Unsupported inventory format.');
  const ids = new Set(inventory.parts.map(p => p.id));
  const machines = new Set(pkg.assets.map(a => a.id));
  if (ids.size !== inventory.parts.length) throw new Error('Duplicate part IDs.');
  for (const p of inventory.parts) {
    if (!p.id || p.facilityId !== pkg.facility.id || !p.name?.trim() || !p.unit?.trim()) throw new Error('Part identity and facility are required.');
    if (![p.minStock, p.reorderQuantity].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Invalid stock threshold.');
    if (!Array.isArray(p.ledger) || !Array.isArray(p.photos) || !Array.isArray(p.machines) || !Array.isArray(p.alternates)) throw new Error('Invalid part records.');
    if (new Set(p.machines.map(m => m.id)).size !== p.machines.length || p.machines.some(m => !machines.has(m.id) || !compatibilityStates.includes(m.status) || (m.status.startsWith('Verified') && !m.source.trim()))) throw new Error('Machine compatibility requires a facility machine and a source for verified claims.');
    if (p.alternates.some(a => !ids.has(a.id) || a.id === p.id || !a.reason.trim())) throw new Error('Alternate parts require another facility part and a reason.');
    if (p.ledger.some(e => e.machineId && !machines.has(e.machineId))) throw new Error('Stock movement machine belongs to another facility or is missing.');
    if (p.photos.some(photo => !photo.id || !photoRoles.includes(photo.role) || !['PUBLIC_APP', 'LOCAL_ONLY', 'RESTRICTED'].includes(photo.access))) throw new Error('Invalid inventory photo.');
    stock(p);
  }
  if (new Set(inventory.requests.map(r => r.id)).size !== inventory.requests.length || inventory.requests.some(r => !r.id || !r.description.trim() || !r.actor || (r.machineId && !machines.has(r.machineId)))) throw new Error('Invalid inventory request.');
}
/** Changes may append history, but must never rewrite or remove an existing movement. */
export function validateInventoryTransition(before: FacilityPackage, after: FacilityPackage) {
  for (const old of before.facility.inventory?.parts ?? []) {
    const next = after.facility.inventory?.parts.find(p => p.id === old.id);
    if (!next || old.ledger.some((event, i) => stable(event) !== stable(next.ledger[i]))) throw new Error('Inventory history changed since this draft. Reload the part and reapply the change; existing movements cannot be removed.');
  }
  validateInventory(after);
}
export function locationLabel(p: InventoryPart) { return Object.values(p.location).filter(Boolean).join(' / ') || 'Location not recorded'; }
export function mergeInventory(current?: PartsInventory, incoming?: PartsInventory): PartsInventory | undefined {
  if (!current) return incoming;
  if (!incoming) return current;
  const parts = new Map(current.parts.map(p => [p.id, p]));
  for (const part of incoming.parts) {
    const old = parts.get(part.id);
    if (!old) { parts.set(part.id, part); continue; }
    const common = Math.min(old.ledger.length, part.ledger.length);
    if (old.ledger.slice(0, common).some((e, i) => stable(e) !== stable(part.ledger[i]))) throw new Error('Conflicting inventory history in backup. Reconcile stock records before importing.');
    parts.set(part.id, { ...part, ledger: old.ledger.length > part.ledger.length ? old.ledger : part.ledger });
  }
  return { version: 1, parts: [...parts.values()], requests: [...new Map([...current.requests, ...incoming.requests].map(r => [r.id, r])).values()] };
}
export function findParts(parts: InventoryPart[], query: string, machineId = '') {
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const match = (p: InventoryPart) => words.every(w => [p.name, p.description, p.manufacturer, p.partNumber, p.model, p.serialLot, p.category, p.subcategory, p.specifications, p.tags, p.notes, p.labelText, locationLabel(p)].join(' ').toLocaleLowerCase().includes(w));
  const score = (p: InventoryPart) => {
    if (!machineId) return 0;
    const direct = p.machines.find(m => m.id === machineId)?.status;
    if (direct === 'Not compatible') return 99;
    if (direct === 'Verified spare') return 0;
    if (parts.some(source => source.machines.some(m => m.id === machineId && ['Verified installed', 'Verified spare'].includes(m.status)) && source.alternates.some(a => a.id === p.id && a.approved))) return 1;
    if (direct === 'Verified installed') return 2;
    return direct ? 3 : 4;
  };
  return parts.filter(p => !p.archived && match(p) && score(p) !== 99).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
}

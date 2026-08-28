import activeFacilityPackage from '../facility/activeFacility';
const { components } = activeFacilityPackage;
import { cabinetDeviceToComponent, ioSignals, productFamilies, productManuals } from '../productCatalog';
import type { IoSignalRecord, ManualRecord, ProductFamily, ProductParam, RelationshipType, TerminalLegend } from '../types/facility';

const SAFETY_TYPES: RelationshipType[] = ['INTERLOCKS_WITH', 'ISOLATES'];

export function isSafetyRelationship(type: RelationshipType): boolean {
  return SAFETY_TYPES.includes(type);
}

export function familyForComponent(componentId: string): ProductFamily | null {
  const component = components.find((item) => item.id === componentId);
  if (!component) return null;
  if (component.productFamilyId) return productFamilies.find((item) => item.id === component.productFamilyId) ?? null;
  if (!component.model) return null;
  return productFamilies.find((item) => item.model === component.model && item.installStatus === 'INSTALLED') ?? null;
}

export function resolveComponentId(deviceOrComponentId: string): string {
  return cabinetDeviceToComponent[deviceOrComponentId] ?? deviceOrComponentId;
}

export function paramsForProduct(deviceOrComponentId: string): ProductParam[] {
  const family = familyForComponent(resolveComponentId(deviceOrComponentId));
  return family ? family.params : [];
}

export function legendForFamily(familyId: string): TerminalLegend[] {
  return productFamilies.find((item) => item.id === familyId)?.terminals ?? [];
}

export function legendMeaning(familyId: string, silk: string): string | null {
  const hit = legendForFamily(familyId).find((item) => item.silk.toLowerCase() === silk.toLowerCase());
  return hit?.meaning ?? null;
}

export function searchManuals(query: string, corpus: ManualRecord[] = productManuals): ManualRecord[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return corpus.slice();
  return corpus.filter((item) => `${item.title} ${item.excerpt} ${item.path}`.toLowerCase().includes(needle));
}

export function signallingFor(deviceOrComponentId: string, records: IoSignalRecord[] = ioSignals): IoSignalRecord[] {
  const id = resolveComponentId(deviceOrComponentId);
  return records.filter((item) => item.sourceId === id || item.destId === id);
}

export type ReconnectResult = {
  status: 'RECORDED' | 'FIELD_VERIFY';
  signals: IoSignalRecord[];
  message: string;
};

export function reconnectAfterFault(deviceOrComponentId: string, records: IoSignalRecord[] = ioSignals): ReconnectResult {
  const signals = signallingFor(deviceOrComponentId, records);
  const recorded = signals.filter((item) => item.destId);
  if (recorded.length) {
    return { status: 'RECORDED', signals: recorded, message: 'Stored signalling only. Reconnect the recorded terminals.' };
  }
  if (signals.length) {
    return { status: 'FIELD_VERIFY', signals, message: 'Signal purpose is known. Destination is not in the graph — field verify before reconnect.' };
  }
  return { status: 'FIELD_VERIFY', signals: [], message: 'No stored signalling for this device. The app does not invent a destination.' };
}

export function familyById(familyId: string): ProductFamily | null {
  return productFamilies.find((item) => item.id === familyId) ?? null;
}

export function manualForFamily(familyId: string): ManualRecord | null {
  const family = familyById(familyId);
  if (!family) return null;
  return productManuals.find((item) => item.id === family.manualId) ?? null;
}

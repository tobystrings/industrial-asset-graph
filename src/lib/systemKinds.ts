import { components, machines } from '../facilityData';
import type { ComponentRecord, FacilityAsset, SystemKind } from '../types/facility';

const TYPE_MAP: Record<Exclude<SystemKind, 'ALL'>, string[]> = {
  VFD: ['VFD'],
  PLC: ['PLC'],
  IO: ['DIGITAL_INPUT', 'DIGITAL_OUTPUT', 'ANALOG_INPUT', 'ANALOG_OUTPUT', 'RELAY_OUTPUT', 'REMOTE_IO'],
  SERVO: ['SERVO_DRIVE'],
  POWER: ['POWER_SUPPLY', 'DISCONNECT'],
};

export const SYSTEM_KINDS: SystemKind[] = ['ALL', 'VFD', 'PLC', 'IO', 'SERVO', 'POWER'];

export function typesForSystem(kind: SystemKind): string[] {
  if (kind === 'ALL') return [];
  return TYPE_MAP[kind];
}

export function componentsInSystem(kind: SystemKind): ComponentRecord[] {
  if (kind === 'ALL') return components.slice();
  const types = new Set(typesForSystem(kind));
  return components.filter((item) => types.has(item.type));
}

export function machinesInSystem(kind: SystemKind): FacilityAsset[] {
  if (kind === 'ALL') return machines.slice();
  const parents = new Set(componentsInSystem(kind).map((item) => item.parentId));
  return machines.filter((item) => parents.has(item.id));
}

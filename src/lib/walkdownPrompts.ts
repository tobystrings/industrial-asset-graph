import { areas, documents, machines } from '../facilityData';
import { line2DriveInstances } from './driveInstances';
import { serialSourcesDisagree } from './serialSources';
import type { WalkdownField } from '../types/facility';

export type UnknownPrompt = {
  field: WalkdownField;
  placeholder: string;
  hint: string;
};

export function promptForUnknown(unknown: string): UnknownPrompt {
  const text = unknown.toLowerCase();
  if (text.includes('asset id') || text.includes('serial')) {
    return { field: 'serial', placeholder: 'Tag or nameplate text', hint: 'Type the characters on the plate. Do not invent an id.' };
  }
  if (text.includes('motor') || text.includes('load assignment')) {
    return { field: 'motor', placeholder: 'Leave blank unless the motor is labeled', hint: 'Name the drive slot if known. Motor ratings stay empty unless typed.' };
  }
  if (text.includes('location') || text.includes('physical')) {
    return { field: 'note', placeholder: 'Aisle / room description', hint: 'Do not invent surveyed coordinates.' };
  }
  if (text.includes('wiring') || text.includes('destination') || text.includes('upstream') || text.includes('panel source')) {
    return { field: 'dest', placeholder: 'Leave blank unless verified', hint: 'Destinations stay empty unless you type them.' };
  }
  if (text.includes('parameter')) {
    return { field: 'param', placeholder: 'Code and captured value', hint: 'Catalog defaults are not field values.' };
  }
  if (text.includes('recovery') || text.includes('troubleshooting')) {
    return { field: 'recovery', placeholder: 'Leave blank unless a step was recorded', hint: 'No invented restart sequence.' };
  }
  if (text.includes('loto') || text.includes('safety')) {
    return { field: 'note', placeholder: 'Do not invent LOTO steps', hint: 'Record only that isolation is still FIELD_VERIFY.' };
  }
  return { field: 'unknown', placeholder: 'Typed observation', hint: 'Stays local until reviewed. Not in the graph yet.' };
}

export type WalkdownSheetItem = {
  id: string;
  label: string;
  kind: 'area-kit' | 'serial' | 'dest-unknown' | 'loto' | 'unknown';
  assetId?: string;
};

export function todayWalkdownItems(): WalkdownSheetItem[] {
  const items: WalkdownSheetItem[] = [];
  for (const area of areas.filter((item) => item.assetIds.length === 0 && item.status === 'NOT_STARTED')) {
    items.push({ id: area.id, label: `${area.name} · empty-area kit`, kind: 'area-kit' });
  }
  for (const machine of machines) {
    if (serialSourcesDisagree(machine.id)) {
      items.push({ id: `${machine.id}:serial`, label: `${machine.id} serial reconcile`, kind: 'serial', assetId: machine.id });
    }
    for (const unknown of machine.unknowns) {
      items.push({ id: `${machine.id}:${unknown}`, label: `${machine.id} · ${unknown}`, kind: 'unknown', assetId: machine.id });
    }
  }
  for (const slot of line2DriveInstances().filter((item) => !item.destId)) {
    items.push({ id: slot.componentId, label: `${slot.componentId} dest-unknown`, kind: 'dest-unknown', assetId: 'L2-CC-001' });
  }
  for (const doc of documents.filter((item) => item.category === 'LOTO' && item.state === 'NOT_STARTED')) {
    items.push({ id: doc.id, label: `${doc.assetId} LOTO stub`, kind: 'loto', assetId: doc.assetId });
  }
  return items;
}

export type TodayChipJump = {
  assetId?: string;
  areaId?: string;
  unknown?: string;
  device?: string;
  tab: 'capture' | 'record' | 'intel' | 'docs';
  openCabinet: boolean;
};

export function todayChipTarget(item: WalkdownSheetItem): TodayChipJump {
  if (item.kind === 'area-kit') return { areaId: item.id, tab: 'capture', openCabinet: false };
  if (item.kind === 'serial') return { assetId: item.assetId, tab: 'record', openCabinet: false };
  if (item.kind === 'dest-unknown') {
    const slot = line2DriveInstances().find((drive) => drive.componentId === item.id);
    return { assetId: 'L2-CC-001', device: slot?.cabinetDeviceId, tab: 'intel', openCabinet: false };
  }
  if (item.kind === 'loto') return { assetId: item.assetId, tab: 'docs', openCabinet: false };
  const unknown = item.id.includes(':') ? item.id.slice(item.id.indexOf(':') + 1) : item.label;
  return { assetId: item.assetId, unknown, tab: 'capture', openCabinet: false };
}

import { areas, components, machines } from '../facilityData';
import { line2DriveInstances } from './driveInstances';
import { resolveComponentId } from './productLookup';
import type { WalkdownCapture, WalkdownField } from '../types/facility';
import { capturedPlantFacts, capturesFor, loadWalkdownCaptures } from './walkdown';
import { todayWalkdownItems, type WalkdownSheetItem } from './walkdownPrompts';
import { documentedAreaCount, graphFieldItemCount, openFieldItemCount } from './facilityMetrics';

export type WalkItemState = 'open' | 'captured' | 'kept' | 'applied';

export function capturesForTodayItem(item: WalkdownSheetItem): WalkdownCapture[] {
  if (item.kind === 'dest-unknown') return capturesFor(item.id);
  if (item.kind === 'serial' && item.assetId) {
    return loadWalkdownCaptures().filter((capture) => capture.targetId === item.assetId && capture.field === 'serial');
  }
  return capturesFor(item.id);
}

export function todayItemState(item: WalkdownSheetItem): WalkItemState {
  if (item.kind === 'dest-unknown') {
    const slot = line2DriveInstances().find((drive) => drive.componentId === item.id);
    if (slot?.destId) return 'applied';
  }
  const captures = capturesForTodayItem(item);
  if (captures.some((capture) => capture.review === 'keep' && capture.applied)) return 'applied';
  if (captures.some((capture) => capture.review === 'keep')) return 'kept';
  if (captures.length > 0) return 'captured';
  return 'open';
}

export function todayProgress(items: WalkdownSheetItem[] = todayWalkdownItems()): Record<WalkItemState, number> & { total: number } {
  const counts = { open: 0, captured: 0, kept: 0, applied: 0, total: items.length };
  for (const item of items) counts[todayItemState(item)] += 1;
  return counts;
}

export function destUnknownOpenCount(): number {
  return line2DriveInstances().filter((item) => !item.destId).length;
}

export function coverageSubtitle(areaTotal = areas.length): string {
  const n = documentedAreaCount();
  return `${n} of ${areaTotal} areas ${n === 1 ? 'has' : 'have'} assets`;
}

export function queueCountLabel(asset: Parameters<typeof openFieldItemCount>[0] = null): string {
  return `${graphFieldItemCount(asset)} in the graph · ${openFieldItemCount(asset)} open on this phone`;
}

export function applyConfirmText(capture: Pick<WalkdownCapture, 'field' | 'targetId'>): string {
  if (capture.field === 'dest') {
    return `Apply overlays dest-unknown for ${capture.targetId} in this browser only. Not written to the graph. Reject restores dest-unknown.`;
  }
  if (capture.field === 'motor') {
    return `Apply overlays motor for ${capture.targetId} in this browser only. Not written to the graph.`;
  }
  if (capture.field === 'recovery') {
    return `Apply overlays recovery on the fault card in this browser only. Not written to the graph.`;
  }
  return `Apply keeps this observation local. It is not in the graph.`;
}

export function isInventableField(field: WalkdownField): boolean {
  return field === 'dest' || field === 'motor' || field === 'recovery';
}

export function intelFocusTitle(deviceOrComponentId: string): string {
  const componentId = resolveComponentId(deviceOrComponentId);
  const slot = line2DriveInstances().find((item) => item.componentId === componentId || item.cabinetDeviceId === deviceOrComponentId);
  const component = components.find((item) => item.id === componentId);
  const label = slot?.loadLabel ?? slot?.drawingLabel ?? component?.label ?? componentId;
  const destUnknown = slot ? slot.destId === null : componentId.startsWith('L2-CC-VFD') && capturedPlantFacts(componentId).dest === null;
  return destUnknown ? `${label} · dest-unknown` : label;
}

export function panToDeviceTransform(
  box: { x: number; y: number; width: number; height: number },
  viewport: { width: number; height: number },
  scale = 1.8,
): { x: number; y: number; scale: number } {
  const next = Math.min(4.5, Math.max(0.4, scale));
  return {
    scale: next,
    x: viewport.width / 2 - (box.x + box.width / 2) * next,
    y: viewport.height / 2 - (box.y + box.height / 2) * next,
  };
}

export function panToDeviceFromRects(
  device: { left: number; top: number; width: number; height: number },
  viewport: { left: number; top: number; width: number; height: number },
  current: { x: number; y: number; scale: number },
  scale = 1.8,
): { x: number; y: number; scale: number } {
  const next = Math.min(4.5, Math.max(0.4, scale));
  const currentScale = current.scale || 1;
  const worldX = (device.left - viewport.left + device.width / 2 - current.x) / currentScale;
  const worldY = (device.top - viewport.top + device.height / 2 - current.y) / currentScale;
  return {
    scale: next,
    x: viewport.width / 2 - worldX * next,
    y: viewport.height / 2 - worldY * next,
  };
}

export function importSkipSummary(added: number, skipped: number): string {
  if (!skipped) return `Imported ${added}`;
  return `Imported ${added} · ${skipped} skipped, already on this phone`;
}

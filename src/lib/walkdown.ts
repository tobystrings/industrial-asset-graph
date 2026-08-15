import type { ReviewDecision, WalkdownCapture, WalkdownField } from '../types/facility';

export const WALKDOWN_STORAGE_KEY = 'industrial-asset-walkdown-captures';

const INVENTABLE: WalkdownField[] = ['dest', 'motor', 'recovery'];

let memory: WalkdownCapture[] = [];

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
      && typeof localStorage.getItem === 'function'
      && typeof localStorage.setItem === 'function'
      && typeof localStorage.removeItem === 'function';
  } catch {
    return false;
  }
}

export function loadWalkdownCaptures(): WalkdownCapture[] {
  if (canUseStorage()) {
    try {
      const raw = localStorage.getItem(WALKDOWN_STORAGE_KEY);
      if (raw) return JSON.parse(raw) as WalkdownCapture[];
    } catch {
      return memory.slice();
    }
  }
  return memory.slice();
}

function persist(items: WalkdownCapture[]): void {
  memory = items.slice();
  if (canUseStorage()) localStorage.setItem(WALKDOWN_STORAGE_KEY, JSON.stringify(items));
}

export function resetWalkdownStore(): void {
  memory = [];
  if (canUseStorage()) localStorage.removeItem(WALKDOWN_STORAGE_KEY);
}

export function unknownKey(assetId: string, unknown: string): string {
  return `${assetId}:${unknown}`;
}

export function recordWalkdownCapture(input: {
  targetId: string;
  field: WalkdownField;
  value: string;
  capturedBy: string;
  photoRef?: string;
  photoHash?: string;
  capturedAt?: string;
}): WalkdownCapture | null {
  const value = input.value.trim();
  if (INVENTABLE.includes(input.field) && !value) return null;
  if (!input.targetId.trim() || !input.capturedBy.trim()) return null;
  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const capture: WalkdownCapture = {
    id: `cap-${input.targetId}-${input.field}-${capturedAt}`,
    targetId: input.targetId,
    field: input.field,
    value,
    capturedBy: input.capturedBy.trim(),
    capturedAt,
    photoRef: input.photoRef?.trim() || undefined,
    photoHash: input.photoHash?.trim() || undefined,
    review: 'pending',
    applied: false,
  };
  persist([...loadWalkdownCaptures(), capture]);
  return capture;
}

export function unknownQueueState(assetId: string, unknown: string): 'open' | 'captured' {
  return capturesFor(unknownKey(assetId, unknown)).length > 0 ? 'captured' : 'open';
}

export function markUnknownCaptured(assetId: string, unknown: string, capturedBy = 'field'): WalkdownCapture | null {
  if (unknownQueueState(assetId, unknown) === 'captured') return capturesFor(unknownKey(assetId, unknown)).at(-1) ?? null;
  return recordWalkdownCapture({
    targetId: unknownKey(assetId, unknown),
    field: 'unknown',
    value: unknown,
    capturedBy,
  });
}

export function latestNoteFor(targetId: string): WalkdownCapture | null {
  const hits = capturesFor(targetId);
  return hits[hits.length - 1] ?? null;
}

export function setReviewDecision(captureId: string, review: ReviewDecision): WalkdownCapture | null {
  const items = loadWalkdownCaptures();
  const index = items.findIndex((item) => item.id === captureId);
  if (index < 0) return null;
  items[index] = {
    ...items[index],
    review,
    applied: review === 'keep' ? Boolean(items[index].applied) : false,
  };
  persist(items);
  return items[index];
}

/** Overlay dest/motor/recovery only after keep + this call. Does not write facilityData. */
export function applyKeptCapture(captureId: string): WalkdownCapture | null {
  const items = loadWalkdownCaptures();
  const index = items.findIndex((item) => item.id === captureId);
  if (index < 0) return null;
  if (items[index].review !== 'keep') return null;
  items[index] = { ...items[index], applied: true };
  persist(items);
  return items[index];
}

export function plantFactIsLive(capture: Pick<WalkdownCapture, 'review' | 'applied' | 'field'>): boolean {
  if (!INVENTABLE.includes(capture.field)) return capture.review !== 'reject';
  return capture.review === 'keep' && capture.applied === true;
}

export function capturesFor(targetId: string): WalkdownCapture[] {
  return loadWalkdownCaptures().filter((item) => item.targetId === targetId);
}

export function latestCapturedValue(targetId: string, field: WalkdownField): string | null {
  const hits = capturesFor(targetId).filter((item) => item.field === field && plantFactIsLive(item));
  const last = hits[hits.length - 1];
  return last?.value ?? null;
}

/** Dest / motor / recovery stay empty until a kept capture is explicitly applied. */
export function capturedPlantFacts(targetId: string): { dest: string | null; motor: string | null; recovery: string | null } {
  return {
    dest: latestCapturedValue(targetId, 'dest'),
    motor: latestCapturedValue(targetId, 'motor'),
    recovery: latestCapturedValue(targetId, 'recovery'),
  };
}

export function localActivityCaptures(): WalkdownCapture[] {
  return loadWalkdownCaptures().slice().reverse();
}

export const WALKDOWN_WHO_KEY = 'industrial-asset-walkdown-who';

export function loadLastWho(): string {
  if (!canUseStorage()) return '';
  try {
    return localStorage.getItem(WALKDOWN_WHO_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveLastWho(who: string): void {
  const value = who.trim();
  if (!value || !canUseStorage()) return;
  try {
    localStorage.setItem(WALKDOWN_WHO_KEY, value);
  } catch {
    /* ignore quota */
  }
}

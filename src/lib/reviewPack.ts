import type { ReviewDecision, WalkdownCapture } from '../types/facility';
import { loadWalkdownCaptures, recordWalkdownCapture, setReviewDecision } from './walkdown';

export type ReviewPack = {
  exportedAt: string;
  inGraph: false;
  captures: WalkdownCapture[];
};

export function exportReviewPack(now = new Date().toISOString()): ReviewPack {
  return { exportedAt: now, inGraph: false, captures: loadWalkdownCaptures() };
}

export function reviewPackJson(pack: ReviewPack = exportReviewPack()): string {
  return JSON.stringify(pack, null, 2);
}

export function parseReviewPack(raw: string): ReviewPack | null {
  try {
    const value = JSON.parse(raw) as ReviewPack;
    if (!value || value.inGraph !== false || !Array.isArray(value.captures)) return null;
    return value;
  } catch {
    return null;
  }
}

export function importReviewPackResult(pack: ReviewPack): { added: number; skipped: number } {
  let added = 0;
  let skipped = 0;
  const existing = new Set(loadWalkdownCaptures().map((item) => item.id));
  for (const capture of pack.captures) {
    if (existing.has(capture.id)) {
      skipped += 1;
      continue;
    }
    const saved = recordWalkdownCapture({
      targetId: capture.targetId,
      field: capture.field,
      value: capture.value,
      capturedBy: capture.capturedBy,
      photoRef: capture.photoRef,
      photoHash: capture.photoHash,
      capturedAt: capture.capturedAt,
    });
    if (saved) added += 1;
    else skipped += 1;
  }
  return { added, skipped };
}

/** Merge imported captures into local store. Never writes facilityData. */
export function importReviewPack(pack: ReviewPack): number {
  return importReviewPackResult(pack).added;
}

export function decideReview(captureId: string, decision: ReviewDecision): WalkdownCapture | null {
  return setReviewDecision(captureId, decision);
}

export type ReviewKeepPatch = {
  kind: 'review-keep-patch';
  inGraph: false;
  applied: false;
  captureId: string;
  targetId: string;
  field: string;
  value: string;
  capturedBy: string;
  inventsDest: false;
  inventsMotor: false;
  inventsRecovery: false;
  proposesDest: boolean;
  proposesMotor: boolean;
  proposesRecovery: boolean;
};

export function keepReviewPatch(capture: WalkdownCapture): ReviewKeepPatch {
  return {
    kind: 'review-keep-patch',
    inGraph: false,
    applied: false,
    captureId: capture.id,
    targetId: capture.targetId,
    field: capture.field,
    value: capture.value,
    capturedBy: capture.capturedBy,
    inventsDest: false,
    inventsMotor: false,
    inventsRecovery: false,
    proposesDest: capture.field === 'dest' && Boolean(capture.value.trim()),
    proposesMotor: capture.field === 'motor' && Boolean(capture.value.trim()),
    proposesRecovery: capture.field === 'recovery' && Boolean(capture.value.trim()),
  };
}

export function applyKeepDecision(captureId: string): { capture: WalkdownCapture | null; patch: ReviewKeepPatch | null } {
  const capture = decideReview(captureId, 'keep');
  if (!capture) return { capture: null, patch: null };
  return { capture, patch: keepReviewPatch(capture) };
}

export function keepPatchText(patch: ReviewKeepPatch): string {
  return [
    'KEEP · not in graph · applied false',
    `capture ${patch.captureId}`,
    `target ${patch.targetId}`,
    `field ${patch.field}`,
    `value ${patch.value}`,
    `by ${patch.capturedBy}`,
    `proposes dest=${patch.proposesDest} motor=${patch.proposesMotor} recovery=${patch.proposesRecovery}`,
    `invents dest=${patch.inventsDest} motor=${patch.inventsMotor} recovery=${patch.inventsRecovery}`,
  ].join('\n');
}

export function keepPatchSummary(patch: ReviewKeepPatch): string {
  return `${patch.capturedBy || 'field'} · ${patch.targetId} · ${patch.field} · not in graph`;
}

export function filterReviewCaptures(items: WalkdownCapture[], filter: 'all' | ReviewDecision): WalkdownCapture[] {
  if (filter === 'all') return items;
  return items.filter((item) => (item.review ?? 'pending') === filter);
}

export type GraphPatchPreview = {
  kind: 'graph-patch-preview';
  inGraph: false;
  applied: false;
  captureId: string;
  entity: string;
  field: string;
  old: null;
  proposed: string;
  inventsDest: false;
  inventsMotor: false;
  inventsRecovery: false;
};

export function graphPatchPreview(capture: WalkdownCapture): GraphPatchPreview {
  return {
    kind: 'graph-patch-preview',
    inGraph: false,
    applied: false,
    captureId: capture.id,
    entity: capture.targetId,
    field: capture.field,
    old: null,
    proposed: capture.value,
    inventsDest: false,
    inventsMotor: false,
    inventsRecovery: false,
  };
}

export function graphPatchText(patch: GraphPatchPreview): string {
  return [
    'GRAPH PATCH PREVIEW · not in graph · not applied',
    `capture ${patch.captureId}`,
    `entity ${patch.entity}`,
    `field ${patch.field}`,
    `old ${patch.old}`,
    `proposed ${patch.proposed}`,
    'invents dest=false motor=false recovery=false',
  ].join('\n');
}

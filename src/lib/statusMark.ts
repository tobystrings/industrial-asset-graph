import type { DocumentationState, VerificationState } from '../types/facility';

export type StatusKind = VerificationState | DocumentationState;
export type MarkerShape = 'circle' | 'triangle' | 'square' | 'diamond';

export function markerForStatus(status: StatusKind): { shape: MarkerShape; tone: 'teal' | 'amber' | 'red' | 'indigo' | 'slate' } {
  if (status === 'VERIFIED' || status === 'COMPLETE') return { shape: 'circle', tone: 'teal' };
  if (status === 'FIELD_VERIFY' || status === 'IN_PROGRESS' || status === 'REVIEW' || status === 'DRAFT') return { shape: 'triangle', tone: 'amber' };
  if (status === 'DISPUTED') return { shape: 'diamond', tone: 'red' };
  if (status === 'INFERRED') return { shape: 'square', tone: 'indigo' };
  return { shape: 'square', tone: 'slate' };
}

export function markerClass(status: StatusKind): string {
  const { shape, tone } = markerForStatus(status);
  return `status-mark shape-${shape} tone-${tone}`;
}

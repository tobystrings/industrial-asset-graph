import type { FacilityPackage } from './types';

export type SyncEntityType = 'facility' | 'area' | 'asset' | 'component' | 'relationship' | 'document' | 'evidence' | 'map_marker';
export type MutationOperation = 'UPSERT' | 'DELETE';
export type ReviewState = 'LOCAL_DRAFT' | 'PENDING_SYNC' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONFLICT';

export interface SyncMutation {
  mutationId: string;
  entityId: string;
  entityType: SyncEntityType;
  actorId: string;
  clientId: string;
  baseVersion: number;
  operation: MutationOperation;
  createdAt: string;
  reviewState: ReviewState;
  value?: Record<string, unknown>;
  evidenceAccess?: Array<'PUBLIC_APP' | 'LOCAL_ONLY' | 'RESTRICTED'>;
  conflict?: { baseVersion: number; currentVersion: number; attemptedValue?: Record<string, unknown>; currentValue?: Record<string, unknown> };
}

export type MutationResult =
  | { status: 'accepted'; mutationId: string; entityId: string; version: number }
  | { status: 'duplicate'; mutationId: string; entityId: string; version: number }
  | { status: 'conflict'; mutationId: string; entityId: string; baseVersion: number; currentVersion: number; attemptedValue?: Record<string, unknown>; currentValue?: Record<string, unknown> };

export type ReplayResult = { accepted: MutationResult[]; conflicts: Extract<MutationResult, { status: 'conflict' }>[]; retained: SyncMutation[] };

export function isTransportEligible(mutation: SyncMutation): boolean {
  if (mutation.reviewState === 'LOCAL_DRAFT') return false;
  if (mutation.evidenceAccess?.some((access) => access !== 'PUBLIC_APP')) return false;
  return !(mutation.entityType === 'evidence' && mutation.value?.access === 'LOCAL_ONLY');
}

export function eligibleMutations(mutations: SyncMutation[]): SyncMutation[] {
  return mutations.filter(isTransportEligible);
}

export function replayMutationQueue(mutations: SyncMutation[], send: (mutation: SyncMutation) => MutationResult): ReplayResult {
  const accepted: MutationResult[] = [];
  const conflicts: Extract<MutationResult, { status: 'conflict' }>[] = [];
  const retained: SyncMutation[] = [];
  for (const mutation of mutations) {
    if (!isTransportEligible(mutation)) { retained.push(mutation); continue; }
    const result = send(mutation);
    if (result.status === 'conflict') { conflicts.push(result); retained.push({ ...mutation, reviewState: 'CONFLICT' }); }
    else accepted.push(result);
  }
  return { accepted, conflicts, retained };
}

export class CanonicalMutationService {
  private readonly processed = new Map<string, MutationResult>();
  private readonly entities = new Map<string, { version: number; value?: Record<string, unknown>; deleted: boolean }>();

  constructor(pkg?: FacilityPackage) {
    if (!pkg) return;
    const collections = [pkg.areas, pkg.assets, pkg.components, pkg.relationships, pkg.documents, pkg.evidence];
    for (const entity of collections.flat()) this.entities.set(entity.id, { version: pkg.entityVersions[entity.id] ?? 1, value: structuredClone(entity) as unknown as Record<string, unknown>, deleted: false });
  }

  apply(mutation: SyncMutation): MutationResult {
    const prior = this.processed.get(mutation.mutationId);
    if (prior) return prior.status === 'accepted' ? { ...prior, status: 'duplicate' } : prior;
    if (!isTransportEligible(mutation)) throw new Error('Mutation is not eligible for shared transport.');
    const current = this.entities.get(mutation.entityId);
    const currentVersion = current?.version ?? 0;
    if (mutation.baseVersion !== currentVersion) {
      const result: MutationResult = { status: 'conflict', mutationId: mutation.mutationId, entityId: mutation.entityId, baseVersion: mutation.baseVersion, currentVersion, attemptedValue: mutation.value, currentValue: current?.value };
      this.processed.set(mutation.mutationId, result);
      return result;
    }
    const version = currentVersion + 1;
    this.entities.set(mutation.entityId, { version, value: mutation.operation === 'DELETE' ? current?.value : structuredClone(mutation.value), deleted: mutation.operation === 'DELETE' });
    const result: MutationResult = { status: 'accepted', mutationId: mutation.mutationId, entityId: mutation.entityId, version };
    this.processed.set(mutation.mutationId, result);
    return result;
  }

  resolve(conflict: Extract<MutationResult, { status: 'conflict' }>, mutation: Omit<SyncMutation, 'baseVersion' | 'mutationId'> & { mutationId: string }): MutationResult {
    return this.apply({ ...mutation, baseVersion: conflict.currentVersion });
  }

  snapshot(entityId: string) {
    const entity = this.entities.get(entityId);
    return entity ? structuredClone(entity) : undefined;
  }
}

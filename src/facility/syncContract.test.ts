import { describe, expect, it } from 'vitest';
import { CanonicalMutationService, eligibleMutations, replayMutationQueue, type SyncMutation } from './syncContract';

const mutation = (overrides: Partial<SyncMutation> = {}): SyncMutation => ({ mutationId: 'm-1', entityId: 'asset-1', entityType: 'asset', actorId: 'tech-1', clientId: 'tablet-1', baseVersion: 0, operation: 'UPSERT', createdAt: '2026-08-27T00:00:00Z', reviewState: 'SUBMITTED', value: { name: 'Observed asset' }, ...overrides });

describe('shared mutation contract', () => {
  it('is idempotent and detects stale canonical edits', () => {
    const service = new CanonicalMutationService();
    expect(service.apply(mutation())).toMatchObject({ status: 'accepted', version: 1 });
    expect(service.apply(mutation())).toMatchObject({ status: 'duplicate', version: 1 });
    expect(service.apply(mutation({ mutationId: 'm-2', value: { name: 'Competing edit' } }))).toMatchObject({ status: 'conflict', baseVersion: 0, currentVersion: 1 });
  });

  it('excludes LOCAL_ONLY evidence at the transport boundary', () => {
    const local = mutation({ mutationId: 'e-1', entityId: 'evidence-1', entityType: 'evidence', value: { access: 'LOCAL_ONLY', title: 'Private photo' } });
    expect(eligibleMutations([local, mutation()])).toEqual([mutation()]);
    expect(() => new CanonicalMutationService().apply(local)).toThrow(/not eligible/);
  });

  it('excludes facts supported by non-public evidence at the transport boundary', () => {
    const relationship = mutation({ mutationId: 'r-1', entityId: 'rel-1', entityType: 'relationship', evidenceAccess: ['LOCAL_ONLY'] });
    expect(eligibleMutations([relationship])).toEqual([]);
  });

  it('allows explicit conflict resolution against the current version', () => {
    const service = new CanonicalMutationService();
    service.apply(mutation());
    const conflict = service.apply(mutation({ mutationId: 'm-2' }));
    expect(conflict.status).toBe('conflict');
    if (conflict.status !== 'conflict') return;
    expect(service.resolve(conflict, { ...mutation({ mutationId: 'm-3', value: { name: 'Reviewed value' } }), actorId: 'reviewer-1' })).toMatchObject({ status: 'accepted', version: 2 });
  });

  it('replays eligible offline mutations and retains local/conflicted work', () => {
    const service = new CanonicalMutationService();
    service.apply(mutation());
    const localDraft = mutation({ mutationId: 'draft-1', entityId: 'draft', reviewState: 'LOCAL_DRAFT' });
    const stale = mutation({ mutationId: 'stale-1', value: { name: 'Offline edit' } });
    const fresh = mutation({ mutationId: 'fresh-1', entityId: 'asset-2' });
    const replay = replayMutationQueue([localDraft, stale, fresh], (item) => service.apply(item));
    expect(replay.accepted).toHaveLength(1);
    expect(replay.conflicts).toHaveLength(1);
    expect(replay.retained.map((item) => [item.mutationId, item.reviewState])).toEqual([['draft-1', 'LOCAL_DRAFT'], ['stale-1', 'CONFLICT']]);
  });

  it('uses versioned tombstones so deleted entities cannot be resurrected by stale clients', () => {
    const service = new CanonicalMutationService();
    service.apply(mutation());
    expect(service.apply(mutation({ mutationId: 'delete-1', baseVersion: 1, operation: 'DELETE' }))).toMatchObject({ status: 'accepted', version: 2 });
    expect(service.snapshot('asset-1')).toMatchObject({ version: 2, deleted: true });
    expect(service.apply(mutation({ mutationId: 'resurrect-1', baseVersion: 1 }))).toMatchObject({ status: 'conflict', currentVersion: 2 });
  });
});

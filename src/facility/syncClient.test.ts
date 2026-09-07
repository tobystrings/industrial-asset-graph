import { describe, expect, it } from 'vitest';
import { applyCanonicalEntities, HttpSyncTransport, syncMutationQueue, type SyncTransport } from './syncClient';
import { demoFacilityPackage } from '../../facilities/demo-plant';
import type { SyncMutation } from './syncContract';

const item = (id: string, overrides: Partial<SyncMutation> = {}): SyncMutation => ({ mutationId: id, entityId: id, entityType: 'asset', actorId: 'tech', clientId: 'phone', baseVersion: 0, operation: 'UPSERT', createdAt: '2026-08-27T00:00:00Z', reviewState: 'SUBMITTED', value: { id }, ...overrides });

describe('sync client', () => {
  it('replays in order and retains conflicts with truthful state', async () => {
    const transport: SyncTransport = { send: async (_facility, mutation) => mutation.mutationId === 'conflict'
      ? { status: 'conflict', mutationId: mutation.mutationId, entityId: mutation.entityId, baseVersion: 0, currentVersion: 2, attemptedValue: mutation.value, currentValue: { id: 'server' } }
      : { status: 'accepted', mutationId: mutation.mutationId, entityId: mutation.entityId, version: 1 } };
    const result = await syncMutationQueue('facility', [item('ok'), item('conflict')], transport);
    expect(result.phase).toBe('CONFLICT');
    expect(result.accepted).toHaveLength(1);
    expect(result.retained[0].reviewState).toBe('CONFLICT');
    expect(result.retained[0].conflict?.currentVersion).toBe(2);
  });

  it('never sends local drafts or LOCAL_ONLY evidence', async () => {
    let calls = 0;
    const transport: SyncTransport = { send: async () => { calls += 1; throw new Error('must not send'); } };
    const result = await syncMutationQueue('facility', [item('draft', { reviewState: 'LOCAL_DRAFT' }), item('evidence', { entityType: 'evidence', value: { access: 'LOCAL_ONLY' } })], transport);
    expect(calls).toBe(0);
    expect(result.phase).toBe('LOCAL_ONLY');
  });

  it('retains the failed mutation and remaining queue on network failure', async () => {
    const transport: SyncTransport = { send: async () => { throw new Error('offline'); } };
    const result = await syncMutationQueue('facility', [item('one'), item('two')], transport);
    expect(result.phase).toBe('ERROR');
    expect(result.retained.map((entry) => entry.mutationId)).toEqual(['one', 'two']);
  });

  it('applies a canonical change received by a second client', () => {
    const next = applyCanonicalEntities(demoFacilityPackage, [{ entityId: 'DEMO-MCH-001', entityType: 'asset', version: 2, value: { ...demoFacilityPackage.assets[0], name: 'Shared reviewed name' } as unknown as Record<string, unknown>, deleted: false, updatedAt: '2026-08-28T00:00:00Z', updatedBy: 'reviewer' }]);
    expect(next.assets.find((item) => item.id === 'DEMO-MCH-001')?.name).toBe('Shared reviewed name');
    expect(next.entityVersions['DEMO-MCH-001']).toBe(2);
  });

  it('does not overwrite an entity that still has local-only work queued', () => {
    const local = { ...demoFacilityPackage.assets[0], name: 'Technician draft' };
    const next = applyCanonicalEntities({ ...demoFacilityPackage, assets: [local] }, [{ entityId: local.id, entityType: 'asset', version: 4, value: { ...local, name: 'Remote update' } as unknown as Record<string, unknown>, deleted: false, updatedAt: '2026-08-28T00:00:00Z', updatedBy: 'reviewer' }], new Set([local.id]));
    expect(next.assets.find((item) => item.id === local.id)?.name).toBe('Technician draft');
    expect(next.entityVersions[local.id]).toBe(demoFacilityPackage.entityVersions[local.id]);
  });

  it('sends the optional development bearer token without changing the mutation body', async () => {
    let request: RequestInit | undefined;
    const transport = new HttpSyncTransport('http://api', async (_url, init) => { request = init; return new Response(JSON.stringify({ status: 'accepted', mutationId: 'one', entityId: 'one', version: 1 }), { status: 200 }); }, 'dev-token');
    await transport.send('facility', item('one'));
    expect((request?.headers as Record<string, string>).authorization).toBe('Bearer dev-token');
    expect(JSON.parse(String(request?.body))).toMatchObject({ mutationId: 'one', entityId: 'one' });
  });

  it('uses an encoded incremental pull cursor when provided', async () => {
    let requestedUrl = '';
    const transport = new HttpSyncTransport('http://api', async (url) => {
      requestedUrl = String(url);
      return new Response(JSON.stringify({ entities: [] }), { status: 200 });
    });
    await transport.pull?.('facility/one', '2026-08-28T12:34:56.000Z');
    expect(requestedUrl).toBe('http://api/api/facilities/facility%2Fone/entities?since=2026-08-28T12%3A34%3A56.000Z');
  });

  it('authenticates canonical pulls when a shared token is configured', async () => {
    let request: RequestInit | undefined;
    const transport = new HttpSyncTransport('http://api', async (_url, init) => {
      request = init;
      return new Response(JSON.stringify({ entities: [] }), { status: 200 });
    }, 'shared-token');
    await transport.pull?.('facility');
    expect((request?.headers as Record<string, string>).authorization).toBe('Bearer shared-token');
  });
});

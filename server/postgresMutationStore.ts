import type { Pool, PoolClient } from 'pg';
import { isTransportEligible, type MutationResult, type SyncMutation } from '../src/facility/syncContract.js';

type StoredEntity = { entity_version: string; value: Record<string, unknown> | null; deleted: boolean };

export class PostgresMutationStore {
  constructor(private readonly pool: Pool) {}

  async apply(facilityId: string, mutation: SyncMutation): Promise<MutationResult> {
    if (!facilityId.trim()) throw new Error('Facility ID is required.');
    if (!isTransportEligible(mutation)) throw new Error('Mutation is not eligible for shared transport.');
    if (mutation.reviewState !== 'APPROVED') throw new Error('Only approved mutations may change canonical entities.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const duplicate = await client.query<{ result: MutationResult }>(
        'SELECT result FROM sync_mutations WHERE facility_id = $1 AND mutation_id = $2',
        [facilityId, mutation.mutationId],
      );
      if (duplicate.rowCount) {
        await client.query('COMMIT');
        const prior = duplicate.rows[0].result;
        return prior.status === 'accepted' ? { ...prior, status: 'duplicate' } : prior;
      }

      const selected = await client.query<StoredEntity>(
        'SELECT entity_version, value, deleted FROM canonical_entities WHERE facility_id = $1 AND entity_id = $2 FOR UPDATE',
        [facilityId, mutation.entityId],
      );
      const current = selected.rows[0];
      const currentVersion = current ? Number(current.entity_version) : 0;
      if (currentVersion !== mutation.baseVersion) {
        const conflict: MutationResult = {
          status: 'conflict', mutationId: mutation.mutationId, entityId: mutation.entityId,
          baseVersion: mutation.baseVersion, currentVersion,
          attemptedValue: mutation.value, currentValue: current?.value ?? undefined,
        };
        await this.recordMutation(client, facilityId, mutation, conflict);
        await client.query('COMMIT');
        return conflict;
      }

      const version = currentVersion + 1;
      const deleted = mutation.operation === 'DELETE';
      const nextValue = deleted ? current?.value ?? mutation.value ?? null : mutation.value ?? null;
      await client.query(
        `INSERT INTO canonical_entities (facility_id, entity_id, entity_type, entity_version, value, deleted, updated_at, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (facility_id, entity_id) DO UPDATE SET entity_type=EXCLUDED.entity_type, entity_version=EXCLUDED.entity_version,
         value=EXCLUDED.value, deleted=EXCLUDED.deleted, updated_at=EXCLUDED.updated_at, updated_by=EXCLUDED.updated_by`,
        [facilityId, mutation.entityId, mutation.entityType, version, nextValue, deleted, mutation.createdAt, mutation.actorId],
      );
      const accepted: MutationResult = { status: 'accepted', mutationId: mutation.mutationId, entityId: mutation.entityId, version };
      await client.query(
        `INSERT INTO canonical_revisions (facility_id, entity_id, mutation_id, previous_version, new_version, previous_value, new_value, operation, actor_id, client_id, changed_at, review_state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [facilityId, mutation.entityId, mutation.mutationId, currentVersion, version, current?.value ?? null, nextValue, mutation.operation, mutation.actorId, mutation.clientId, mutation.createdAt, mutation.reviewState],
      );
      await this.recordMutation(client, facilityId, mutation, accepted);
      await client.query('COMMIT');
      return accepted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private recordMutation(client: PoolClient, facilityId: string, mutation: SyncMutation, result: MutationResult) {
    return client.query(
      `INSERT INTO sync_mutations (facility_id, mutation_id, entity_id, actor_id, client_id, base_version, operation, review_state, attempted_value, result)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [facilityId, mutation.mutationId, mutation.entityId, mutation.actorId, mutation.clientId, mutation.baseVersion, mutation.operation, mutation.reviewState, mutation.value ?? null, result],
    );
  }

  async entity(facilityId: string, entityId: string) {
    const result = await this.pool.query<StoredEntity & { entity_id: string; entity_type: string; updated_at: string; updated_by: string }>(
      'SELECT entity_id, entity_type, entity_version, value, deleted, updated_at, updated_by FROM canonical_entities WHERE facility_id = $1 AND entity_id = $2',
      [facilityId, entityId],
    );
    return result.rows[0] ?? null;
  }

  async entities(facilityId: string, since?: string) {
    const result = await this.pool.query<StoredEntity & { entity_id: string; entity_type: string; updated_at: Date; updated_by: string }>(
      `SELECT entity_id, entity_type, entity_version, value, deleted, updated_at, updated_by
       FROM canonical_entities WHERE facility_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)
       ORDER BY updated_at, entity_id`,
      [facilityId, since ?? null],
    );
    return result.rows.map((row) => ({ entityId: row.entity_id, entityType: row.entity_type, version: Number(row.entity_version), value: row.value ?? undefined, deleted: row.deleted, updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by }));
  }
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PostgreSQL canonical graph schema', () => {
  const sql = readFileSync('server/migrations/001_canonical_graph.sql', 'utf8');

  it('persists versions, idempotent mutation IDs, tombstones, and immutable revisions', () => {
    expect(sql).toContain('PRIMARY KEY (facility_id, entity_id)');
    expect(sql).toContain('PRIMARY KEY (facility_id, mutation_id)');
    expect(sql).toContain('entity_version bigint NOT NULL');
    expect(sql).toContain('deleted boolean NOT NULL');
    expect(sql).toContain('canonical_revisions');
    expect(sql).toContain('UNIQUE (facility_id, mutation_id)');
  });
});

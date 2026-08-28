CREATE TABLE IF NOT EXISTS canonical_entities (
  facility_id text NOT NULL,
  entity_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('facility','area','asset','component','relationship','document','evidence','map_marker')),
  entity_version bigint NOT NULL CHECK (entity_version > 0),
  value jsonb,
  deleted boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  updated_by text NOT NULL,
  PRIMARY KEY (facility_id, entity_id)
);

CREATE INDEX IF NOT EXISTS canonical_entities_type_idx ON canonical_entities (facility_id, entity_type) WHERE NOT deleted;

CREATE TABLE IF NOT EXISTS sync_mutations (
  facility_id text NOT NULL,
  mutation_id text NOT NULL,
  entity_id text NOT NULL,
  actor_id text NOT NULL,
  client_id text NOT NULL,
  base_version bigint NOT NULL CHECK (base_version >= 0),
  operation text NOT NULL CHECK (operation IN ('UPSERT','DELETE')),
  review_state text NOT NULL,
  attempted_value jsonb,
  result jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (facility_id, mutation_id)
);

CREATE TABLE IF NOT EXISTS canonical_revisions (
  revision_id bigserial PRIMARY KEY,
  facility_id text NOT NULL,
  entity_id text NOT NULL,
  mutation_id text NOT NULL,
  previous_version bigint NOT NULL,
  new_version bigint NOT NULL,
  previous_value jsonb,
  new_value jsonb,
  operation text NOT NULL,
  actor_id text NOT NULL,
  client_id text NOT NULL,
  changed_at timestamptz NOT NULL,
  review_state text NOT NULL,
  UNIQUE (facility_id, mutation_id)
);

CREATE INDEX IF NOT EXISTS canonical_revisions_entity_idx ON canonical_revisions (facility_id, entity_id, new_version DESC);

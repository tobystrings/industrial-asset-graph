# Architecture and migration

## Current system

The React application reads a `FacilityPackage` selected in `activeFacility.ts`. `FacilityProvider` seeds or loads that package from IndexedDB, updates the compatibility exports in `facilityData.ts`, and exposes editor operations. Plant Manager writes are either committed locally by an administrator or stored as technician proposals in browser local storage. Walkdown Keep/review is a separate local capture path and intentionally does not mutate canonical facility data.

IndexedDB `runtimeDb.ts` owns the active plant, binary attachments, and observations. `.iag` archives are stored ZIP files containing a manifest, plant JSON, observations, attachment metadata, and attachment blobs. Legacy JSON backups remain a separate compatible import path. The current merge is ID-based replacement and is backup/import behavior, not multi-user synchronization.

`relationshipHonesty.ts` protects deliberately empty semantic relationship types. Relationship traversal uses centralized direction/domain semantics and propagates the weakest verification state along a path. The 2D map, cabinet workspace, inspector, Asset Directory, Relationships workspace, and Plant Manager share the current responsive shell and mandatory visual audit.

## Risks and overloaded boundaries

`FacilityProvider` currently combines React state, persistence, identity, proposals, approvals, audit events, attachments, and archive operations. `runtimeDb.ts` combines IndexedDB access and archive orchestration. Local-storage proposals contain complete package snapshots, which are unsuitable as a shared synchronization protocol. Imported JSON previously relied primarily on TypeScript shape assumptions. These boundaries should be split incrementally, without moving working UI onto a disconnected model.

## Target architecture

`FacilityPackage` schema version 2 is the compatibility aggregate used by the existing UI and portable archives. Stable entity IDs, a package revision, and per-entity versions form the migration bridge. Runtime validation is applied at import/load boundaries. All future package changes advance through explicit migration functions.

Shared writes use `SyncMutation`: stable mutation, actor, client, entity, operation, base-version, timestamp, and review-state fields. A canonical service accepts an idempotent mutation or returns an explicit conflict containing attempted and current versions/values. Tombstone deletes use the same version rule. The PostgreSQL adapter applies this contract transactionally and records immutable revisions; the pure in-memory implementation remains the executable reference and test fixture.

IndexedDB remains the offline cache and includes a versioned mutation outbox. Only transport-eligible submitted changes leave the device. `LOCAL_ONLY` evidence and local drafts are rejected at the transport boundary. Queue replacement after replay retains local drafts and conflicts while removing accepted/idempotent mutations. The UI continues to distinguish local draft, pending sync, submitted, approved/canonical, rejected, and conflict states.

## Migration sequence

1. Read legacy schema-v1/untagged packages, migrate deterministically to schema v2, validate, and preserve all facts, evidence states, relationships, and IDs.
2. Export schema-v2 plant JSON while retaining readers for archive/backup version 1.
3. Connect the IndexedDB mutation outbox to a persistence adapter around the mutation contract.
4. Harden the locally runnable API/PostgreSQL adapter with production authentication/authorization and deployment controls.
5. Replace the development token/identity boundary with the production identity provider and role enforcement before exposing the API publicly; extend entity-level conflict diffs to field-level review where useful.
6. Expand evidence attachment, authoring, graph health, and plant-scale UX while retaining the existing 2D/cabinet identity.

## Explicit non-goals

No 3D mapping, Neo4j, CRDT, fabricated facility data, automatic Keep promotion, automatic verification promotion, automatic `LOCAL_ONLY` upload, last-write-wins conflict handling, or replacement of `.iag` backup/handoff behavior. Schema capability never implies that a relationship instance exists.

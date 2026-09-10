# Production and maintenance records

The co-packing extension is documented in [COPACKING-IMPLEMENTATION.md](COPACKING-IMPLEMENTATION.md), including editable reported stages, packaging/specification revisions, runs, evidence-aware compatibility, and the current four-asset reconciliation. Its [revised facility reference](FACILITY_COPACKING_SPECS.md) supersedes earlier generic routing and candidate descriptions below.

The existing application now has Production lines, Documentation queue, Equipment field sheet, and Dependency records pages. Open them from More, the Home line cards, or the link on an asset record.

## Facility data and evidence

J. Lieb Foods configuration is in `facilities/lieb-foods/production.ts`. It identifies only Lines 1, 2, and 4. Lines 2 and 4 start at equal higher business priority. The reusable application contains no hard-coded equipment or line assignments. A missing production configuration is added from the selected facility seed once; existing saved priorities and survey records are preserved.

Physical area remains `asset.areaId`. Multiple production memberships reside on one canonical asset, each carrying verification state, evidence IDs, source designation, and verification date. Legacy `asset.line` remains unchanged and is displayed as a source claim, not silently upgraded to a verified membership. Empty membership lists explicitly mean no currently documented membership.

Taxonomy entries and survey items are separate from assets and map markers. A survey outcome never creates equipment. Record observed equipment through Add equipment, then open its Equipment field sheet to connect supported lines, capture electrical and utility notes, attach evidence, document components and assemblies, and save service history.

Existing Wulftec package: `LIEB-WULFTEC-A6882`, WCRT-200 stretch wrapper. Its source leaves the line unconfirmed despite a reported Line 4 association. Kosme is now present as `LIEB-KOSME-TOPIIAD-L05358`, with OEM, CR22 and photo evidence. Reuse these canonical IDs; their line assignments and actual routing remain field-verification actions.

## Dependencies and priority

Dependency records distinguish physical location, containment, electrical supply, utility supply, control, communication, production flow, mechanical drive, sensing, interlocks, and documentation. Sources and targets may be existing assets, components, areas, documents, or evidence. Branch, bypass, and redundant routes retain their conditions and evidence; no generic process sequence is installed.

Potential impact follows only verified, evidenced dependency edges in their documented direction. Location/containment/document edges do not establish production impact. The result reaches a line only through a verified, evidenced membership. It shows recorded paths and unverified adjacent edges, and never asserts a shutdown consequence or an isolation boundary. Bypass/redundant routes are displayed as conditional alternatives, not assumed operational.

Priority is a transparent weighted sum: maximum supported line importance, extra verified supported lines, recorded fault/symptom entries, reported absence of redundancy, reported spare unavailability, and documentation gaps. A symptom entry is a report, not a calculated failure rate. Unknown redundancy/spares contribute no asserted deficiency; safety significance is captured separately. Both factors and editable weights are visible in Documentation queue.

## Persistence and review

Production configuration is an optional extension of the existing facility entity; field records extend the existing asset entity. Components and relationships use their established entity types. No parallel database, credentials, or authorization system was introduced. Existing authenticated roles, review proposals, revision audit, IndexedDB, outbox, and optimistic-concurrency transport remain in use. Component saves update their canonical parent's component IDs locally, during review, and after sync.

Local attachments remain LOCAL_ONLY. Portable archives exclude private/local evidence, downgrade memberships whose evidence was excluded, and omit service entries depending on excluded evidence. Shared mutations inspect nested evidence references and remain local if any reference is controlled. Use the existing private recovery workflow for private attachments; a portable export is not a complete private backup.

## Field facts still needed (priority order)

1. Walk Lines 2 and 4 with equal initial priority: confirm asset identities, nameplates, actual line memberships and physical areas. Confirm shared services before assigning them multi-line impact.
2. Trace electrical feeds, circuits, disconnects, utilities, controls, and network links with source evidence and dates. Record branches, bypass conditions, redundancy, and unknown endpoints.
3. Reconcile Wulftec's existing private package and locate the Kosme documentation and stable ID. Do not infer their line assignments.
4. Record actual equipment quantities and process stages/flow, including reported tunnels, cappers, air rinsers, palletizers, depalletizers, labelers, and fillers. Survey categories are not proof of installation.
5. Capture service symptoms, diagnostic observations, corrective actions, spares, drive configurations, maintenance tasks, and unresolved/conflicting source facts.
6. Complete the same survey for Line 1 and supporting systems as evidence becomes available.

## Validation

Production tests exercise unique lines, equal initial priority, canonical shared assets, verified graph traversal, evidence rejection, editable scores, one-time seed upgrades, IndexedDB reloads, archive round trips, attachments, access-filtered exports, and facility isolation. The permanent visual audit includes all four workspaces at all seven required viewports, plus desktop/phone browser edits, local evidence attachments, shared membership, service history, survey save/reload, and printable field sheets.

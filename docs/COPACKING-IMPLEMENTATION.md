# Production and co-packing

Open **Production lines**, choose Line 1, 2 or 4, then use **Process flow**, **Products & specifications**, **Runs**, or **Changeover**. Lines 2 and 4 contain reported stages from [the revised reference](FACILITY_COPACKING_SPECS.md). Line 1 and all existing asset IDs are preserved. No products, approved recipes, machine settings or production history are seeded.

## Model and persistence

`src/facility/copacking.ts` extends the existing facility production configuration with stages, products, packaging format revisions, specification revisions, change-part sets and runs. Every record has a stable ID and facility ID. References resolve inside the current facility package. Stages distinguish container/packed-case flow, supporting case flow and pallet handling, with order, optional/alternative routing, candidate aliases and a nullable existing asset reference. The narrative's thermal-stage position remains explicitly provisional.

Each claim independently records its value, UNKNOWN / USER_REPORTED / VERIFIED / DISPUTED state, source, evidence IDs, date, reviewer and conflicting claims. Linking equipment does not verify an assignment. Verification requires supporting evidence and explicit reviewer/date. Process approval belongs to a specification revision and is separate from factual verification and equipment/format compatibility. Approved specifications require source evidence and approval attribution. These records document processes; they do not write to PLCs, HMIs or machines.

Packaging fields have independent `fieldClaims`; confirming a source statement does not verify all format fields. A verified field claim must match that exact recorded value. Copying a format to a new revision clears field confirmations so they cannot silently carry over to changed values. Archive merge preserves existing runs/revisions, rejects conflicting immutable revisions, and retains differing stage assignments as explicit disputes.

Saved packaging and recipe revisions cannot be overwritten through the editors or review: copy one to a new revision. Runs capture the selected product, exact format and exact recipe in a snapshot, including approval state at recording. Run configuration and snapshots are immutable after creation; status, timestamps, observations and notes remain editable. Product edits do not rewrite existing run snapshots. Run rates require units and a measurement source; missing values remain unspecified and no calculated bottleneck is asserted. Both manual and equipment constraints can be recorded.

`copackingGraph` derives existing `RelationshipRecord` shapes and stable source/target references from production records. Record containment connects lines, stages, assets, products, formats, recipes, change parts and runs. This graph does not insert physical `FEEDS` or `UPSTREAM_OF` edges into the plant inventory or treat record links as shutdown dependencies. Stages open the existing asset detail route and offer map highlighting only for an existing marker. Asset records expose reverse production context. Shared equipment is linked using one physical ID. No map geometry is seeded or moved.

The feature uses `FacilityProvider.saveFacility`, existing role-based proposals/admin review, IndexedDB, revision audit, outbox, synchronization, publication conflict handling and archive formats. It introduces no new database. Existing browsers receive the facility-specific co-packing seed only if that collection is absent, preserving line priorities and existing production data. Regular users submit proposals; administrators save canonical changes. Seed updates never recreate intentionally empty stage lists.

Portable export fails closed for this collection: if **any** co-packing record or run snapshot references controlled evidence, the whole co-packing collection is omitted, preserving confidentiality without rewriting a historical snapshot. Public-only collections round-trip unchanged. Existing transport similarly keeps facility mutations with controlled nested evidence references local. Portable export is therefore not a complete backup of controlled production data. Full archive replacement remains the existing explicit restore operation; use exports from the intended facility.

## Asset reconciliation

The inventory was inspected before seeding. It contains four physical asset records:

| Existing ID | Existing record | Reconciliation |
| --- | --- | --- |
| `L2-CC-001` | Line 2 conveyor control cabinet | Preserve cabinet identity and map; no inferred filler/rinser identity. |
| `FG-L4-MTN-001` | L4 Meta Case Former | Candidate for Line 4 supporting box forming only; exact route requires evidence. |
| `LIEB-WULFTEC-A6882` | Wulftec WCRT-200 stretch wrapper | Candidate reference retained; line assignment, shared service and inline applicability are unresolved. |
| `LIEB-KOSME-TOPIIAD-L05358` | Kosme TOP II AD Tandem Labeler | Candidate reference retained for labeling; line assignment and format applicability are unresolved. |

No existing asset matches the heat tunnel, cooling tunnel or automatic palletizer candidate identifiers sufficiently to establish identity. `EQP-TUNNEL-HEAT-01`, `EQP-TUNNEL-COOL-01` and `EQP-PALLETIZER-AUTO-01` remain aliases on unassigned stages, not new inventory. No uniqueness claim about equipment types is enforced. Stumptown, Mamma Chia, Langers and Tres Agaves remain unverified brand/format candidates in the reference only.

## Field-verification backlog

| Missing fact | Evidence needed / next action |
| --- | --- |
| Line 2 glass-only compatibility | Nameplates/manuals and approved format compatibility records for each relevant machine. |
| Line 4 PET/HDPE and secondary glass capability | Equipment-specific format records and field confirmation; identify restrictions by format. |
| Tunnel identities, functions and stage positions | Photograph nameplates and trace actual routing; obtain approved heating/hold or cooling process documents. Reconcile candidate IDs against inventory. |
| Per-line versus shared upstream and end-of-line equipment | Walk both lines, identify each physical asset once, record counts, allocation and branch conditions; retain both conflicting source claims until resolved. |
| Wulftec standalone/inline role and shared allocation | Field location, connection/routing evidence and equipment documentation. Confirm stretch versus shrink wrapping separately for Line 2. |
| Automatic palletizer identity and mechanism | Nameplate, machine record, layout and field routing confirmation. |
| Meta case former and Kosme labeler routing | Trace case supply and label/sleeve alternatives; confirm line memberships with sources. |
| Bottle/case coder, closing and optional shrink paths | Trace actual routing and applicable format alternatives; establish exact order independently of the reported sequence. |
| Manual stacking and any actual inspection | Approved inspection procedure and recorded inspection responsibility; manual handling alone proves no seal/glass inspection. |
| Brand candidates and package details | Customer/SKU authorization plus container/closure/label/case/pallet specifications. Do not convert narrative candidates into approved configurations. |
| Thermal and other process parameters | Authoritative approved process specifications. No default derived from the original 180–200 °F range, ~100 °F target, inferred dwell, nitrogen, dissolved oxygen, mixing, viscosity, pump or cooling explanations. |
| Rinser ionization/heated air, filler technology, tank jackets and pump types | Machine-specific manual, equipment record or field evidence supporting each individual claim. |
| Applicable change parts | Equipment/format-specific part numbers and setup documentation for applicable starwheels, timing screws, chucks, rails, neck-handling and other parts. |
| Throughput and constraints | Measured counts and elapsed time with units, source and assumptions at both manual and equipment stages; bottleneck remains undetermined until comparable measurements exist. |
| Line 1 | Preserve current records and collect its own routing, compatibility and equipment evidence; this narrative provides no additional configuration. |

## Verification

`src/facility/copacking.test.ts` covers evidence states, facility/reference rejection, duplicate records, seeding, immutable snapshots, revision integrity, rate/timestamp validation, controlled exports, archive round trips and review/sync preservation. The permanent visual audit includes Line 4 at all seven required viewports and synthetic catalog → specification → completed run → reload/edit → changeover → asset/map workflows at laptop and phone sizes. All browser data is confined to disposable test contexts and mocked publication/auth services.

Required release checks remain `npm test`, `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`, and `npm run test:visual`. Passing application checks does not verify the plant inventory or approve a food process.

For the publication-enabled visual workflow, build with `VITE_IAG_PUBLICATION=true`, matching `.github/workflows/ci.yml`. The tests intercept authentication and publication calls; this does not publish test runs. `scripts/copacking-smoke.py` provides a focused desktop/phone workflow against a preview server on port 4175.

## Implementation files

- Model, validation and persistence: `src/facility/copacking.ts`, `production.ts`, `schema.ts`, `FacilityProvider.tsx`, `runtimeDb.ts`.
- Facility-specific reference seed: `facilities/lieb-foods/copacking.ts`, `production.ts`.
- Editors and navigation/context: `src/production/CopackingWorkspace.tsx`, `AssetProductionContext.tsx`, `ProductionWorkspace.tsx`, `LineCards.tsx`, `production.css`; `src/dashboard/SelectedAssetPanel.tsx`.
- Verification: `src/facility/copacking.test.ts`; `scripts/copacking_visual.py`, `copacking-smoke.py`, `dashboard-visual-check.py`.
- Reference and handoff: this file, `docs/FACILITY_COPACKING_SPECS.md`, and `docs/PRODUCTION-MAINTENANCE.md`.

## Validation result — 2026-09-10

- `npm test`: 57 test files passed; 222 tests passed, one existing conditional test skipped.
- `npm run verify:data`: passed; 16 areas, four physical assets, 29 components, 27 document categories and 47 existing relationships retained.
- `npm run verify:visual-contract`: passed without reducing coverage or assertions.
- `npm run build`: passed, including frontend and server type checks. Existing Vite asset-resolution/chunk-size warnings remain nonfatal.
- `npm run test:visual`: passed at all seven required desktop/tablet/phone viewports. Desktop and phone screenshots reviewed for readability and reserved chrome space.
- Focused `scripts/copacking-smoke.py`: desktop and phone passed, including actual selected map-marker state and regular-user proposal isolation.
- `git diff --check`: passed.

The checks above were recorded before release. See Git history and the GitHub Pages workflow for the current commit and deployment state. No synthetic production history was added to the facility seed or any real shared service; browser tests used disposable contexts and network fixtures. These are software checks, not plant-inventory verification or food-process approval.

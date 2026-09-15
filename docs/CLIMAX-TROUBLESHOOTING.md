# Climax guided troubleshooting and shift handoffs

Open Equipment → Line 2 Climax Drop Packer → Troubleshooting. The source-backed machine page links checks, inferred configured components, the control register and the source review. No PLC writes or machine-control connection is added.

## Explicit schema additions

Migration `server/migrations/005_troubleshooting.sql` adds three tables to the existing Supabase backend: `iag_troubleshooting` (versioned sessions against facility and asset IDs), `iag_troubleshooting_members` (explicit relief access and acceptance), and `iag_troubleshooting_events` (immutable snapshots with server actor and time). Only database functions write these tables. Existing repair, publication, authentication and asset schemas remain intact.

Confirmed users can create a session. Its owner or an authenticated administrator can invite an existing confirmed account by email. Invitations grant session access only and do not send email. Relief must accept before editing; acceptance invalidates time-sensitive observations. Selecting a task role never grants account permissions. Existing administrator authority is read from protected account metadata.

Saves use optimistic version checks and request IDs. Conflicts retain the current form for comparison; refresh never silently discards edited fields. Every changed answer remains in the snapshot history. Revised answers, shift acceptance, and reported machine-state changes require reconfirmation. Observations also expire after 15 minutes; this UI freshness window is not a machine safety specification. The operator must report intervening state changes. There is no live telemetry feed to detect them.

## Evidence and graph import

`facilities/lieb-foods/climax.ts` adds the owner-identified machine only if a Climax identity is not already present; it reuses an existing matching identity. Stable IDs make repeat imports idempotent. Imports retain authored descriptions and previous sources. New source revisions must add their own source and register IDs. Association with the saved Portland project remains inferred until matched to the installed machine.

The existing `DocumentRecord.register` represents control concepts and dependencies. Tags do not each become physical assets. `SUPPORTED_BY_EVIDENCE` edges link inferred configured assemblies to the hashed source review. Physical connections and wiring remain unestablished. No inferred control association becomes a verified impact/isolation edge. Configured I/O modules are recorded, while channel wiring and sensor locations stay unverified.

## Guided checks and recovery

Ten symptom paths branch through Yes / No / Not sure, with what/where/normal/meaning/next/role/evidence. Failed and unknown checks remain unresolved and offer maintenance escalation. Back allows revision while preserving audit history. Completing questions never closes a session.

Separate recovery assessments cover fault reset, automatic homing, powered jogging, physical repositioning under isolation, and power cycling. None is currently validated for execution. Missing observations lead to more checks; completed assessments still escalate because installed-machine and procedure evidence is missing. The UI provides no directions, speeds, button labels, isolation points, discharge times or invented recovery steps.

Restored operation requires explicit recorded verification of personnel/guarding, loads, position/reference, mode/recipe, fault/interlocks, sequence readiness and observed operation. This is a record of an approved on-site process, not authorization to restart. Unresolved and escalated outcomes are equally supported.

## Deployment and validation

Apply migration 005 to the existing Supabase project before releasing the UI. It is additive; rollback the application without dropping session or audit tables. Preserve normal database backups. The UI truthfully reports missing backend tables/configuration rather than pretending a local record is shared. GitHub Pages deployment continues through the existing main workflow.

`node scripts/troubleshooting-db-check.mjs` uses an isolated PostgreSQL-compatible PGlite database with synthetic users. It validates actual migration functions and row-level security. Unit tests cover branch evidence, idempotent import, preserved edits, facility isolation, freshness, recovery gating, telemetry classification and export. The existing visual audit now exercises intake, unknown/escalated checks, all recovery assessments, export, reload and verified-outcome gating across all nine viewports. All test observations are explicitly simulated.

## Outstanding machine-side verification

Keep all content labeled **Draft—requires machine-side validation**. Obtain the complete native controller export (programs/routines/tags/aliases/values/modules/motion configuration), installed-project match, HMI export, nameplates and firmware, physical labels, electrical/pneumatic drawings and revision-controlled site procedures. Verify safe access, loads, rod lock, gravity and stored air on site. The detailed source review lists the extraction limits and exact hashes.

Manufacturer references to review after confirming installed model/series/firmware:

- [Rockwell 2198-D032-ERS3 product documentation](https://www.rockwellautomation.com/en-us/products/details.2198-D032-ERS3.html)
- [Kinetix 5700 user manual, 2198-UM002](https://literature.rockwellautomation.com/idc/groups/literature/documents/um/2198-um002_-en-p.pdf)
- [PowerFlex 520-series user manual, 520-UM001](https://literature.rockwellautomation.com/idc/groups/literature/documents/um/520-um001_-en-e.pdf)

These are candidate family references, not validated instructions for this installed machine or fault. No power-cycle or movement recommendation is derived from them without applicability verification.

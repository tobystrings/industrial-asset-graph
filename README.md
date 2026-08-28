# Industrial Asset Graph

Evidence-aware J. Lieb facility knowledge dashboard for plant assets, machine documentation, relationships, and field-verification work. The interactive 2D building layout is the primary application.

The **Control cabinets** workspace includes an interactive Line 2 Conveyor Control Cabinet drawing with searchable device groups, evidence-aware metadata, and downloadable SVG, PNG, PDF, and JSON records.

## Local setup

Requires Node.js 20+ and Python 3 with Playwright/Pillow only for the visual check.

```powershell
Set-Location <repo-root>
npm install
```

## Development server

```powershell
npm run dev -- --host 0.0.0.0 --port 4173
```

Open http://127.0.0.1:4173/industrial-asset-graph/. Vite `base` is `/industrial-asset-graph/`. This mode rebuilds on file changes.

## Fast local preview

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

Open http://127.0.0.1:4174/industrial-asset-graph/ to test the production dashboard build.

## In-app plant management

Plant records can be managed directly in the application without editing source files. The field UI supports asset create/edit/delete, map placement, relationship editing, photos and PDFs, evidence state, field observations, facility/area/map administration, and local persistence in IndexedDB.

**Plant Database** exports portable `.iag` archive version 2. The package is ZIP-based and contains the transport-eligible schema-v2 graph, map configuration, observations, and metadata. `LOCAL_ONLY` and `RESTRICTED` evidence and dependent attachment records are excluded at the export boundary; locally attached files are not silently bundled. Archive version 1 and legacy `.iag.json` backup version 1 remain importable and migrate through the same validated package boundary.

The reusable application lives under `src/`; facility-specific seed content and packaged reference material live under `facilities/`. The bundled facility package is the first-use seed, while runtime field edits are stored and moved through the local plant database.

## Data boundaries

Facility facts must be backed by accepted evidence or explicitly marked for field verification. Local drawings, photos, tags, CMMS exports, LOTO procedures, and field observations are controlled evidence and are not bundled into the public frontend unless they are part of an intentionally packaged public facility reference.

## Checks

```powershell
npm run verify:data
npm run build
npm run test:visual
```

`npm run test:visual` validates Warehouse F and FG-L4-MTN-001 selection at 1366×768 and 1920×1080 and confirms no legacy 3D entry point is present.

## Facility records and restricted evidence

Bundled facility records are loaded through the facility package layer with shared types in `src/types/facility.ts` and `src/facility/types.ts`. `npm run verify:data` validates facility identity, hierarchy, overlays, relationships, evidence references, revisions, and machine-document paths.

Field photographs, PLC programs, credentials, and proprietary manuals are not bundled. The dashboard contains `LOCAL_ONLY` evidence metadata and preserves local browser storage for user-attached evidence.

## Versioning and shared-sync contract

Facility packages now carry explicit schema, package-revision, and entity-version metadata. Untagged legacy packages are migrated to schema v2 and runtime-validated at IndexedDB and import boundaries; existing `.iag` archive version 1 remains readable.

The shared-write contract lives in `src/facility/syncContract.ts`. It specifies stable mutation/actor/client IDs, base entity versions, review state, idempotent retry behavior, explicit conflicts, and tombstone deletion. `LOCAL_ONLY` evidence and local drafts are rejected at the transport boundary. The PostgreSQL/API adapter is implemented under `server/` and can be enabled for connected deployments; the current public build remains local/seeded. The local admin credential and optional development bearer token are not production authentication.

For a protected local/shared deployment, set `IAG_WRITE_TOKEN` on the API and configure the client transport through `VITE_IAG_API_URL`; mutation requests must then include the matching bearer token through the deployment’s authenticated gateway. The built-in token guard is only a replaceable boundary for development and is not a substitute for an identity provider, token rotation, or role-based authorization.

### Local shared-backend development

Start Docker Desktop, then run:

```powershell
docker compose up -d postgres
$env:IAG_DATABASE_URL='postgres://iag:iag-development-only@127.0.0.1:54329/industrial_asset_graph'
npm run backend:start
```

For a guarded development API, set a process-local token before starting it and pass the same token through the deployment gateway as `Authorization: Bearer <token>`:

```powershell
$env:IAG_WRITE_TOKEN='replace-with-a-local-secret'
npm run backend:start
```

In a second terminal, point the frontend at the API:

```powershell
$env:VITE_IAG_API_URL='http://127.0.0.1:8787'
$env:VITE_IAG_WRITE_TOKEN='replace-with-a-local-secret'
npm run dev -- --host 0.0.0.0 --port 4173
```

`VITE_IAG_WRITE_TOKEN` is suitable only for a trusted local development session because Vite variables are visible to the browser; use an authenticated gateway or identity provider for shared/production deployments. The static Admin Portal PIN (`1234`) is intentionally stable across browser storage clears and devices, but is not a secret until server-side verification replaces it.

The API listens only on loopback by default. Its development identity is carried by mutation actor/client IDs and is not production authentication or authorization. Do not expose it outside a trusted development machine without adding authenticated transport, authorization, secrets management, TLS, and deployment-specific CORS controls.

With PostgreSQL and the API running, `npm run test:backend:live` exercises an accepted mutation, an idempotent retry, a stale-base `409` conflict, and a canonical readback.

The GitHub Pages/public build does not set `VITE_IAG_API_URL`; it therefore remains truthful local-only mode and never reports shared synchronization.

The approved Line 2 cabinet reference render is retained as controlled drawing evidence. Cabinet geometry and visible labels are reproduced without inferred conductors, wiring, or hidden components.

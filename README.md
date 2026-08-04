# Industrial Asset Graph

Evidence-aware J. Lieb facility knowledge dashboard for plant assets, machine documentation, relationships, and field-verification work. The interactive 2D building layout is the primary application.

## Local setup

Requires Node.js 20+ and Python 3 with Playwright/Pillow only for the visual check.

```powershell
Set-Location C:\Users\ptoul\Downloads\industrial-asset-graph-working
npm install
```

## Development server

```powershell
npm run dev -- --host 127.0.0.1 --port 4173
```

Open http://127.0.0.1:4173/. This mode rebuilds on file changes.

## Fast local preview

```powershell
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

Open http://127.0.0.1:4174/industrial-asset-graph/ to test the production dashboard build.

## Data boundaries

Facility facts must be backed by accepted evidence or explicitly marked for field verification. Local drawings, photos, tags, CMMS exports, LOTO procedures, and field observations are controlled evidence and are not bundled into the public frontend.

## Checks

```powershell
npm run verify:data
npm run build
npm run test:visual
```

`npm run test:visual` validates Warehouse F and FG-L4-MTN-001 selection at 1366×768 and 1920×1080 and confirms no legacy 3D entry point is present.

## Facility records and restricted evidence

Typed facility records live in `src/facilityData.ts` with shared types in `src/types/facility.ts`. `npm run verify:data` validates facility identity, hierarchy, overlays, relationships, evidence references, revisions, and machine-document paths.

Field photographs, PLC programs, credentials, and proprietary manuals are not bundled. The dashboard contains `LOCAL_ONLY` evidence metadata and preserves the existing browser hashing workflow for user-attached evidence.

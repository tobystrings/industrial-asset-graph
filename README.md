# Industrial Asset Graph

Evidence-aware facility knowledge dashboard for plant assets, machine documentation, relationships, and verified public spatial context. The 2D building layout is the default maintenance view; the original Three.js dependency map and current public reconstruction tools remain available from **Open 3D**.

The default public-map origin is 2550 23rd Ave, Forest Grove, OR 97116 (`45.523803, -123.1027909`). This identifies the geographic context only; the bundled plant assets and dependencies remain fictional starter records until replaced with reviewed site evidence.

The parcel layer queries the official Washington County tax-lot feature service for the polygon containing the current map origin. Portland-specific zoning, permit, document, and utility integrations remain optional context and may be unavailable outside Portland.

The nearest public building footprint to the geocoded origin is highlighted as a candidate facility outline. Because an address point can fall on a road or parcel edge, this proximity match remains unverified until confirmed with a site plan or field observation.

The map toolbar provides recenter, aerial, and operator camera presets. Field-verification electrical and pneumatic starter records can be independently hidden from the map, asset list, and dependency display.

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

Open http://127.0.0.1:4174/. Use this mode to check startup performance: the application shell loads first and the Three.js scene loads as a separate chunk. Buildings render before staggered public-layer requests complete.

## Data boundaries

Building footprints, streets, utilities, permits, documents, zoning, parcels, imagery, terrain, and DEQ data are public geographic context only. They never verify equipment location, asset specifications, plant ownership, LOTO, or internal dependency claims.

Use the evidence manifest plus locally attached drawings, photos, tags, CMMS exports, LOTO procedures, field observations, and reviewed claims to verify plant records. Attached originals are hashed in-browser with SHA-256 and are not uploaded.

## Checks

```powershell
npm run verify:data
npm run build
python scripts\visual-check.py
npm run test:visual
```

`npm run test:visual` validates Warehouse F and FG-L4-MTN-001 selection plus the 2D/3D toggle at 1366×768 and 1920×1080. The original visual check remains available for deeper public-layer and Three.js testing.

## Facility records and restricted evidence

Typed facility records live in `src/facilityData.ts` with shared types in `src/types/facility.ts`. `npm run verify:data` validates the legacy graph plus facility identity, hierarchy, overlays, relationships, evidence references, revisions, and machine-document paths.

Field photographs, PLC programs, credentials, and proprietary manuals are not bundled. The dashboard contains `LOCAL_ONLY` evidence metadata and preserves the existing browser hashing workflow for user-attached evidence.

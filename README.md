# Industrial Asset Graph

Interactive Three.js dependency map for recording plant assets, dependencies, and verified public spatial context.

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
```

The visual check starts the app at `:4173`, validates initial layer controls and canvas pixels at default, wide, and close zoom, and writes screenshots under `artifacts\`.

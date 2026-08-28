# Industrial Asset Graph — agent handoff

**Date:** 2026-08-14  
**Product title:** Industrial Asset Graph (never “Plant Dependency Map”)  
**Repository root:** the directory containing this file

This is the J. Lieb Foods **facility knowledge board**. It is not Golfgold, not a CMMS, not SCADA, not a digital twin. Do not import Desktop `golfgold/` assets.

This checkout runs **locally on Windows**. The former Mac mini, SSH, SMB, and Grok paths are not required for local development.

---

## How to run

Requires Node.js 20+.

```bash
cd <repo-root>
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

**Board (required base path):**  
http://127.0.0.1:4173/industrial-asset-graph/

The building layout is the fixed bird's-eye **2D schematic only**. Legacy `map=3d` links are normalized to `map=2d`.

Useful URLs:

| What | URL |
|------|-----|
| Default board (2D) | `/industrial-asset-graph/` |
| Bird's-eye schematic | `/industrial-asset-graph/?map=2d` |
| Line 2 cabinet | `/industrial-asset-graph/?view=cabinet` |
| Intel on L2 cabinet | `/industrial-asset-graph/?asset=L2-CC-001&tab=intel` |
| Hold Genie mini | `/industrial-asset-graph/?film=1` |
| Reduced motion | `?motion=reduce` (0 ms) |
| Full motion | `?motion=full` |
| Standalone film | `/industrial-asset-graph/presentation/` |

Production-shaped preview:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4174
```

Then open http://127.0.0.1:4174/industrial-asset-graph/

Checks:

```bash
npm test
npm run verify:data
npm run verify:visual-contract
npm run build
npm run test:visual
```

Vite `base` is **`/industrial-asset-graph/`**. Opening `/` without that prefix is the wrong app.

PWA manifest must be `/industrial-asset-graph/manifest.webmanifest` (one prefix). `index.html` uses `href="/manifest.webmanifest"` so Vite rebases once.

---

## What this product does

Evidence-aware dashboard for **J. Lieb Foods**:

- Building layout (fixed bird's-eye **2D** schematic)
- Inspector: Capture / Intel / Record / Docs / Log
- Line 2 Conveyor Control Cabinet drawing (SVG + PNG + PDF + JSON)
- Local walkdown / Keep review (never auto-merges into canonical facility-pack truth)
- Project film **Genie** as a **dock bar by default** (native MP3 clock). Mini card only when the user opens the film.

Phone: Map / Find / Queue / Cabinet. ☰ opens the **area drawer only** (Documents and Control cabinets live in that drawer).

---

## Honesty — do not violate

- Unused relationship types stay **0**: `FEEDS`, `CONTROLS`, `SENSES`, `INTERLOCKS_WITH` (also `SUPPLIES`, `UPSTREAM_OF`).
- Trace only `LOCATED_IN` / `CONTAINS` / `SUPPORTED_BY_EVIDENCE`.
- Dest / motor / recovery stay empty unless the user types them. Overlay only after explicit **Apply**. Keep stays `inGraph: false`.
- Do not invent machines, surveyed coordinates, Line 2 `FEEDS`, wiring, LOTO steps, or motor HP.
- Dest-null reconnect stays `FIELD_VERIFY`.
- L2 film chapter is scene **5** or `path=line2`. L4 (`FG-L4-MTN-001`) is **intro-only**.
- **Do not regenerate film MP3s.**
- **No 3D map or map-mode toggle.** The building layout stays on the fixed bird's-eye 2D schematic.
- Genie is a dock / mini player, not a modal sheet or iframe theater.
- `LOCAL_ONLY` evidence is not bundled.

`docs/MODERNIZATION-HANDOFF.md` is stale. This file is current.

---

## Stack

Vite 6 + React 19 + TypeScript. 1e glass + Source Sans 3. Tests: Vitest (`npm test`).

Key source:

| Path | Role |
|------|------|
| `src/App.tsx` | View + always-mounted FilmTheater |
| `src/Dashboard.tsx` | Board, inspector, URL `replaceState` |
| `src/ControlCabinetView.tsx` | Line 2 cabinet package |
| `src/FilmTheater.tsx` | Genie mini → dock, native MP3 clock |
| `src/map/MapStage.tsx` | 2D-only building-layout stage; legacy map queries normalize to 2D |
| `src/map/BlueprintMap.tsx` | 2D schematic |
| `facilities/lieb-foods/` | J. Lieb facility-package records |
| `src/lib/viewport.ts` | `dashboardSearch` + `genieQueryFromSearch` |
| `src/lib/filmGenie.ts` | Hold-mini, collapse, actions |
| `src/lib/relationshipHonesty.ts` | Unused-rel counts |
| `src/dashboard.css` | Layout, dock clearance, phone/tablet |

---

## Bundled assets (in this zip)

These **are** in the frontend:

| Asset | Path |
|-------|------|
| Facility backdrop | `public/assets/facility-dashboard.png` |
| Labeled building layout | `public/assets/labeled-building-layout.png` |
| Line 2 cabinet drawing | `public/assets/line2/control-cabinet/cabinet.svg` |
| Line 2 cabinet raster | `public/assets/line2/control-cabinet/cabinet.png` |
| Line 2 cabinet PDF | `public/assets/line2/control-cabinet/cabinet.pdf` |
| Line 2 metadata | `public/assets/line2/control-cabinet/metadata.json` |
| Approved reference render | `public/assets/line2/control-cabinet/photos/cabinet_reference_render.png` |
| Film stills | `presentation/assets/00_opening.png` … `07_terminal.png` |
| **Primary film MP3** (do not regenerate) | `presentation/audio/complete-project-film.mp3` |
| Other film MP3s (do not regenerate) | `presentation/audio/industrial-asset-graph-narration.mp3`, `solana-finale.mp3`, `tyler-project-intro.mp3` |
| Narration manifest | `presentation/narration-manifest.json` |
| Markdown docs in-app | `docs/machines/FG-L4-MTN-001/*`, `docs/control-cabinets/line2/*`, `docs/manuals/*` |
| PWA | `public/manifest.webmanifest`, `public/sw.js` |

**Not bundled (must stay out):** field photographs, PLC programs, credentials, proprietary manuals, LOCAL_ONLY evidence files.

Cabinet geometry and visible labels follow the approved render. No inferred conductors.

---

## Documented machines in the graph

Only these machines exist. Do not add more without evidence:

- `L2-CC-001` — Line 2 Conveyor Control Cabinet (cabinet drawing + Intel / PLC rack)
- `FG-L4-MTN-001` — Line 4 machine (docs + dest-unknown / DISPUTED facts)

Empty areas (Dock 1, etc.) have **capture kits only**. Export area walk pack does **not** create a machine.

---

## Genie / film

- Always mounted. **Default is the dock bar**, not the mini card. No autoplay on load.
- Mini player only when the user **opens** the film (Film button, Continue tour, chapter, `?film=1` / `?hold=mini`). Escape returns to the bar.
- `?view=film` is treated as `film=1`. It must **not** overwrite `view=assets` / `view=documents` / `view=cabinet`.
- Clock source: `complete-project-film.mp3` (~8:51). Ken Burns off on cabinet stills and when reduced-motion.
- Reduced-motion present/collapse = **0 ms**.

---

## Recent behavior (2026-08-14)

- Collapsible Intel / PLC rack / walkdown More start **expanded**; user can collapse (useState + onToggle).
- Cabinet drawing is clipped to its grid cell; inspector is opaque; dock does not cover Save on desktop/tablet.
- Tablet cabinet: chips-only row (no search/title in that strip).
- Phone ☰: drawer only. The map heading has no projection toggle.
- Mini player parks on the map above the relationship strip when opened.
- The bird's-eye 2D layout is the only building map; area labels stay visible.
- Cabinet page is opaque navy (no dashboard photo showing through). SVG hit-layer text is invisible so titles do not double-print on the PNG.
- Genie **does not autoplay** and **does not open mini on load**. Header Play plays in the bar. Film / Continue tour / `?film=1` opens mini. Escape returns to the bar.

---

## Out of scope

Golfgold / Foursomes, new film audio, invented dests/motors/LOTO, 3D/orbital map modes, auto-merge Keep, App Store, new plants.

---

## Zip contents

Source only: `src/`, `public/`, `presentation/`, `presentation-wow/`, `docs/`, `scripts/`, `github/`, config, this handoff. **No** `node_modules`, **no** `dist`, **no** golfgold.

After unzip: `npm install` then `npm run dev -- --host 0.0.0.0 --port 4173`.

## Current persistence and review architecture

The active browser package is schema-v2 and is runtime-validated at load/import boundaries. IndexedDB remains the offline cache and mutation outbox; `FacilityProvider` exposes truthful local, pending, syncing, conflict, and synced states. The outbox transport excludes LOCAL_ONLY evidence at the boundary. A PostgreSQL-backed HTTP adapter is available under `server/` for local integration, with transactional optimistic concurrency, idempotent mutation IDs, audit revisions, and tombstone deletes. The public/GitHub Pages build intentionally remains seeded/local when `VITE_IAG_API_URL` is absent.

Plant Manager separates draft/observation capture from submitted review and canonical approval. Conflicts show current and proposed values before an explicit resolution. Data Health reports validation separately from documentation coverage and lists next verification targets without manufacturing plant facts. Browser evidence attachments remain LOCAL_ONLY until a deliberate future promotion workflow exists.

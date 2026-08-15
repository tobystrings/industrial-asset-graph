# Agent environment — Industrial Asset Graph

Use this file at the start of every future session on this product. It is **not** Golfgold / Foursomes / golf GPS. Do not pull in Desktop `golfgold/` assets, tiles, or playbooks.

## What this is

Evidence-aware **J. Lieb Foods** facility knowledge board. Title is **Industrial Asset Graph**, never “Plant Dependency Map”. Vite `base` is `/industrial-asset-graph/`.

Live local board:

```
http://localhost:4173/industrial-asset-graph/
http://127.0.0.1:4173/industrial-asset-graph/?area=area-warehouse-f&map=2d&tab=docs&device=io-1762-ia8
```

## Where it lives

| Role | Path |
|------|------|
| Source of truth (this tree) | `C:\Users\tobys\Downloads\Telegram Desktop\industrial-asset-graph-working` |
| Dev server | Vite 6 · host `0.0.0.0` · port **4173** · `base: '/industrial-asset-graph/'` |
| Runtime | Local Windows machine; Node.js 20+ |
| Shell | PowerShell |
| Remote dependencies | None; Mac mini / SSH / SMB are not required |

Any Golfgold checkout is a **different product**. Ignore it here.

## Start

```bash
cd "C:\Users\tobys\Downloads\Telegram Desktop\industrial-asset-graph-working"
npm install
npm run dev -- --host 0.0.0.0 --port 4173
npm test
```

Open `http://127.0.0.1:4173/industrial-asset-graph/`. Production-shaped preview: `npm run build && npm run preview -- --host 0.0.0.0 --port 4174` then `/industrial-asset-graph/`.

## Product honesty (do not violate)

- Unused relationship types stay count **0**: `FEEDS`, `CONTROLS`, `SENSES`, `INTERLOCKS_WITH` (also `SUPPLIES` / `UPSTREAM_OF` unused).
- Trace only `LOCATED_IN` / `CONTAINS` / `SUPPORTED_BY_EVIDENCE`.
- Walkdown / Keep is local-only. Keep never writes `facilityData`. Dest / motor / recovery overlay only after explicit **Apply**.
- Do not invent machines, surveyed coordinates, Line 2 `FEEDS`, wiring, LOTO steps, or motor HP.
- L2 film chapter is scene **5** or `path=line2`. L4 is **intro-only**. Do not regenerate film MP3s.
- The building layout is the fixed bird's-eye **2D schematic only**. There is no orbital 3D mode or map-mode toggle.
- Film Genie is an always-mounted **dock bar** (native `complete-project-film.mp3` clock). Mini only when opened. Not a modal / iframe. No autoplay on load.
- LOCAL_ONLY evidence stays unbundled. FIELD_VERIFY stays honest.

## Stack

Vite 6 + React 19 + TypeScript. 1e glass + Source Sans 3. Tests: Vitest (`npm test`).

## Surfaces that must stay one product

Dashboard (map + inspector Capture / Intel / Record / Docs / Log), phone Map / Find / Queue / Cabinet, Line 2 cabinet package, empty-area walk pack (does not create a machine), review graph-patch preview (`inGraph: false`).

## Out of scope

Golfgold, CMMS/SCADA/twin, App Store, auto-merge keep, new plants, new film audio, invented dests.

## Zip for handoff

A clean source zip (no `node_modules`, no golfgold) belongs outside OneDrive, preferably in **Downloads**.

Read **`AGENT-HANDOFF.md`** first. It is the current how-to (2D-only layout, assets list, honesty, URLs).

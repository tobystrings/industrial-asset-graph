# START HERE

This zip is **Industrial Asset Graph** (J. Lieb Foods). It is **not** Golfgold.

1. Read **`AGENT-HANDOFF.md`** (full how-to, assets, honesty).
2. Read **`docs/VISUAL-LAYOUT-CONTRACT.md`** before any UI/layout work. These rules are mandatory.
3. Then **`AGENT-ENV.md`** (machine / SSH / paths).
4. Run:

```bash
cd <repo-root>
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Open: **http://127.0.0.1:4173/industrial-asset-graph/**

- Building layout is the fixed bird's-eye **2D schematic only**. Legacy `map=3d` links resolve to 2D.
- Signed-in entry is the six-section Directory: Equipment, Repairs, Inventory, Documents, Facility Map, and Administration. Persistent Directory / My work navigation occupies its own bottom row on phones.
- Each task has a separate `?page=...` URL, including `?page=cabinet`, `?page=field`, and `?page=account`. Legacy links remain supported.
- More lists editing, review, setup, and help pages. The guide lives on Help rather than covering every workspace.
- Slate uses a 20 px reading baseline, 22 px actions, and 56 px controls. See [the approved page directory](docs/design/SLATE-REDESIGN-REVIEW.md) and [repair operations](docs/REPAIR-REVIEW.md). More preserves Everyday tasks, Records & review, Admin, and Advanced Tools. See `docs/LARGE-PRINT-REDESIGN.md` for the complete navigation map; `npm run test:large-print` checks all routes and synthetic asset/facility workflows.

Before completing UI work, all of these must pass:

```bash
npm test
npm run verify:data
npm run verify:visual-contract
npm run build
npm run test:visual
```

Do not weaken visual checks to make CI pass. Do not add golfgold files. Do not invent dests, motors, or film audio.

## Parts inventory

See [Parts Inventory](docs/PARTS-INVENTORY.md) for photo capture, local OCR, machine compatibility, stock movements, review, and photo backups. [Design](docs/PHOTO-INVENTORY-DESIGN.md) records the schema and migration decisions.

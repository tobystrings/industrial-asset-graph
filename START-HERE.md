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
- Cabinet: `?view=cabinet`
- Genie is the **bottom bar** unless you open Film / `?film=1`.

Before completing UI work, all of these must pass:

```bash
npm test
npm run verify:data
npm run verify:visual-contract
npm run build
npm run test:visual
```

Do not weaken visual checks to make CI pass. Do not add golfgold files. Do not invent dests, motors, or film audio.

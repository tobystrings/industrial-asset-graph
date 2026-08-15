# START HERE

This zip is **Industrial Asset Graph** (J. Lieb Foods). It is **not** Golfgold.

1. Read **`AGENT-HANDOFF.md`** (full how-to, assets, honesty).
2. Then **`AGENT-ENV.md`** (machine / SSH / paths).
3. Run:

```bash
cd "C:\Users\tobys\Downloads\Telegram Desktop\industrial-asset-graph-working"
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

Open: **http://127.0.0.1:4173/industrial-asset-graph/**

- 3D map is the **default**. `?map=2d` for the flat schematic.
- Cabinet: `?view=cabinet`
- Genie is the **bottom bar** unless you open Film / `?film=1`.

`npm test` must pass. Do not add golfgold files. Do not invent dests, motors, or film audio.

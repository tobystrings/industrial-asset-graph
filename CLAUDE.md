# Industrial Asset Graph — Claude Rules

Before changing UI, layout, responsiveness, maps, cabinets, machines, documents, troubleshooting, training, or editor views, read:

1. `START-HERE.md`
2. `AGENT-HANDOFF.md`
3. `docs/VISUAL-LAYOUT-CONTRACT.md`

`docs/VISUAL-LAYOUT-CONTRACT.md` is mandatory project policy.

Do not weaken, remove, bypass, or narrow visual tests to obtain a green build.

Before completing UI work, run:

```bash
npm test
npm run verify:data
npm run verify:visual-contract
npm run build
npm run test:visual
```

When adding a new major workspace family, add a representative state to `scripts/dashboard-visual-check.py`, including phone coverage.

Fixed/sticky chrome may not cover content. Phone layouts must be intentionally reflowed rather than shrunk desktop layouts. Technical drawings may pan/zoom only inside contained drawing surfaces.

Do not restore the large map `Fit to Screen` header button. Automatic fit plus the compact local `Fit` reset is the approved pattern.

# Industrial Asset Graph — Agent Rules

These rules apply to every automated coding agent working in this repository.

## Required reading before UI work

1. `START-HERE.md`
2. `AGENT-HANDOFF.md`
3. `docs/VISUAL-LAYOUT-CONTRACT.md`

The visual layout contract is mandatory project policy. Do not weaken, delete, bypass, or narrow its responsive/visual checks just to make CI pass.

## Required validation before completing UI work

Run and pass:

```bash
npm test
npm run verify:data
npm run verify:visual-contract
npm run build
npm run test:visual
```

If a new major machine, cabinet, electrical, document, troubleshooting, training, or other workspace is added, add a representative desktop/phone state to `scripts/dashboard-visual-check.py`.

Fixed/sticky chrome must never cover workspace content. Phone layouts must be deliberately designed rather than scaled-down desktop layouts. Large technical drawings may pan/zoom only inside a contained drawing surface.

Do not reintroduce the large map `Fit to Screen` header action. Automatic fit plus the compact local `Fit` reset is the approved pattern.

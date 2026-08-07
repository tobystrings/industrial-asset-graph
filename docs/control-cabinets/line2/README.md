# Line 2 Conveyor Control Cabinet

## Drawing package

- Drawing number: `L2-CC-INT-001`
- Revision: `A`
- Status: working documentation / field review required
- Power shown by approved reference: 480 VAC, 3 phase
- Control voltage shown by approved reference: 24 VDC

The production assets are published under `public/assets/line2/control-cabinet/`:

- `cabinet.svg` - interactive engineering geometry; every visible device is an individual `<g>` with a unique ID.
- `cabinet.png` - rendered review image.
- `cabinet.pdf` - printable single-sheet drawing.
- `metadata.json` - cabinet and device records matching the SVG IDs.
- `photos/cabinet_reference_render.png` - approved geometry reference supplied with the build request.

## Evidence boundary

The drawing reproduces visible device placement and labels from the approved reference render. It does not show conductors and does not infer wiring, load assignments, network topology, hidden components, cabinet asset ID, location, or panel source. Those fields remain `FIELD_VERIFY`.

## Regeneration

Run `python scripts/generate-control-cabinet.py` after an approved geometry or metadata revision, then run `npm run verify:data`, `npm run build`, and `npm run test:visual`.

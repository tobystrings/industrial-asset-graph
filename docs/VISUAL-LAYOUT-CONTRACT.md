# Industrial Asset Graph — Permanent Visual Layout Contract

This document is a required project rule, not optional guidance.

Every agent, developer, and future UI change must preserve these rules unless the repository owner explicitly changes this contract.

## 1. One responsive system

All major Industrial Asset Graph workspaces must use the shared responsive layout system. Do not create isolated pages with their own incompatible viewport assumptions.

Current major workspace families include:

- Facility map
- Asset directory
- Documents / knowledge library
- Control cabinets
- Machine / equipment views
- Electrical / controls views
- Troubleshooting views
- Training / procedure views
- Plant Manager / editor panels

When a new major workspace family is added, add a representative state to the visual audit in `scripts/dashboard-visual-check.py`.

## 2. Required viewport coverage

The visual audit must continue to cover at least these viewports:

- 1920 × 1080 desktop
- 1366 × 768 laptop
- 1024 × 768 tablet landscape
- 768 × 1024 tablet portrait
- 430 × 932 large phone
- 390 × 844 phone
- 844 × 390 phone landscape

Do not remove phone, tablet, landscape, or desktop coverage to make a test pass.

## 3. Fixed chrome may never cover content

The Plant Manager bar, Facility Guide, headers, navigation, and any future fixed/sticky chrome must reserve real layout space.

Required behavior:

- No map, drawing, form, Save control, document content, or workspace panel may sit underneath fixed UI.
- The rendered toolbar footprint must be measured or structurally reserved; do not rely on guessed magic-number spacing.
- Mobile toolbar actions may scroll inside their own toolbar when necessary, but must not create page-level horizontal scrolling.
- Do not hide toolbar actions behind masks or fades.

`src/ui/chrome-clearance.css` is the final fixed-chrome guard and must remain loaded after legacy UI styles.

## 4. Responsive behavior must be deliberate

Do not shrink desktop layouts until they technically fit.

Desktop may use multiple columns. Tablet must reflow intelligently. Phone must use an intentional stacked or locally scrollable layout.

At narrow widths:

- Text and buttons must remain readable.
- Controls must remain reachable by touch.
- Long labels must wrap or truncate intentionally.
- Grid/flex children must be allowed to shrink (`min-width: 0` where needed).
- No important content may be clipped off-screen.
- Page-level horizontal scrolling is a regression unless the page is explicitly a contained technical canvas.

## 5. Drawings, maps, cabinets, and schematics

Large technical visuals may have their own contained pan/zoom surface.

Rules:

- Pan/zoom belongs inside the drawing region, not the whole page.
- The surrounding page remains responsive.
- Automatic fit is the default on load and container resize when practical.
- After a user pans or zooms, a compact local `Fit` or `Reset View` control is allowed.
- Do not duplicate a large global `Fit to Screen` button when automatic fit and a compact local reset already exist.
- Technical drawings must not push inspector/data panels outside the viewport.

## 6. Control cabinet layout rule

Control cabinet views must follow this hierarchy unless a better tested layout replaces it:

Desktop:

`device list | cabinet drawing | selected-device information`

Tablet:

Cabinet drawing and selected information remain primary; the device list may collapse or reflow.

Phone:

1. Selected device / important information
2. Device list or selector
3. Cabinet drawing in a contained pan/zoom region

Do not simply scale down the desktop cabinet layout for phones.

## 7. Contrast and readability

Dark-on-dark and light-on-light text are regressions.

- Primary text must be clearly readable against its actual rendered background.
- Secondary text must remain visibly distinct, not merely technically present.
- Selected states, IDs, device names, area names, headings, labels, and values must remain legible.
- Visual screenshot review is required because geometry tests cannot catch every contrast or hierarchy problem.

## 8. CI is a release gate

A UI change is not complete because it builds locally.

Before merging to `main`:

- `npm test` passes.
- `npm run verify:data` passes.
- `npm run verify:visual-contract` passes.
- `npm run build` passes.
- `npm run test:visual` passes.
- Visual audit screenshots are reviewed for obvious layout, contrast, clipping, and hierarchy regressions.

Do not weaken, skip, delete, or narrow visual checks merely to obtain a green build.

## 9. New workspace rule

When a new major machine, cabinet, electrical, document, troubleshooting, or training workspace is introduced:

1. Reuse the shared shell/design tokens where possible.
2. Define intentional desktop, tablet, and phone behavior.
3. Add at least one representative screenshot state to the visual audit.
4. Verify fixed UI clearance.
5. Verify readable contrast.
6. Verify the workspace on a phone before merge.

## 10. Ownership

This contract is intentionally conservative. Existing proven responsive behavior is the baseline.

Future agents may improve the design, but they must not silently remove these protections. Any deliberate change to this contract should be explicit in the commit/PR description.

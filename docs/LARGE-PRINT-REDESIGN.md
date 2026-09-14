# Large-print interface redesign

## Inventory and navigation plan (before implementation)

All existing `PageId` values, legacy query links, inspector tab IDs, facility parameters, editor events and data operations stay intact.

| Existing location / functions | Redesigned path |
| --- | --- |
| Home: production cards before general tasks | Home: Find an asset, Map, Documents, Notes, Troubleshooting and Field documentation first; production cards and pending review below |
| Primary Home / Map / Assets / Docs / More | Same five routes, larger labels and unmistakable selected state; Documents spelled out on wider screens |
| More: three long columns of mixed tools | More: focused Everyday tasks, Records & review, Admin and Advanced Tools sections, with URL-backed group selection |
| Field observation form | Home → Notes, or More → Everyday tasks → Notes (existing `observation` route) |
| Lines, documentation queue, field sheet, field capture, evidence, cabinet, Wulftec, troubleshooting | More → Everyday tasks; all original pages remain directly addressable |
| Historical evidence, asset editing/creation, connections, dependencies, review, health, conflicts | More → Records & review |
| Facility setup/switching, account permissions, settings | More → Admin |
| Database, backup/export, private packages, CSV import, deployed source files | More → Advanced Tools |
| Genie and project tour | Ask Genie → Help; existing minimize, mute, settings and reminder behavior preserved |
| Asset inspector Overview / Capture / Intel / Record / Docs / Activity | Same state and tools; readable labels, larger section controls and explicit selected state |
| Map controls, prominent collapsible legend, selection, print/export | Same Map page; larger legend and controls, contained pan/zoom and local Fit |
| Map editor drawing, AI/text preview, objects, layers, history, source cleanup, full screen/pop out | Same Map → Edit map and existing focused editor sections |
| Asset/document links, photos, registers, electrical, machine and component records | Same asset/document destinations and deep links |

## Component-level implementation plan

1. Introduce shared reading, heading, spacing and target-size tokens. Migrate small HTML typography in existing styles to the shared reading token instead of stacking workspace-specific font overrides. Preserve technical SVG drawing coordinates and invisible hit labels.
2. Rework `AppShell` Home ordering and More groups. Share section controls through a reusable, accessible component. Preserve navigation history, modified-link behavior, facility selection and page focus.
3. Apply shared control sizing, visible keyboard focus, selected-state borders, wrapping and responsive cards. Retain neutral dark shell and vivid map colors. Reserve chrome with the existing grid.
4. Extend browser checks for Home/More navigation, readable text, target sizes and the relocated tool paths. Run all required tests and inspect desktop/tablet/phone screenshots. Exercise mutations only in isolated synthetic browser fixtures.

## Implementation

`src/ui/large-print.css` defines reusable reading, label, heading and touch-target tokens. Existing workspace styles consume the reading token (with an 18 px fallback for standalone contexts). The cabinet/map SVG text retains drawing coordinates; pan/zoom remains contained. The standalone Wulftec export also gets the reading baseline.

`SectionPicker` supplies native keyboard-operable, visibly selected group buttons. `toolGroups.ts` owns the More inventory; the `tools` query parameter survives reload/history and the Back-to-More link returns to the correct group. Every original More destination is checked exactly once by the navigation test.

The shell retains its reserved header/navigation rows, dedicated page scroll region, skip link, page focus, modified-click links, facility parameter and direct URLs. Home puts six common tasks ahead of production and review. Genie remains on Help with the original context, hide/recall, preferences, motion, notes and reminder behavior.

Map Studio tabs occupy their own row above a scrolling form body, so they remain reachable without covering field headings. The visual audit measures that separation.

## Validation record

The existing contract and all seven viewport sizes remain required. The added browser checks measure rendered reading text rather than checking stylesheet strings. `test:large-print` visits 36 route states at laptop, tablet portrait and phone sizes, and exercises synthetic asset creation, editing, save/reload, cancelled deletion, database export and facility switching/isolation.

Verified September 14, 2026:

- `npm test`: 61 files passed, 242 tests passed, one existing conditional historical-evidence test skipped.
- `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`: passed.
- `npm run test:visual`: passed at 1920×1080, 1366×768, 1024×768, 768×1024, 430×932, 390×844 and 844×390. Existing workflow and geometry assertions were retained; reading-size and Map Studio tab-clearance checks were added.
- `npm run test:map-editor`: passed rename, creation, wall removal, merge, asset preservation, undo/redo/cancel, markup isolation and persistent reload, including tablet/phone layouts.
- `npm run test:publication`: passed cross-device rename/attachment bytes, duplicate prevention, draft recovery, concurrent conflict, explicit resolution and reload.
- `npm run test:large-print`: passed 36 route states across laptop, tablet portrait and phone, plus synthetic asset forms, cancelled deletion, archive export and facility isolation. Results: `artifacts/large-print-results.json`.
- Manual screenshot review covered Home, focused tool groups, the vivid map/legend, cabinet, Map Studio properties, authentication, field documentation and Genie, including desktop, tablet and phone. This review caught and corrected overlapping sticky Studio tabs.
- Final source review: route IDs and underlying facility/data/auth operations unchanged; complete More destination inventory retained; whitespace checks passed.

The full visual/publication suites used the same publication-enabled synthetic Auth configuration as `.github/workflows/ci.yml`. The local build correctly uses its configured local-save mode, which the route/form sweep also exercised. No deployment configuration, credentials, saved user facility data or source evidence was changed. Generated browser data lives only in isolated test contexts. The normal local build is restored after CI-mode verification.

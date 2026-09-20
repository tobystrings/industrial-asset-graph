# Large-print specification audit — September 19, 2026

Specification: `industrial_asset_graph_large_print_ui_goal.txt`, supplied by the owner.
Reviewed baseline: `d82d82f843d7f4fbb9a85ab3d662bde855aa1b78`, matching freshly fetched `origin/main`.
The original large-print implementation was merged in PR #57. Subsequent Slate and giant-interface changes are already present; the older navigation map in `LARGE-PRINT-REDESIGN.md` describes its September 14 release, not today's entry screen.

## Inventory and current navigation

All original page IDs and legacy deep links remain in `src/navigation/pages.ts`.

| Original function | Current plainly labeled path |
| --- | --- |
| Find assets | Directory → Equipment; Directory search includes related parts and documents in the results |
| Locate equipment | Directory → Facility Map → area/equipment; Equipment → machine |
| Asset details, capture, intelligence, record, documents and activity | Equipment → machine → Overview → Full equipment record & evidence; original `asset` route and inspector tabs remain |
| Manuals, drawings, photos | Directory → Documents, or Equipment → machine → Manuals / Photos |
| Notes and repairs | Directory → Quick note or photo; Repairs / My work; original observations remain under Tools, account & help → Everyday tasks → Notes |
| Troubleshooting | Equipment → machine → Troubleshooting; Tools, account & help → Everyday tasks → Troubleshooting for documented connections |
| Electrical, controls, component records | Equipment → machine → Electrical / Controls → component; cabinet drawing and photo links remain contextual |
| Inventory, stock movements, OCR, backups | Directory → Inventory; its focused sections retain capture, compatibility, movement and backup operations |
| Production lines, field documentation, documentation queue, field sheets, evidence, Wulftec | Tools, account & help → Everyday tasks |
| Add/edit equipment, connections, dependencies, review, health, conflicts, historical evidence | Tools, account & help → Records & review; Add equipment is also on Equipment for admins |
| Shared repair review and app-change requests | Directory → Administration → Review Inbox / App-change requests |
| Facility setup/switching, account, display settings | Tools, account & help → Admin; Account also remains in the header |
| Database export/recovery, private packages, CSV import and original source archives | Tools, account & help → Advanced Tools |
| Map drawing, objects, layers, source cleanup, AI/text previews, history, undo/redo, export | Facility Map → More map options → Edit map; original Map Studio sections and save semantics retained |
| Genie, preferences, hide/recall, contextual assistance, tour | Tools, account & help → Everyday tasks → Guide & training; contextual Ask Genie links; tour has its own player |
| Back/Home and current location | Contextual Back link and page heading; persistent Directory / My work navigation in its own reserved row |

## Component plan before changes

1. Preserve the current reusable `AppShell`, `SectionPicker`, route metadata and shared Slate/large-print tokens. Current defaults already exceed the supplied 18 px minimum: 24 px reading text, 28 px action labels, 72 px controls.
2. Audit current rendered routes and workflows rather than reintroducing the older five-item navigation. Keep vivid map rendering and the collapsible legend, contained drawing pan/zoom, and compact local Fit.
3. Extend `scripts/large-print-browser-check.py` to cover the newer machine sections, inventory, repair entry and administration pages omitted from its original September 14 sweep. Stateful repair summaries and populated submissions remain exercised by the repair/admin journey rather than empty URL placeholders.
4. Run the required unit/data/contract/build/visual gates and the large-print, map-editor, publication and repair journeys. Inspect generated desktop/tablet/phone screenshots. Fix demonstrated regressions in their owning reusable component/style, without changing data, permissions, facility isolation or AI configuration.

## Verification

### Requirement evidence

| Requirement | Current implementation and verification |
| --- | --- |
| Large reading text, labels and touch controls | `src/ui/large-print.css` and `src/ui/slate.css` own shared 24/28/36 px reading/action/heading tokens and 72 px target sizing. The route sweep measures actual visible text and button geometry; technical drawings remain locally zoomable. |
| Focused navigation and plain labels | `AppShell.tsx`, `pages.ts`, `toolGroups.ts` and `SectionPicker.tsx` retain the Directory, contextual machine pages, four tool groups, keyboard behavior, current location and Back/history state. Navigation tests exercise link history and document context. |
| Clear hierarchy, contrast and vivid maps | Shared Slate cards and state styling, `map-workbench.css`, the collapsible map legend, contained canvas and compact Fit remain. Visual audit measures contrast, overflow, chrome clearance and target sizes; screenshots require visual inspection too. |
| Preserve data and workflows | No application source, route ID, permission, data model, saved plant data, evidence, import/export handler or AI configuration changed in this audit. Unit tests and isolated browser journeys cover their existing contracts. |
| Common maintenance tasks and Genie | Equipment, map, documents and quick note/photo are on Directory; machine pages expose troubleshooting. Help confines Genie to its own workspace. `FacilityGuide.tsx` has Minimize / Hide; `GuideSettings.tsx` has mute reminders and motion controls. The guide has no audio; tour playback remains separate. |
| Destructive operations | Asset deletion names the asset and consequences in a confirmation; the asset workflow cancels it and checks the record remains. Restore Baseline also requires explicit confirmation. |
| Reusable implementation and responsive behavior | The existing shared components/styles already implement the supplied redesign. This audit extends the original route sweep without removing its routes or assertions, adds it to CI, and gives each failing section its own screenshot filename. |

### Current run

- `npm test`: 71 files passed; 284 tests passed, one existing conditional test skipped.
- `npm run verify:data` and `npm run verify:visual-contract`: passed.
- `npm run build`: passed in normal and CI-style synthetic-auth configurations. The normal local build was restored and passed after all browser checks. Existing missing-background-reference, mixed-import and bundle-size warnings remain.
- `npm run test:large-print`: 51 route states passed at 1366×768, 768×1024 and 390×844, plus asset create/edit/reload, cancelled deletion, archive export and facility isolation at each size.
- `npm run test:map-editor`: passed rename, creation, wall removal, merge, preservation, undo/redo/cancel, markup isolation, reload and tablet/phone layouts.
- `npm run test:publication`: passed cross-device rename/attachment bytes, duplicate prevention, draft recovery, concurrent conflict, explicit resolution and reload.
- `npm run test:repairs`: passed technician capture/photo/resume, unknown outcome, shared receipt, clarification, admin correction, approval, competing-change conflict, apply, source retention, updated history and role separation.
- `npm run test:visual`: passed all nine viewports (1920×1080, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 360×800, 320×740 and 844×390), including populated repairs/review, Genie, map editing, cabinets, documents, CSV/private import, archive export, inventory, field capture, production and co-packing workflows. No assertions or viewport coverage were weakened.
- Visual inspection covered desktop Directory/map/Genie/Map Studio, laptop tool groups and manual, tablet administration/map, phone asset form/repair/Genie/Map Studio, and the 320 px Directory. No new overlap, clipping or contrast defect was found in these reviewed states.
- Final remote fetch still matched `d82d82f`; `git diff --check` passed. Existing local edits to `AGENTS.md`, `AGENT-HANDOFF.md`, `AGENT-ENV.md` and existing untracked files were preserved.

### Outcome

The requested interface already exists in the reviewed baseline. This task adds regression coverage and an up-to-date function-location map; it does not replace the current design or remove any function. At the September 19 audit completion, changes were local on `codex/large-print-spec-audit`. On September 20 the owner requested commit, push, merge and deployment; the pull request checks and subsequent Pages workflow provide release evidence.

Browser fixtures use synthetic accounts and isolated data; their results do not establish live backend or provider availability. GitHub reported successful [baseline CI](https://github.com/tobystrings/industrial-asset-graph/actions/runs/35413495109) and [baseline Pages deployment](https://github.com/tobystrings/industrial-asset-graph/actions/runs/35413495149) for the reviewed commit. Those results precede this test/documentation change and are not its release verification.

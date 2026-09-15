# Slate maintenance redesign — design review

Status: **approved by owner; implementation underway**. September 15, 2026. The owner explicitly approved everything in this task, including the reviewed design and the existing commit/merge/push/deploy scope. No further design or release approval is needed.

Source: `C:/Users/tobys/Downloads/industrial-asset-graph-slate-redesign-goal.txt`, activated by the owner's request to execute it as a goal, commit, merge, push and deploy. The goal explicitly requires review of the directory and phone previews before broad implementation. Existing facility records remain authoritative.

Open [the interactive phone previews](slate-preview.html). Four screens show the directory, a real machine's menu, an empty repair capture, and a clearly labeled illustrative administrator submission. Width selector: 320, 360, 390, 430 CSS pixels. Click a destination to inspect a full-page preview; browser Back returns to the board. These previews do not persist or upload data. Destinations outside the four representative screens are explicitly labeled as planned pages.

## Proposed navigation

Use two spacious persistent phone destinations: **Directory** and **My work**. Keep them in a reserved layout row, never over content. Each screen has a contextual back link, one title and a machine/section label. The directory has six choices. Account, accessibility, Help and the existing tour stay available through a small supporting menu. Desktop uses the same directory with a wider content region; technical workspaces retain deliberate multi-column layouts.

Main search finds equipment, parts and documents. Machine search uses existing familiar names, IDs and photos. Do not invent names or require an identification interview after machine selection. Preserve facilityId, machine ID, repair ID and return context in URLs; preserve browser Back/Forward and all existing deep links.

| Directory | Focused pages | Existing capabilities to retain |
|---|---|---|
| Equipment | Search; machine menu; overview; troubleshooting; repair history; electrical; controls; parts; manuals; photos; component; production lines; area | Asset directory/records; cabinet drawings/device inspection; Wulftec workspace; relationships; line membership; dependency records; utilities and source evidence |
| Repairs | My work; start/resume; observation timeline; guided next step; attachments; parts used; editable finish summary; submission receipt/status | Field documentation; observations; evidence attachment; service records; verified relationship trace; capture exports |
| Inventory | Find part; part record; photo/label capture; compatibility; stock action; activity; low stock; locations; reorder/review request | Existing OCR, manual entry, barcode fallback, compatibility evidence, stock event IDs, sequence conflicts and photo backups |
| Documents | Search; manual/drawing reader; equipment documents; photos; source archive; historical evidence; procedures/training | Existing documents, OEM packets, source provenance, import history and evidence exports |
| Facility Map | Map; area; selected equipment; local fit/reset | Real geometry, vivid object colors, contained pan/zoom, linked records. Editing moves to Administration |
| Administration | Review Inbox; submission detail; proposed change comparison; clarification; application receipt; app-change requests; conflicts; documentation queue; data health; manage equipment; dependencies; Map Studio; setup; import; backups | Existing permissions, Plant Manager, facility imports, publication revisions, conflict resolution and map planning |

Existing route mappings: `home`→Directory; `assets/asset/component/cabinet/wulftec/lines/area`→Equipment; `field/observation/evidence/maintenance/relationships`→related equipment and repair pages; `inventory`→Inventory; `documents/history`→Documents; `map`→Facility Map; `review/manage/assetAdd/connection/dependencies/setup/database/conflicts/health/import/documentation`→Administration; `account/settings/help`→supporting menu. `more` remains a compatible directory alias. Technician capture stays available independently of administrator-only editing.

## Shared appearance

| Token | Value |
|---|---|
| Background | #1B303C |
| Raised surface | #263D49 |
| Primary text | #F2EDE3 |
| Supporting text | #C3D0D2 |
| Border | #47616A |
| Primary action / selected accent | #91D8C7 |
| Primary action text | #193B37 |
| Secondary control / navigation | #334F58 |

Body 20–22px; actions/navigation 22px; page headings 28–36px; supporting text ≥18px; controls ≥56px. Reflow at narrow widths and enlarged text, with browser zoom intact. Shared tokens must cover login, dialogs, errors, tables, inventory, map controls, standalone controls and administration. Preserve the vivid facility object colors and original drawing/source files. Genie is optional, brief, dismissible and contained on the relevant help step; no floating obstruction or autoplay.

## Audit findings and implementation implications

Audit baseline: main `4c2b3e4`, photo-first parts inventory PR #58. Unrelated pre-existing untracked files and graph-query cache remain untouched.

1. **Routing and shell exist.** `src/navigation/pages.ts`, `AppShell.tsx` and `src/App.tsx` already use direct `?page=` URLs and browser history. Current Home repeats a title, introduction, seven task cards, publication tools and production-line cards. Live production Home confirmed these elements and the neutral black theme. Reorganize the shared shell rather than layering another global toolbar over it.
2. **Shared publication exists.** `src/facility/publication.ts` uploads explicitly public attachments with content hashes, publishes revisions via `iag_publish`, submits technician snapshots via `iag_submit`, and receives shared proposals. `server/migrations/002_public_publication.sql` and `003_public_submissions.sql` define the shared publication and submission records. `FacilityProvider.tsx` has local canonical approval and audit events. This is useful infrastructure, but not yet a per-submission review state machine with an atomic apply receipt.
3. **Repair continuity is a gap.** Observations, field sheets, attachment storage and service information are spread across pages. Add a repair record with a stable ID, appendable observations/measurements/parts/results, automatic local persistence, resumable attachments and an editable final summary. Associate selected equipment once. A completed repair may be entered directly.
4. **Review needs its own model and transaction.** Preserve immutable original text/file references, submitter identity and server timestamps separately from editable interpretations. Suggested states: received, needs clarification, ready for review, approved, applied, rejected; local/pending upload are transport states. An administrator approves a specific proposal revision; apply checks the destination base version and writes the destination plus application receipt atomically with an idempotency key. A mismatch returns a visible conflict. Approval alone cannot display Applied. Server authorization must enforce facility and role independently of UI checks.
5. **Offline status must be explicit.** Render On this phone → Waiting to upload → Received by team only after each acknowledgement. Retain stable operation/attachment IDs across retries. An upload error cannot remove the local original. Review must accept unclassified input with no AI dependency.
6. **Inventory already has substantial implementation.** `src/inventory/InventoryWorkspace.tsx`, `src/facility/inventory.ts`, `docs/PARTS-INVENTORY.md` cover photo-first capture, local OCR, reviewed identities, evidenced machine compatibility, stock movements and backup. Split its views into focused routes, retain invariants and connect parts-used to repair context without double-debiting stock on retry.
7. **Prompt Hub integration needs resolution.** The inspected application source did not expose an existing Prompt Hub route or adapter. Use the goal's permitted administrator app-change workflow with source-linked drafts, approval and progress states unless an existing hub is located during integration. Record approval never executes code; approved software requests proceed through repository review and release.
8. **AI is currently specialized.** Existing Supabase `map-studio` and server map planning use the configured Gemini path. General repair retrieval/summarization has not been verified. Begin with linked, evidence-grounded records; preserve all captures when AI is unavailable. Keep the existing no-paid-service constraints.
9. **Deployment is established.** `.github/workflows/deploy-pages.yml` builds and deploys main to GitHub Pages. Latest inspected run `34896473800` succeeded. GitHub variables list a Supabase URL and no `VITE_IAG_API_URL`; deployed Home shows publication controls. Therefore validate the Supabase path first; do not assume the optional Node HTTP adapter is deployed. Live mutation, permission and provider success remain unverified at this design stage.
10. **Visual checks require an explicit palette update.** `scripts/dashboard-visual-check.py` currently asserts neutral grayscale shell channels. Replace only those superseded color expectations with approved Slate tokens and measured contrast. Preserve all geometry/workflow checks, extend with 320/360 widths and the new repair/review workspace states. Do not weaken the permanent contract.
11. **A live publication failure is visible.** Deployed Inventory displayed “Saved locally; shared save needs attention: Co-packing: invalid claim evidence” in the existing browser session. Inventory itself displayed its capture, machine finder, seven sections, empty parts list and reorder form. Do not treat this session as proof of working shared saves. Diagnose the rejected evidence reference and preserve originals before migration or shared workflow acceptance; no publication retry was clicked during the audit.

## Staged implementation after review

1. Shared Slate tokens, simpler shell/directory and route compatibility. Retain existing record, map, inventory and document capabilities; inspect all representative screens.
2. Focused equipment pages and repair capture/resume with local outbox, attachments, summary, real record links and parts usage.
3. Shared unclassified submissions and administrator inbox, immutable source, editable proposal, clarification, transactional version-aware apply, durable receipts and source-linked app-change drafts. Add non-destructive migration and recovery instructions; verify against configured shared storage.
4. Grounded optional AI assistance, polished remaining workspaces, integration and accessibility checks. Commit coherent changes, push branch, pass CI, merge main, monitor Pages deployment and smoke-test deployed routes.

## Release evidence required

- `npm test`, `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`, `npm run test:visual` all pass. Also run affected inventory, large-print, publication and live backend tests.
- Visual review at 320, 360, 390, 430 plus existing tablet, landscape and desktop coverage; enlarged text; contrast; 56px main touch controls; no chrome overlap or page overflow.
- Known machine → manual/history; repair notes + photos → leave → resume; unclassified submission → shared receipt; authorized admin → correction → approval → apply → correct destination record; unauthorized action denied; attachment failure/retry; repeated apply; changed destination conflict; intact original evidence and facility isolation.
- Production backend and deployment tests must be distinguished from synthetic/browser fixtures. A configured endpoint or passing local test is not live integration proof.

## Review decision

Review the six-section directory, two-destination phone navigation and four phone previews. After owner review is resolved, proceed with the entire authorized implementation and release. No application code, shared record or production deployment has been changed in this design stage.

## Design-stage verification

- All four previews were visually inspected at the requested 390px viewport; repair was also inspected at 320px. Twenty-four DOM geometry checks across requested 320/360/390/430/768/1366 viewport widths passed after fixing the prototype scroll region. This browser reports some widths one CSS pixel larger due to viewport rounding. No horizontal overflow or header/navigation overlap was measured; controls use a 56px minimum (rendered approximately 55.99px).
- Baseline `npm test`: 64 files passed; 253 tests passed and one pre-existing test skipped.
- Baseline `npm run verify:data`: passed; 16 areas, 4 machines, 29 components, 27 document categories, 50 relationships; 56 mapped cabinet devices.
- Baseline `npm run verify:visual-contract`: passed.
- Baseline `npm run build`: passed, with existing unresolved background asset and bundle/dynamic-import warnings.
- Baseline `npm run test:visual`: passed at all seven desktop/tablet/phone viewports on September 15, 2026. The first run used a local-only build and failed its publication-status expectation; rebuilding with CI's `VITE_IAG_PUBLICATION=true` and synthetic Supabase authentication settings resolved that configuration mismatch. No assertions were changed. The rerun completed successfully, including the 390px walkthrough, room/asset inspector, manager, document, map editing and cabinet states. Representative desktop Home, laptop equipment and phone field-sheet screenshots were visually inspected. These baseline checks do not establish correctness of the future redesign or live shared review workflow.
- The production shared-save error originates from `validateCopacking` claim validation (`src/facility/copacking.ts`): possible causes include an unsupported claim status, a missing evidence list, or a reference absent from package evidence. The affected live record and root cause remain unverified; do not erase evidence or relax the validator to bypass this failure.
- All preparatory verification is complete. Owner design review is now resolved by explicit approval in this task. Proceed with the full implementation and release; do not request approval again.

## Implementation checkpoint — September 15, 2026

Owner approved the full scope, including commit, push, merge and deployment. Implementation is in progress on codex/slate-maintenance-redesign; the redesigned app has not been deployed.

- Shared Slate CSS, directory, focused machine routes, local repair capture/resume and review UI are implemented but still require the full responsive and integration gate.
- Migration server/migrations/004_repair_review.sql was installed in the existing Supabase project fgzjoiyuhutqcsuaukhu. SQL Editor readback confirmed iag_reviews and iag_work_save(uuid,text,bigint,uuid,jsonb) after COMMIT.
- Before installation, the migration plus 004_repair_review.check.sql ran inside BEGIN/ROLLBACK against the live database. Its result was PASS for save, duplicate, conflict, immutable originals, author/admin authorization, clarification, approval distinct from application, asset/repair/document/inventory destinations, app-change drafts and repeated application. All test users, test records and canonical test changes were rolled back. This proves database transactions, not the still-unverified browser journeys.
- Local repair storage tests (4) and seed-recovery test (1) pass. The seed-recovery fixture now correctly represents an existing production configuration missing its later copacking section. It preserves existing equipment and retains the pre-migration package.
- Remaining: complete inventory context and repair linkage, grounded optional AI assistance, transport/backup robustness, live publication evidence repair, expanded browser journeys and all required visual/build gates, then commit/push/merge/deploy.

## Second implementation checkpoint — September 15, 2026

- Backend stage committed and pushed as bf66563 (durable repair/review SQL and grounded repair-assistant function). The optional repair-assistant function is deployed in fgzjoiyuhutqcsuaukhu and uses verified Supabase Auth, consistent with the existing map-studio handler. A live anonymous request returned 401 from the handler. Authenticated Gemini provider success still needs live verification; no claim is made that this has passed.
- Added original-byte repair backup/recovery with hash checks, non-overwriting restore, attachment conflict-copy recovery, upload-response retry tests, in-flight editing protection, stable submission retries, and renewal of signed attachment links. Inventory now supports section/part/search URLs and records stock-use references back into the active repair without duplicating its entry on a retry.
- Added machine/repair context links, corrected manual source lookup to use document paths, and separated electrical versus control component menus. Optional AI drafts remain separate from original notes/files and show citations and unknowns.
- npm test: 69 files passed, 265 tests passed, 1 pre-existing skip. verify:data and verify:visual-contract passed. CI-format production builds passed. The new test:repairs browser test passed with separate technician/admin sessions: photo capture/resume, actual manual, unclassified note, receipt, clarification, corrected proposal, approval, competing destination conflict, application, original retention and updated repair history.
- Visual audit now includes all original seven sizes plus 320 and 360, and representative focused machine/repair/review states. Its first failures exposed a shell color override and missing part-detail balance; those were fixed. The next pass exposed prefilled textarea accessible-name ambiguity; explicit labels fixed it and the focused journey passed. The latest full nine-size audit is still running (exec session 77307). Do not restart it merely because observation times out. Latest build excludes the subsequent signed-link refresh and inventory URL duplicate-history fix, so a final rebuild remains required.
- Public shared snapshot revision 25 was downloaded to ignored artifacts/shared-publication-audit.json and passed validateFacilityPackage. No canonical production record was changed by this audit. The older local missing-evidence recovery remains additive with a saved original package.
- UI changes and new tests remain uncommitted. No frontend merge or Pages deployment yet. Remaining: finish full visual/map/publication/large-print checks, text scaling and source/contrast audit, positive live assistant and shared inbox verification, final documentation and release requirement audit, then commit/push/PR/merge/Pages deployment and live smoke tests. Preserve unrelated observer text and graphify cache/memory untracked files.

### Latest audit follow-up

The full audit session 77307 reached the private asset import workflow and found that the legacy button labeled Open asset record was opening the new machine menu. Restored its direct asset-record route in App.tsx; the new Equipment directory and map still open the approved machine menu. This fix is newer than the running audit build. The running audit remains useful for the other viewport checks; it must finish or be explicitly stopped before the next rebuild. All 265 unit tests passed; tsc passed before this one-line route correction. New authenticated Genie positive/live shared inbox checks, text-scaling verification, final full gates and frontend release remain incomplete.

## Release candidate verification — September 15, 2026

The final local nine-viewport visual audit passed after the legacy asset-record navigation correction. The production-shaped build includes signed-file link renewal, inventory browser-history deduplication and the original standalone project tour export. Screenshots of the 320 px directory at 150% text size and the 390 px tour were visually reviewed: text reflows and controls occupy reserved space.

All 69 unit-test files passed (265 tests, one pre-existing skip). Data and permanent visual-contract verification passed. Public publication verification validated all 107 original source hashes. The repair/admin journey, cross-browser publication, map editing, inventory workflow and 36-route large-print sweep passed. The repair journey also verifies 150% text size at 320/390/1366 and tour playback.

These are local browser fixtures and repository gates. The real database transaction harness passed separately as recorded above. Real signed-in local capture returned Received by team for a factual application release-check note; the optional assistant rejected the localhost invocation (the production origin remains the allowed boundary). Production-origin provider verification, frontend CI/merge/Pages and live smoke checks remain pending.

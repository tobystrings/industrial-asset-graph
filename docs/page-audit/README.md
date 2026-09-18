# Page-by-page system audit — 18 September 2026

Reviewed app commit: `fc6b04effb4f4cbc8b0644af2f8be418d7f8c90d`. Fetched integration/live Pages baseline at audit start: `4e19597c51d6b0486b13405744a03e594cd9b53b`. **These are different versions. This audit covers the draft readability branch, not a deployment of it.**

Local Chrome, disposable authentication/service fixtures, published snapshot route identifiers. No production records were changed. Runtime backend credentials, real authorization/passkeys, email, microphone permissions, physical equipment truth and actual cross-device publication remain unverified. A successful link click is not a successful business transaction.

GitHub CI for the reviewed commit is **failed**, at the enlarged-text repair-journey geometry assertion: https://github.com/tobystrings/industrial-asset-graph/actions/runs/35381930053 . The draft branch is not demo-ready.

Coverage: 40 registered pages; 73 explicit page/subpage/standalone states; 146 viewport captures; 353 screenshots; 378 successful representative link clicks. 5 link attempts were inconclusive (including collapsed links and navigation-context changes). Raw measurements and screenshots are in `artifacts/page-audit/`; open `index.html` there for the interactive graph and evidence.

## Walkthrough syllabus

1. **Start and orient:** Directory → Equipment → Machine → section → record/document/component. Check the parent and recorded Back destination at each step.
2. **Do a job:** My work → Repair → Finish repair → Review Inbox → Review submission → machine history.
3. **Find and account for spares:** Parts Inventory → capture/OCR → part → location/balance → stock activity.
4. **Understand the plant:** Map → Area → Asset; Cabinet → Component; Troubleshooting → documented relationships.
5. **Build knowledge:** Documents, Historical evidence, Production lines, Documentation queue, Equipment field sheet, Dependency records, Field documentation.
6. **Maintain records:** Add equipment, Manage assets, Connections, Attach evidence, Record a finding, Review changes, Data health.
7. **Operate the system:** Administration, App-change requests, Account, Plant setup, Settings, Resolve sync conflicts, Plant database, Import records.
8. **Train and browse sources:** Guide & training, standalone project tour, standalone machine viewer, evidence archive and recovered sources.

## Confirmed issues and usability findings

### F7 · Medium · Phone asset tabs conceal the selected section

The phone tab strip initially exposes only Overview. Direct links to Record, Intel, Docs and Capture show different content below, but the selected tab is offscreen in the horizontal strip. Some lower action labels also wrap awkwardly.

Recommended correction: Provide a visible current-section selector on phones; avoid making users discover a hidden horizontal tab strip.

Evidence: [phone-screen-61-0.png](evidence/phone-screen-61-0.png), [phone-screen-62-0.png](evidence/phone-screen-62-0.png), [phone-screen-63-1.png](evidence/phone-screen-63-1.png)

### F6 · High · Manage assets rows overlap on phone

At 390×844, wrapped equipment names and metadata overflow their 72px rows and overlap the next entry. Edit is squeezed into individual letters. This is visible despite passing minimum-font/minimum-target checks.

Recommended correction: Prevent list rows from flex-shrinking, allow content-driven height, and reserve space for Edit. Check text containment, not just button dimensions.

Evidence: [phone-screen-29-0.png](evidence/phone-screen-29-0.png)

### F1 · High · Data health Open and Trace are dead ends

Both clicks leave the page unchanged. PlantManager dispatches iag-focus-verification-target, but only Dashboard installs its listener and Dashboard is not mounted on this route.

Recommended correction: Navigate through the shared router, then focus the requested record/trace. Add tests from the actual health route.

Evidence: [action-1.png](evidence/action-1.png), [action-2.png](evidence/action-2.png)

### F2 · High · Plant database clips horizontally on phone

Reproduced at 390×844 in the full large-print route suite. Statistics, export and replacement controls extend past the available width.

Recommended correction: Stack the statistics and import choices on phones; allow labels to wrap and constrain field widths.

Evidence: [large-print-390-database.png](evidence/large-print-390-database.png)

### F3 · High · Directory fails with enlarged text on a narrow phone

At 320×900 and 150% text, page-scroll reports clientWidth 340 and scrollWidth 374. The repair suite stops here after its core transaction checks.

Recommended correction: Make shell/navigation and task cards reflow at 320px with enlarged text; retain the failing assertion.

Evidence: [FAIL-repair-text-overflow.png](evidence/FAIL-repair-text-overflow.png)

### F4 · Medium · The first screen often shows chrome instead of the task

Large type is present, but repeated titles, context, tabs, status blocks and introductory copy consume the initial viewport. Map drawing is below the initial desktop fold; inventory entry is displaced by duplicate navigation.

Recommended correction: Keep one useful title/context line. Put the main action or working surface immediately beneath it, and disclose secondary navigation/status.

Evidence: [desktop-screen-15-0.png](evidence/desktop-screen-15-0.png), [phone-screen-8-0.png](evidence/phone-screen-8-0.png), [phone-screen-25-0.png](evidence/phone-screen-25-0.png)

### F5 · Medium · Legacy technical workspaces use a different interaction pattern

Legacy black tabs and technical panels coexist with newer task cards. Direct Troubleshooting entry asks for an asset without an inline picker.

Recommended correction: Use consistent task navigation and provide a clear asset selector at an empty trace entry.

Evidence: [desktop-screen-17-0.png](evidence/desktop-screen-17-0.png), [desktop-screen-24-0.png](evidence/desktop-screen-24-0.png)

## Functional evidence

Visual inspection covered the initial desktop and phone capture of every registered page and listed substate, plus selected scrolled samples. All 353 images are available; every scroll position, modal, role and data permutation is not visually signed off. Two device-directory captures timed out waiting for finite animations; their screenshots exist, but their large-print assertion is inconclusive. The bounded timeout exposes this harness limitation rather than silently accepting it.
- Inventory workflow: passed at 1366×768, 768×1024 and 390×844.
- Map editing: rename/add/remove-wall/merge, asset preservation, undo/redo/cancel, markup isolation and reload passed.
- Simulated publication: cross-device rename and attachment bytes, duplicate prevention, draft recovery, concurrent conflict, explicit resolution and reload passed.
- Repair suite: core submission/review/clarification/approval/application checks reached completion; full suite **failed** at the subsequent 320px enlarged-text Directory check. Later checks in that invocation did not run.
- Large-print suite: asset create/edit/cancel-delete/export/isolation checks passed; full suite **failed** on phone Plant database overflow.
- Earlier nine-viewport visual suite passed on the same app commit. The new failures show that its coverage was incomplete; it is not evidence that every page/task works.

- PASS: Health verification. Disposable fixture or local media.
- FAIL: Health Open target. Open target did not leave Data health or change the URL.
- FAIL: Health Trace target. Trace target did not leave Data health or change the URL.
- PASS: Observation save and reload. Disposable fixture or local media.
- PASS: Evidence upload, open and reload. Disposable fixture or local media.
- PASS: Connection guard, create and reload. Disposable fixture or local media.
- PASS: Facility and area save. Disposable fixture or local media.
- PASS: Settings persist. Disposable fixture or local media.
- PASS: CSV preview, import and read back. Disposable fixture or local media.
- PASS: Account refresh and username. Disposable fixture or local media.
- PASS: Line rationale save/reload. Disposable fixture or local media.
- PASS: Survey task save/reload. Disposable fixture or local media.
- PASS: Field sheet stage save/reload. Disposable fixture or local media.
- PASS: Dependency create/readback. Disposable fixture or local media.
- PASS: Nested Back returns one level 1366. Disposable fixture or local media.
- PASS: Nested Back returns one level 390. Disposable fixture or local media.
- FAIL: Manage asset row content stays inside its button at 390px. [{'name': 'L4 Meta Case Former\nFG-L4-MTN-001 · Packaging Machine · Line 4\nEdit', 'buttonHeight': 72.390625, 'textHeight': 138.375, 'overhang': 33}, {'name': 'Line 2 Conveyor Control Cabinet\nL2-CC-001 · Control Cabinet · Line 2\nEdit', 'buttonHeight': 72.375, 'textHeight': 138.375, 'overhang': 33}, {'name': 'Wulftec WCRT-200 Stretch Wrapper\nLIEB-WULFTEC-A6882 · Stretch Wrapper · Line 4\nEdit', 'buttonHeight': 72.390625, 'textHeight': 138.375, 'overhang': 33}, {'name': 'Kosme TOP II AD Tandem Labeler\nLIEB-KOSME-TOPIIAD-L05358 · Labeler · Line unconfirmed\nEdit', 'buttonHeight': 84.625, 'textHeight': 171.96875, 'overhang': 43.671875}, {'name': 'Line 2 Climax Drop Packer\nLIEB-L2-CLIMAX-6759 · Packaging Machine · Line 2\nEdit', 'buttonHeight': 84.625, 'textHeight': 171.96875, 'overhang': 43.671875}, {'name': 'Climax Pick N Pack — control cabinet\nLIEB-L2-CLIMAX-6759-CABINET · CONTROL_CABINET · Line 2\nEdit', 'buttonHeight': 96.859375, 'textHeight': 205.5625, 'overhang': 54.359375}]
- PASS: Tour play, next and pause 390. Disposable fixture or local media.
- PASS: Tour play, next and pause 1366. Disposable fixture or local media.

## Navigation behavior and graph

The interactive graph uses actual rendered destinations and representative clicks. Select a page to see incoming/outgoing edges, purposes, controls, states and screenshots. Edges distinguish clicked, rendered only, inconclusive, workflow-suite, source-only and broken. The anchor sweep checks the destination page key; it does not assert every context/query argument. Desktop runs click representative destinations; phone runs capture layout, supplemented by separate workflow and Back tests. Shared Home/Account/My work links can be hidden to expose task relationships. Button-only transitions are not exhaustively covered by anchor extraction; explicit workflow/broken/source edges are added separately.

Back uses recorded in-app history when available; a direct link uses the route’s parent fallback. The per-page fallback below is therefore not always the actual Back destination. Route aliases (`view`, `manager`, `trace`, `field`) are normalized by `readPage`; they are not additional registered pages.

Machine sections, inventory sections and asset tabs are states within a page. The graph preserves their exact link query strings. Standalone content does not use the same app shell or Back behavior.

## Every registered page

### 1. Machine (`machine`)

- **Does:** Choose Overview, Troubleshooting, Repair history, Electrical, Controls, Parts, Manuals or Photos for the selected machine. Start a repair.
- **Goes to:** asset, assets, cabinet, component, documents, evidence, inventory, machine, maintenance, manage, relationships, repair.
- **Direct-link Back fallback:** `?page=assets`.
- **Visual review:** Readable task list. Most detailed views require scrolling. Climax cabinet fixture has no photo; do not mistake that empty state for verified production photo coverage.
- **Functional review:** Eight sections and representative destinations clicked. Guided troubleshooting covered by earlier visual suite; live PLC data is not connected.
- **Measured states:** 22 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/machines/MachinePages.tsx`

### 2. My work (`repairs`)

- **Does:** List and resume local repair drafts and submitted work.
- **Goes to:** repair.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Readable cards; “On this phone” is misleading on desktop.
- **Functional review:** Repair workflow exercised in disposable technician/admin sessions.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/RepairPages.tsx`

### 3. Repair (`repair`)

- **Does:** Capture a machine problem, notes, files and work details; save a draft and prepare a summary.
- **Goes to:** inventory, machine, repairSummary.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Large controls; context and draft status take substantial room before entry fields.
- **Functional review:** Core repair journey passed before a later, unrelated home-layout assertion stopped the suite. Live microphone capture is unverified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/RepairPages.tsx`

### 4. Finish repair (`repairSummary`)

- **Does:** Review the captured repair, edit its summary and submit it for administrator review.
- **Goes to:** repair, submission.
- **Direct-link Back fallback:** `?page=repair&asset=L2-CC-001`.
- **Visual review:** Long review form; initial direct-link audit uses a draft, not a populated completed job.
- **Functional review:** Submit/review path exercised by repair-browser-check.py.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/RepairPages.tsx`

### 5. Administration (`admin`)

- **Does:** Enter the review inbox, app-change requests and administration tools.
- **Goes to:** documentation, health, inbox, map, more, requests, review.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Shared-save status block competes with the actual task choices.
- **Functional review:** Navigation checked. Production authorization and publication remain unverified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/ReviewPages.tsx`

### 6. Review Inbox (`inbox`)

- **Does:** Find submitted technician work and open its original evidence and proposed changes.
- **Goes to:** admin.
- **Direct-link Back fallback:** `?page=admin`.
- **Visual review:** Empty state is readable; populated review appears in the separate repair workflow.
- **Functional review:** Technician submission and administrator review exercised in fixture.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/ReviewPages.tsx`

### 7. Review submission (`submission`)

- **Does:** Read immutable original work, ask for clarification, propose edits, approve and apply changes.
- **Goes to:** inbox.
- **Direct-link Back fallback:** `?page=inbox`.
- **Visual review:** Without a submission ID this route falls back to the inbox. A base-route screenshot alone cannot prove a review works.
- **Functional review:** Populated clarification/proposal/approval/application and original preservation exercised in repair workflow.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/ReviewPages.tsx`

### 8. App-change requests (`requests`)

- **Does:** Review proposed changes to the application and their release-process status.
- **Goes to:** admin.
- **Direct-link Back fallback:** `?page=admin`.
- **Visual review:** Empty-state capture only.
- **Functional review:** Navigation checked; a populated request approval/release workflow was not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/repairs/ReviewPages.tsx`

### 9. Parts Inventory (`inventory`)

- **Does:** Search parts, photograph or upload a label, correct OCR, store a part, match machines, track locations, low stock and stock movements.
- **Goes to:** database, review.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Duplicate top actions plus seven tabs push the task below the first screen, especially on phones.
- **Functional review:** Inventory transaction suite passed desktop/tablet/phone; seven sections captured.
- **Measured states:** 16 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/inventory/InventoryWorkspace.tsx`

### 10. Historical evidence (`history`)

- **Does:** Browse recovered plant evidence, uncertainties and field tasks; follow sources to equipment.
- **Goes to:** asset, more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Repeated introduction and headings delay records. Collapsed-content links appeared in the DOM inventory and could not be clicked while hidden.
- **Functional review:** Visible route links checked; hidden-link attempts are inconclusive, not confirmed broken navigation.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/history/HistoricalWorkspace.tsx`

### 11. Production lines (`lines`)

- **Does:** Inspect production lines and their equipment/flow documentation.
- **Goes to:** asset, dependencies, documentation, documents, lines, maintenance, more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Tabs and repeated heading occupy the top.
- **Functional review:** Route links checked; line rationale save/reload passed. Every line and flow variant not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/production/ProductionWorkspace.tsx`

### 12. Documentation queue (`documentation`)

- **Does:** Prioritize missing field knowledge and documentation work.
- **Goes to:** assetAdd, dependencies, documentation, lines, maintenance, more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Introductory copy and tabs delay the queue.
- **Functional review:** Navigation/geometry captured; new survey task save/reload passed.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/production/ProductionWorkspace.tsx`

### 13. Equipment field sheet (`maintenance`)

- **Does:** Record line membership, dependencies and service history for equipment.
- **Goes to:** asset, dependencies, documentation, documents, evidence, lines, machine, maintenance, manage.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Machine context is repeated before the form.
- **Functional review:** Process-stage field save/reload passed. All field-sheet and service-record variants not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/production/ProductionWorkspace.tsx`

### 14. Dependency records (`dependencies`)

- **Does:** Document typed equipment dependencies with supporting evidence.
- **Goes to:** dependencies, documentation, documents, lines, maintenance, more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Form lies below explanation and production tabs.
- **Functional review:** Create an unverified dependency, reload the connections list and open its relationship type: passed.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/production/ProductionWorkspace.tsx`

### 15. Directory (`home`)

- **Does:** Find a task; search across equipment, parts and documents.
- **Goes to:** admin, assets, documents, inventory, map, more, repair.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Six task cards and More are clear at desktop size. Fails at 320px with 150% text: horizontal clipping.
- **Functional review:** Navigation exercised; enlarged-text layout failed.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/navigation/AppShell.tsx`

### 16. Map (`map`)

- **Does:** Locate areas and equipment; select a record; edit layout when authorized.
- **Goes to:** area, help, machine.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** At 1366×768 the map drawing starts below the first screen. Overview labels remain dense; readable area selection is essential.
- **Functional review:** Map-editor transaction suite passed including undo/redo/cancel and reload. Source map accuracy is not certified.
- **Measured states:** 4 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/map/DetailedBuildingLayout.tsx`, `src/map/MapStudioPanel.tsx`

### 17. Equipment (`assets`)

- **Does:** Search equipment, open a machine, or browse devices grouped by area and line.
- **Goes to:** asset, assetAdd, assets, component, lines, machine, map.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Primary list is straightforward. Device/area mode is denser and contains disclosures.
- **Functional review:** Representative machine links clicked. Device mode checked separately; inspect recorded animation/layout findings.
- **Measured states:** 4 desktop/phone captures. Automated findings recorded; inspect the artifact.
- **Source:** `src/machines/MachinePages.tsx`, `src/AssetDirectory.tsx`

### 18. Asset record (`asset`)

- **Does:** Read a legacy detailed asset workspace: overview, capture, intelligence, record, documents and activity.
- **Goes to:** inventory, machine, maintenance, standalone-screen-69.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Black legacy tab strip differs from the newer shell; repeated identity and service link push content down.
- **Functional review:** Four explicit tabs captured; not every legacy action or field-capture mutation exercised.
- **Measured states:** 10 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/dashboard/SelectedAssetPanel.tsx`, `src/Dashboard.tsx`

### 19. Area details (`area`)

- **Does:** Review equipment and field observations for one area; export its walk pack.
- **Goes to:** map.
- **Direct-link Back fallback:** `?page=map&area=area-warehouse-e`.
- **Visual review:** Global verification information precedes selected-area content. Empty Warehouse E is a legitimate captured state.
- **Functional review:** Navigation captured; walk-pack content accuracy not verified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/Dashboard.tsx`

### 20. Documents (`documents`)

- **Does:** Search/filter manuals and evidence, open a document, and follow machine context.
- **Goes to:** documents.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Large filters and group cards make a long list. Selected-document and Draft-filter states captured.
- **Functional review:** Document links exercised; evidence image viewer tested separately. Every PDF page and external source not checked.
- **Measured states:** 6 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/dashboard/DocumentsWorkspace.tsx`

### 21. Control cabinet (`cabinet`)

- **Does:** Inspect a cabinet drawing/photo and choose a contained component.
- **Goes to:** machine, more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Technical workspace uses a different visual style; drawings require contained pan/zoom. Missing-photo state captured for Climax fixture.
- **Functional review:** Representative component navigation captured. Every drawing hotspot not individually tested.
- **Measured states:** 4 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/ControlCabinetView.tsx`, `src/equipmentImages/EquipmentImageWorkspace.tsx`

### 22. Wulftec 3D model (`wulftec`)

- **Does:** Rotate and inspect the reconstructed WCRT-200 model and its assemblies.
- **Goes to:** asset, documents, more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Model begins below controls; technical dimensions and reference text are large.
- **Functional review:** Viewer rendered. All camera modes/assemblies and physical accuracy not verified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/machines/WulftecWorkspace.tsx`

### 23. Component record (`component`)

- **Does:** Read a device identity, parent equipment, evidence and documented connections.
- **Goes to:** asset, documents, machine.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Clear identity card but several layers of context precede device details.
- **Functional review:** Parent-machine and equipment links clicked.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/machines/ComponentRecordPage.tsx`

### 24. Field documentation (`field`)

- **Does:** Capture field evidence, observations and documentation against selected equipment.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Repeated machine title and controls delay entry.
- **Functional review:** Render/navigation checked; earlier visual suite covers field workspace. Every capture/apply variant not exercised here.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/dashboard/FieldDocumentationWorkspace.tsx`

### 25. Troubleshooting (`relationships`)

- **Does:** Trace documented connections and assess impact around a selected asset.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Direct entry displays “Select an asset” with no inline asset picker; map is the available next step.
- **Functional review:** Direct-state links checked; every relationship traversal not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/Dashboard.tsx`

### 26. More (`more`)

- **Does:** Choose Everyday tasks, Records & review, Admin or Advanced Tools.
- **Goes to:** assetAdd, cabinet, conflicts, connection, database, dependencies, documentation, evidence, field, health, help, history, import, inventory, lines, maintenance, manage, observation, relationships, review, settings, setup, standalone-screen-71, standalone-screen-72, wulftec.
- **Direct-link Back fallback:** `?page=home`.
- **Visual review:** Large group buttons fit desktop; stacked phone choices postpone the actual tool list.
- **Functional review:** All groups captured and representative destinations clicked. Earlier large-print workflow checked returning to the selected group.
- **Measured states:** 8 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/navigation/AppShell.tsx`, `src/navigation/toolGroups.ts`

### 27. Account (`account`)

- **Does:** Refresh permissions, set username/password and manage passkeys.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=admin`.
- **Visual review:** Readable single-column security form.
- **Functional review:** Refresh and username persistence passed in fixture. Real password delivery/passkeys/session policy unverified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/auth/AccountSecurity.tsx`

### 28. Review changes (`review`)

- **Does:** Compare and apply proposed canonical data changes.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Shared-save panel precedes the reviewer’s task.
- **Functional review:** Proposal workflow covered by fixture suites; real multi-user roles unverified.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 29. Add equipment (`assetAdd`)

- **Does:** Create an equipment record with identity, type, area and verification state.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Large, readable fields; form spans multiple screens.
- **Functional review:** Create workflow passed in large-print suite at all three sizes.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 30. Manage assets (`manage`)

- **Does:** Find equipment, edit it and manage its record.
- **Goes to:** machine.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Phone list rows overlap: names and metadata spill into neighboring buttons, and Edit wraps into letters. Machine-scoped entry still presents the whole list.
- **Functional review:** Edit, cancelled deletion and CSV readback exercised; irreversible production deletion not performed.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 31. Connections (`connection`)

- **Does:** Create an evidence-backed relationship between two assets.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Long vertical form, with clear source/relationship/destination ordering.
- **Functional review:** Verified-without-evidence rejection, unverified creation and reload passed in fixture.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 32. Attach evidence (`evidence`)

- **Does:** Attach photos/PDFs/files to equipment and reopen them.
- **Goes to:** machine.
- **Direct-link Back fallback:** `?page=machine&asset=L2-CC-001`.
- **Visual review:** Large upload area; selected asset is repeated in header/form.
- **Functional review:** PNG upload, image open/close and reload passed in fixture.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 33. Record a finding (`observation`)

- **Does:** Log a field observation against equipment.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Large clear text entry.
- **Functional review:** Save and reload passed in fixture.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 34. Plant setup (`setup`)

- **Does:** Edit facility details, areas and map records.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=admin`.
- **Visual review:** Three setup sections are visible; forms use generous controls.
- **Functional review:** Facility rename/reload and area creation passed. All Map Records operations not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 35. Plant database (`database`)

- **Does:** Export/import plant backups and equipment packages.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=advanced`.
- **Visual review:** Confirmed horizontal clipping on 390px phone: statistics/export/options do not fit.
- **Functional review:** Export covered in asset workflow. Destructive replacement/import compatibility not exhaustively tested.
- **Measured states:** 2 desktop/phone captures. Automated findings recorded; inspect the artifact.
- **Source:** `src/editor/PlantManager.tsx`

### 36. Settings (`settings`)

- **Does:** Change contrast, motion and map/display preferences.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=admin`.
- **Visual review:** Clear large select controls.
- **Functional review:** Contrast and reduced-motion persistence passed.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 37. Resolve sync conflicts (`conflicts`)

- **Does:** Compare shared/local conflicts and choose an explicit resolution.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Empty conflict state has a large shared-save panel above explanation.
- **Functional review:** Concurrent conflict, explicit resolution and reload passed in simulated cross-device suite.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 38. Data health (`health`)

- **Does:** Validate the data model and open/trace incomplete records.
- **Goes to:** area, asset, more, relationships.
- **Direct-link Back fallback:** `?page=more&tools=records`.
- **Visual review:** Readable validation panel, but destination controls are deceptive because they do nothing.
- **Functional review:** Run verification passed. Open and Trace both failed; dispatch listener is mounted only in Dashboard.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 39. Import records (`import`)

- **Does:** Preview CSV records, validate references and approve import.
- **Goes to:** more.
- **Direct-link Back fallback:** `?page=more&tools=advanced`.
- **Visual review:** Clear explanation and file picker.
- **Functional review:** One asset CSV preview/import/readback passed in fixture. Full malformed-file matrix not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/editor/PlantManager.tsx`

### 40. Guide & training (`help`)

- **Does:** Read workspace guidance, set guide preferences and open the project tour.
- **Goes to:** field, more, standalone-screen-69.
- **Direct-link Back fallback:** `?page=more&tools=everyday`.
- **Visual review:** Introductory Genie content dominates the first screen.
- **Functional review:** Tour play/next/pause passed at phone and desktop sizes; every guided lesson not exercised.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** `src/features/facility-guide/FacilityGuide.tsx`, `src/App.tsx`

### 41. Project tour (`standalone-screen-69`)

- **Does:** Standalone public content; separate from the app navigation shell.
- **Goes to:** Shared navigation / local controls; no additional rendered page link captured..
- **Direct-link Back fallback:** `Standalone return link`.
- **Visual review:** Standalone page captured and visually reviewed on desktop and phone. Separate navigation shell.
- **Functional review:** Tour playback tested separately. Archive links and 3D controls are not all exercised; rendering is not full content verification.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** Standalone exported content; see the path in the manifest.

### 42. Standalone machine viewer (`standalone-screen-70`)

- **Does:** Standalone public content; separate from the app navigation shell.
- **Goes to:** wulftec.
- **Direct-link Back fallback:** `Standalone return link`.
- **Visual review:** Standalone page captured and visually reviewed on desktop and phone. Separate navigation shell.
- **Functional review:** Tour playback tested separately. Archive links and 3D controls are not all exercised; rendering is not full content verification.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** Standalone exported content; see the path in the manifest.

### 43. Evidence archive (`standalone-screen-71`)

- **Does:** Standalone public content; separate from the app navigation shell.
- **Goes to:** Shared navigation / local controls; no additional rendered page link captured..
- **Direct-link Back fallback:** `Standalone return link`.
- **Visual review:** Standalone page captured and visually reviewed on desktop and phone. Separate navigation shell.
- **Functional review:** Tour playback tested separately. Archive links and 3D controls are not all exercised; rendering is not full content verification.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** Standalone exported content; see the path in the manifest.

### 44. Recovered plant sources (`standalone-screen-72`)

- **Does:** Standalone public content; separate from the app navigation shell.
- **Goes to:** Shared navigation / local controls; no additional rendered page link captured..
- **Direct-link Back fallback:** `Standalone return link`.
- **Visual review:** Standalone page captured and visually reviewed on desktop and phone. Separate navigation shell.
- **Functional review:** Tour playback tested separately. Archive links and 3D controls are not all exercised; rendering is not full content verification.
- **Measured states:** 2 desktop/phone captures. No automated finding recorded in these captured states; not a blanket accessibility pass.
- **Source:** Standalone exported content; see the path in the manifest.

## Remaining verification before calling this demo-ready

Fix F1–F3 and rerun the failing checks without reducing thresholds. Review the first-screen task hierarchy (F4), then complete populated requests, full legacy capture/trace/hotspot flows and role-specific states. Verify real backend permissions and synchronization against an authorized test facility. Exercise keyboard/screen-reader flows and actual phone input/media. Recheck the deployed commit after merge/deployment; a draft PR and green build do not establish deployment.

## Reproduce

Build the app using the documented synthetic visual-test environment and run a preview on port 4176. Then:

```text
npx tsx scripts/page-audit-manifest.ts
python scripts/page-audit.py
python scripts/page-audit-actions.py
python scripts/page-audit-report.py
```

Use `--resume` only with unchanged app build/manifest; it retains previously completed captures. Browser-action scripts intentionally record failures as evidence. Read their JSON results rather than assuming exit zero means all actions passed. Existing regression suites retain their failing assertions.

# Slate maintenance release

## Delivered scope

The approved [page directory and four phone previews](design/SLATE-REDESIGN-REVIEW.md) define the six-section entry: Equipment, Repairs, Inventory, Documents, Facility Map and Administration. Directory / My work navigation stays in a reserved row. Slate tokens provide 20 px body text, 22 px actions and 56 px primary controls; maps retain vivid object colors and original drawings.

Known machines have focused overview, troubleshooting, history, electrical, controls, parts, manuals and photo pages. Existing record, cabinet, field, production, map-editing, inventory, import/export, account and guide routes remain available. Supporting evidence browsers, Wulftec viewer and the original project tour use Slate. Archived source files retain their original bytes; the recovered-source browser is a separate wrapper.

Repairs preserve notes and original files automatically, survive navigation and reload, and expose accurate local/pending/received states. Optional voice has a typed alternative. Related information and parts preserve repair context. Finish provides an editable summary. Optional AI drafts retain citations and unknowns separately from originals.

The shared inbox preserves immutable source snapshots and files. Administrators correct proposals, request clarification, approve, then apply in a distinct transaction. Application checks the destination's current value and preserves actor/timestamp receipts; retries cannot duplicate the same application. Machine descriptions, history, inventory notes, document titles and app-change drafts are supported. Software requests retain a source link and release reference and do not execute code.

## Evidence

| Requirement | Verification |
|---|---|
| Design reviewed before broad implementation | Reviewed four-screen phone artifact and explicit owner approval, recorded in the design review |
| Phone, tablet, desktop geometry | Full nine-size visual audit passed, including 320, 360, 390, 430, landscape and both tablet orientations; existing geometry guards preserved |
| Readability and touch targets | Exact Slate surface assertions, measured contrast, 56 px navigation, 150% text at 320/390/1366; reviewed screenshots |
| Known machine and real manual/history | Repair browser journey plus full visual suite |
| Notes/photos, leave/resume, editable finish | Repair browser journey and persistence tests |
| Unknown interpretation still reaches review | Browser journey; real local app note received by shared backend despite assistant origin rejection |
| Correct, approve, apply and destination readback | Separate technician/admin browser sessions; live transactional database harness for every destination; real application-release request progressed through correction/approval/app-change application |
| Permissions, retries, conflicts and source retention | Database harness inside BEGIN/ROLLBACK; unit and browser tests for unauthorized actions, stable requests, upload retries, stale versions and immutable originals |
| Full existing data and functions | Data validator: 16 areas, 4 machines, 29 components, 27 document categories, 50 relationships and 56 cabinet devices; 107 public source hashes; map, inventory, publication and 36-route large-print journeys |
| Migration and recovery | Additive Supabase migration 004 installed; IndexedDB original-package recovery; original-byte/hash-checked work backups, documented in [operations](REPAIR-REVIEW.md) |

Local release gates passed: 69 test files, 265 tests, one pre-existing skip; data, publication integrity, permanent visual contract, production build, full visual audit, repair/admin, inventory, shared publication, map editor and large-print checks. Existing build warnings concern bundle size and a legacy background reference.

## Release status

[PR #59](https://github.com/tobystrings/industrial-asset-graph/pull/59) is open. Backend migration and authenticated Edge Function are installed in the existing Supabase project. Real receipt `e42e5eb6-5fb4-450e-8020-1dac5d494a3a` tracks this software release; its original explicitly makes no machine repair or parts-use claim. The app-change queue links it to PR #59.

The final CI, merge, Pages deployment and production-origin smoke evidence are recorded in PR #59. The results above are the release-candidate verification record; consult the PR for the final deployment outcome. The service-worker cache version is updated so existing installations receive the new manifest and source-browser styling.

# Implementation validation — 2026-09-08

The checks below exercise software and evidence preservation, not plant equipment.

- `npm test` with `IAG_HISTORY_BUNDLE` set to the prepared private bundle: **196 tests passed in 52 files**, including the actual handoff import. No optional actual-package test was skipped in this run.
- `npm run verify:data`: passed; existing baseline remains 15 areas, 2 machines, 22 components, 21 document categories and 32 relationships. Cabinet reference checks passed.
- `npm run verify:visual-contract`: passed; contract checks were not narrowed.
- `npm run build`: passed TypeScript client/server checks and Vite production build. Existing missing-at-build-time facility-dashboard image reference and large-chunk warnings remain; neither prevented the build.
- `git diff --check`: passed.
- All 94 supplied manifest entries matched their SHA-256 and byte size; the prepared bundle includes the manifest as the 95th file.
- Original source-file hash scan of dist found no matching source bytes. The private evidence directory and source-bearing reports are ignored by Git and are not application imports.

The actual-package test checked all 20 conflict records, all 135 Siemens parameter rows, preserved raw Card 01 `0144.2`, exact matching of FG-L4-MTN-001 and L2-CC-001, repeat ingestion, unchanged complete canonical plant package (including map and revision history), no sync mutations, controlled attachments, and private recovery round-trip.

Synthetic boundary tests checked existing attachment preservation; source bytes after reload/recovery; administrator-only review; technician staging; unauthenticated denial; wrong-facility rejection; missing provenance rejection; bad hashes; changed batch-ID content rejection without partial writes; duplicate prevention with review preservation; ordinary export exclusion; portable replacement retaining local history and its files; and immutable historical source deletion protection.

`npm run test:visual` with the final private bundle: **passed all seven viewports** (1920×1080, 1366×768, 1024×768, 768×1024, 430×932, 390×844, 844×390). Representative laptop and phone states exercised import preview, verified recovery download, staging, reload, administrator review, repeated ingestion preserving one review event, and SHA-256 verification of a downloaded original source. Existing map, cabinet, machine, production, editor and document checks also passed. Final desktop and phone screenshots were inspected for readable text and contained content.

The first screenshot review found a contrast issue; explicit readable colors and a regression assertion corrected it. A subsequent full run failed only on Google Fonts ERR_INTERNET_DISCONNECTED console errors during the phone run. The console-error check was retained, and the final full rerun passed. The final private bundle also received a provenance correction linking Set B rows to the later dossier readback instead of the earlier Wulftec PDF; all four ingestion tests passed again against that exact bundle, followed by the successful full visual run.

Final bundle and all JSON report sidecars agree, and all 95 retained file hashes were rechecked. Final SHA-256: `aa0303f863e09ecf2587606b5dfd70750115a9a4c27e94596e83422c7bba0a82`.

No handoff content was pushed, published or deployed. Tests ran in disposable IndexedDB and browser contexts using synthetic authentication, not in the user's production browser database. No equipment settings, repairs or real field tests were performed.

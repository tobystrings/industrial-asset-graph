# Public plant publication and Map Studio

The owner authorized publication of all J. Lieb plant content on September 9, 2026. This supersedes earlier instructions to keep the recovered plant package private. Passwords, authentication tokens, API secrets, and unrelated local files are excluded.

## Published content

`public/facility-content/lieb-foods/` contains a byte-preserving copy of the available recovered package, the prepared ingestion bundle, curation material, source coverage, assertions, conflicts, and field-verification tasks. Its index links to the original files and reports. SHA-256 hashes and sizes are listed in `publication-manifest.json`.

The ledger loads the published assertion register automatically. Existing imported records and review events are retained. Original `LOCAL_ONLY` markings describe provenance before the owner's release; they do not hide the published copies. Publishing an observation or an OEM procedure does not verify an asset, a line assignment, a connection, wiring, a repair, or completion of work. The Wulftec wiring dispute and Cooler correction remain evidence records.

Six legacy evidence records say only “local evidence package”; they do not identify actual source files. Their metadata is published, but missing photographs cannot be reconstructed or claimed as deployed. Zero-byte download remnants in the source package remain identified as incomplete in the integrity report.

## Shared saves and GitHub deployment

GitHub Pages hosts the application and published files. The existing Supabase project accepts signed-in saves through dedicated, facility-scoped publication functions. Administrator saves are canonical; technician work is saved publicly in a separate proposal ledger and requires explicit administrator review. No GitHub credential is shipped to the browser.

The browser retains an offline copy. Shared snapshots contain canonical records, attachments, observations, historical assertions and reviews, pending proposals, audit events, and saved map drafts. File content is uploaded immutably, addressed by hash, and verified before another device imports it. A transaction commits a revision only if its base revision is current. Duplicate request IDs cannot create a second revision. A three-way merge combines independent edits and exposes conflicting values for explicit review.

Existing browser records join shared publication when that device opens the updated application. Field captures now save selected photo bytes as well as their fingerprints. Older captures that retained only a filename/hash cannot supply missing original photo bytes. Field-capture storage is now facility-scoped.

The publication workflow checks for new saved revisions every five minutes and supports manual dispatch. GitHub may delay scheduled runs. It verifies snapshots and file hashes, commits them under `public/facility-state/`, and triggers normal CI and Pages deployment. “Saved across devices” means Supabase confirmed the save; it does not claim that the corresponding GitHub deployment has completed. The UI links to the publication workflow for that status.

Historical versions remain in the shared revision tables and Git history. The publication token is an encrypted repository secret and must remain valid for automated pushes. Other facilities keep their existing independent storage and publication policy.

## Map Studio

Cursor / Pan is the initial tool. Dragging anywhere on the contained map changes the view, including when the pointer begins over a room. It does not move room geometry or open an asset. Local zoom and Fit remain available.

Areas & shapes, Drawing & notes, and Properties are collapsible panels. Cursor / Pan closes them to maximize drawing space. Controls stay in normal layout flow and can scroll horizontally on a phone. The map remains strictly 2D.

Working drafts are saved separately from canonical geometry and restored when their baseline still matches. Save Changes commits the map and requests shared publication; Done saves before leaving. If the shared map changes while a draft is open, the stale draft cannot silently overwrite it. Cancel / Exit explicitly discards the working draft.

## Validation

Required release checks: unit tests, facility verification, publication verification, the permanent visual contract, production build, all seven responsive viewports, Map Studio browser scenarios, and the two-browser publication test. The live database was also tested transactionally for authorization, idempotence, optimistic conflicts, and facility isolation; test writes were rolled back.

## Integrated Map Studio update

The September 9 release also incorporates the existing symbol, source-cleanup, layer, equipment-placement, and text-preview editor. Tool groups and Text edits / Objects / Layers toggle closed, leaving the map full width. Cursor / Pan is the initial tool; selection is explicit before changing individual objects. Full screen and pop-out remain available. Text commands preview before Apply; connected AI is not claimed as configured.

Validation after integration includes 213 passing unit tests (one existing skip), data and source hashes, cross-device area and attachment publication, revision deduplication, draft restoration, explicit conflict resolution, and map geometry/markup persistence. The seven-viewport visual audit remains mandatory before release.

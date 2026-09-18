# Readability and return-navigation audit — September 18, 2026

The owner's reported failures were small print and Back links that skip parent screens. This review addresses those failures; it is not an acceptance certificate for the entire product.

## Baseline and method

GitHub main and the successful Pages deployment were `4e19597c51d6b0486b13405744a03e594cd9b53b`. The public live snapshot matched repository revision 30. The public login was opened in Chromium. Signed-in UI inspection used the deployed frontend with intercepted authentication and shared-service responses, in disposable browser contexts using the bundled seed records. It did **not** authenticate to, or write audit data into, production services; it also does not establish correct rendering of every subsequently authored production record.

Seventeen entry/detail states were rendered at 1366×768 and 390×844. Measurements and screenshots are local under `artifacts/deployed-audit/`. The existing readability branch, PR #63, was still unpublished; this task integrates current main into that branch and extends its fixes.

## Reproduced problems

| Problem | Reproduction / evidence | Change |
| --- | --- | --- |
| Undersized text | Equipment IDs and metadata at 18 px; document headings and cabinet panel title at 19 px; phone header and Account at 18 px | Existing readability fixes consistently apply the shared 20 px reading floor, 22 px actions and 56 px controls |
| Machine Back skips levels | Equipment → machine → Manuals; header points to Equipment instead of the machine | Recorded in-app return destination; hierarchical fallback for direct links |
| Component Back loses context | Controls → component; header previously defaults to Directory | Return to the originating Controls, cabinet, model or other screen |
| Review navigation jumps home | Administration → Review Inbox; header previously points to Directory | Return to Administration; direct review links have a parent fallback |
| Search/list position lost | Filter Equipment, open a machine, return; old Back rebuilt an unfiltered list | Preserve the complete origin URL and scroll position in browser history |
| Document filter lost | Filter Documents to Draft, open a document, close it | Persist filter in the URL; close returns to the originating screen instead of rebuilding the library |
| Inventory discards history metadata | Switch inventory sections or open a part | Internal route changes retain parent history while avoiding remounting an unfinished form |
| Device/model/work state erases parent history | Several in-place URL updates replaced history state with null | Preserve navigation metadata when updating selected device, model state, repair ID or session ID |
| Repeated navigation crowds out manuals | Phone screenshot showed header Back, Machine menu, All manuals and a repeated section heading before the actual document | Keep one contextual Back link and the document title |
| Map labels scale down to unreadable pixels | Live frontend measured area names at 10.6–13.2 screen px on desktop and 3.5–4.4 px on phone, using the SVG screen transformation | Full-size area picker; choosing/searching an area centers it at a minimum 1.5× local scale (at least 21 px for the smallest authored area label); overview remains available through compact Fit |

## Regression coverage

`src/navigation/pages.test.ts` checks direct-link hierarchy, facility isolation, recorded source context, repair/review/document/component fallback routes, and external destination rejection.

`scripts/navigation_visual.py` follows actual links and Back controls: filtered equipment → machine → manuals → document → reload → back through each level; Controls → component → Controls; filtered documents → preview → close; long-list scroll restoration; Administration → Inbox; inventory section navigation; selected map equipment → machine → map; and direct-link parent behavior. It runs in the permanent audit at laptop and phone sizes, using the suite's isolated service fixtures.

The existing full nine-viewport audit and readable-text/control assertions remain mandatory. No viewport, assertion, or workflow was removed.

## Boundaries and outstanding acceptance

- The existing 20 px check covers HTML interface text. The new map-selection journey also checks effective SVG screen pixels. Overview drawings still contain small labels; the readable picker and focused-area view are the supported reading path. Raster drawing/photo/PDF text is not made larger by the HTML rule and remains dependent on its local viewer. This change does not certify all embedded print.
- Screenshot review still shows overlapping labels where map areas overlap (for example Building C / Cook Rooms), and the phone map's four detail tabs wrap “cabinets” awkwardly. These are unresolved map-layout findings, not passing usability results. The new focused label is readable, but this is not a finished map redesign.
- The 34-state sweep checks rendered entry/detail screens. It does not prove every feature or every combination of settings works.
- Live sign-in, real cross-device saves, actual repair submission/review transactions, deployed migration 005, passkeys and AI providers were not verified in an authenticated production session during this audit.
- Local source changes, local test results, GitHub CI, merge and Pages deployment are separate states. An open PR is not a deployed fix.

## Validation status

Unit tests: 284 passed, one existing conditional skip. Facility data and permanent visual-contract checks passed. Production build passed with existing nonfatal warnings.

Final focused desktop/phone journeys passed, including inventory Back, document-filter and scroll recovery, reload, direct links and effective SVG label size. Phone manual and focused map screenshots were visually inspected. The final complete nine-viewport audit passed against the stable completed build, including the new laptop/phone navigation journeys. An earlier full run was invalidated by rebuilding its served assets while it was running; its HTTP failures are not counted as a pass. Subsequent exploratory runs were stopped before further fixes.

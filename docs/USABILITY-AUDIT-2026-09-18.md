# Readability and return-navigation audit — September 18, 2026

The owner's reported failures were small print and Back links that skip parent screens. This review addresses those failures; it is not an acceptance certificate for the entire product.

## Follow-up: giant, friendly default

The owner clarified that making a dense technical application merely readable was insufficient. The shared default now uses 24 px reading text, 28 px action labels, 36–48 px primary headings, and 72 px controls. Former 20/22 px CSS exceptions consume the shared tokens. Main destinations have large cards with a short description of the task. Equipment cards have more space between choices. Phone layouts retain the large type and reflow.

Machine documents use their own title in the shell and omit the repeated machine name, equipment ID and unrelated cabinet-photo action above the document. Document headings use a consistent 32 px size to avoid tall stacks of wrapped words on phones. Equipment IDs remain in Overview. Map administration and help follow the map rather than filling the phone's first screen. Phone map detail tabs use two columns so their labels remain whole. Contextual Back, filters and position are preserved by the preceding change.

The permanent HTML assertions are strengthened from 20 to 24 px and from 56 to 72 px; no coverage is removed. A separate local sweep checks 17 entry/detail routes at desktop, 390 px phone and 320 px phone widths (51 screens). All meet those text/control minima. The sweep found and corrected cabinet headings and guide branding that still used smaller fixed sizes. The deeper workflow audit additionally caught 23 px headings in the expanded equipment directory; those and the remaining fixed-size exceptions were corrected. Real link journeys through documents, machine components, inventory and map pass on desktop and phone. The final complete nine-viewport workflow run passed against the stable completed build, including the stronger 24/72 px assertions and enlarged-text checks. Unit tests (284 passed, one existing conditional skip), data verification, visual-contract verification and production build also pass. Exploratory runs stopped for fixes are not counted as passes. The original validation below applies to commit 9556b22; this paragraph records the giant-friendly follow-up.

The map drawing's small overview labels and overlapping authored area labels remain known limitations. These shared-layout changes do not establish that every technical workspace has a finished friendly interaction design, nor do they verify production authentication and shared writes.

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
- Screenshot review still shows overlapping labels where map areas overlap (for example Building C / Cook Rooms). This is an unresolved map-layout finding, not a passing usability result. The phone detail-tab wrapping found in the initial review is corrected in the giant-friendly follow-up. The focused label is readable, but this is not a finished map redesign.
- The 34-state sweep checks rendered entry/detail screens. It does not prove every feature or every combination of settings works.
- Live sign-in, real cross-device saves, actual repair submission/review transactions, deployed migration 005, passkeys and AI providers were not verified in an authenticated production session during this audit.
- Local source changes, local test results, GitHub CI, merge and Pages deployment are separate states. An open PR is not a deployed fix.

## Validation status

Unit tests: 284 passed, one existing conditional skip. Facility data and permanent visual-contract checks passed. Production build passed with existing nonfatal warnings.

Final focused desktop/phone journeys passed, including inventory Back, document-filter and scroll recovery, reload, direct links and effective SVG label size. Phone manual and focused map screenshots were visually inspected. The final complete nine-viewport audit passed against the stable completed build, including the new laptop/phone navigation journeys. An earlier full run was invalidated by rebuilding its served assets while it was running; its HTTP failures are not counted as a pass. Subsequent exploratory runs were stopped before further fixes.

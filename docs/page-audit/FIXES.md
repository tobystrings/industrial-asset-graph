# Audit fixes — 18 September 2026

This follow-up records changes after the [original page audit](README.md). The original screenshots and findings describe commit `fc6b04e`; they are retained as before evidence. These changes are on draft PR #63, not the deployed application.

## Findings and corrections

| Finding | Implemented correction | Regression evidence |
| --- | --- | --- |
| F1: Data health Open and Trace do nothing | Use the shared router to open the selected area/asset record or an equipment trace. Component sources resolve to their parent equipment. | Click actual Health targets and assert destination and selected record. |
| F2: Phone database overflows | Stack phone statistics, constrain form children, and wrap export/import labels. | Phone route geometry and screenshots. |
| F3: Narrow-phone Directory overflows at 150% text | Constrain shell grid tracks and header children; let long labels reflow. | Retain the original 320px enlarged-text repair assertion. |
| F6: Manage assets rows overlap | Prevent rows shrinking below their text; reserve room for Edit. | Assert that each row contains its text, including wrapped names. |
| F7: Selected phone asset tab is hidden | Show a native Asset section selector with the current section selected. Use the same approach for Inventory and More. | Select sections, follow links, return, reload, and exercise keyboard selection. |
| F4: Chrome displaces the task | Move supplementary help and save details below content; retain save-error attention at the top. Collapse production related-page links. Remove duplicate inventory actions/context and put the map before secondary controls on phones. | Screenshots and existing navigation, map, inventory and repair journeys. |
| F5: Inconsistent legacy panels and empty troubleshooting | Apply Slate surfaces to legacy headers/panels and provide an inline equipment picker for troubleshooting. Area links open their record by default. | Troubleshooting selection and area/asset captures. |

The readability branch also contains the earlier large-print design (24px reading text, 28px labels, 72px targets) and contextual Back navigation. A Back action should return to the preceding workspace and preserve its context; direct links use the defined parent fallback.

Final screenshot inspection found two additional enlarged-text defects: the Directory label escaped its button, and the unfocused skip link became visible above the header. Navigation labels now wrap within their targets, the header can wrap onto another row, and the skip link stays offscreen until focused. Regression assertions now measure navigation text containment and skip-link visibility as well as font and target sizes.

## Evidence and scope

Focused after screenshots and results are in `artifacts/audit-fixes/`. `scripts/audit-fixes-browser-check.py` exercises the corrected states at 1366, 390 and 320 pixels. `scripts/audit_regressions_visual.py` adds the Health, row containment, database and selected-section regressions to the existing full visual suite at representative desktop and phone sizes. No original viewport, font threshold, geometry assertion or transaction assertion was removed.

Selected after screenshots: [Manage rows](after/390-manage-rows.png), [Inventory form](after/390-inventory-add.png), [selected asset section](after/390-asset-section.png), [Health opens its area](after/390-health-open.png), [320px Directory at 150% text](after/320-home-text-150.png).

Tests use isolated authentication and service fixtures. Their success establishes browser behavior against those contracts, not live backend authorization, actual cross-device publication, passkeys, email, microphone or camera behavior on a physical phone.

## Remaining work

- Dense labels embedded in technical map drawings still require local zoom; some authored labels overlap. This is not resolved by the shared UI font changes.
- The initial audit covered every registered page visually, but did not execute every control or business transaction. Populated request variants and every legacy capture/hotspot path still need deeper coverage.
- Verify real backend behavior against an authorized test facility and inspect the deployed build after integration. Local checks and a draft PR do not establish deployment.

## Validation

- Unit tests: 71 files passed; 284 tests passed, one conditional skip.
- Facility data, permanent visual contract and production build: passed.
- Focused audit fixes: 39 state checks passed across 1366, 390 and 320 pixels, including enlarged text.
- Complete technician/administrator repair journey: passed, including enlarged-text geometry.
- Map editor and simulated publication suites: passed before the final header/label wrapping adjustment; the full visual rerun checks that adjustment.
- Full nine-viewport visual rerun and final 36-route large-print sweep: running at this commit. An earlier broad run timed out after Submit for review; a focused reproduction and the next full-run desktop state passed. This is retained as a test reliability observation, not silently counted as a pass.

The fetched integration baseline remains `4e19597c51d6b0486b13405744a03e594cd9b53b`. No main merge or Pages deployment was performed.

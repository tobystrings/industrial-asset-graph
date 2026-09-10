> September 2026 Gemini update: the OpenAI activation instructions below are historical. Current setup is [GEMINI-MAP-SETUP.md](GEMINI-MAP-SETUP.md); the browser uses the existing Supabase project for AI, independently of shared-data sync.

# Map Studio — Codex project context

Recorded September 9, 2026 for `tobystrings/industrial-asset-graph`.

This project record preserves the Map Studio discussion, accepted goal, implementation, verification, and remaining configuration work. It is a context handoff, not a verbatim tool log. Source code remains in this repository; this document does not replace the repository's agent rules or visual contract.

## User requests and intent

The user wanted substantial progress on the industrial asset map immediately, with an editor that can handle the whole drawing. Their requests in this conversation were:

- “i need to make unbelievably large progress on the industrail asset map today”
- “the map editing is cool and all but its not all there like i need it. give me some creative ideas on how i can implememnt the map editing - maybe a pop out window with really really amazing editing tools or maybe just give it all abeck to ai aor i dunno”
- “can i have like a tezt window tha ti can explain my edits too as well?”
- “there are also symbols on the map that arent editable sush aws the doors and stairs - i ned to be able to edit those as well”
- “poerfect lets make this map studio a goal and execute it”
- “this entire thing needs added to the codex project filr industrial-asset-graph”

The accepted direction combines direct editing, a dedicated studio with full-screen/pop-out options, and text instructions with a visible preview before application. Doors, stairs, and other drawing features must be editable too. Raster-baked symbols require deliberate replacement with editable objects and independent cleanup of the original pixels.

## Accepted goal

The following is the existing goal, also stored unchanged in [MAP-STUDIO-GOAL.txt](MAP-STUDIO-GOAL.txt).

Build and deploy Map Studio in tobystrings/industrial-asset-graph.

Goal: make the facility drawing editable through both direct manipulation and a plain-English text panel, while preserving existing equipment identities, documents, relationships, authentication, and saved field work.

Create a dedicated, spacious studio within the existing app. Support full-screen editing, responsive tool panels, pan/zoom, snapping, layers with visibility and locking, object selection, properties, and undo/redo.

Make areas, walls, labels, equipment placements, doors, stairs, and other facility symbols editable. Support adding, moving, resizing, rotating, duplicating, flipping, and deleting applicable objects. Include door variants, stair direction and step count, and reusable custom symbols. Provide a trace-and-replace workflow for symbols baked into the reference image; preserve an independently editable source mask so moved or deleted replacements do not leave ghost symbols. Do not pretend raster pixels are already vector objects.

Add a text window that understands selected objects and named areas, previews proposed changes on the map, allows conversational refinement, and applies only after explicit user action. Ambiguous or unsupported requests must ask for clarification without changing the draft. Manual and text edits must share the same validated history. Clearly distinguish offline supported commands from connected AI; keep AI credentials on the server.

Preserve canonical asset IDs and area assignments through edits, merge/split, undo/redo, save/reload, and archive transfer. Keep local versus shared saving truthful. Prevent stale previews or saves from overwriting newer work.

Validate meaningful editing workflows, symbol replacement, text previews, persistence, and desktop/tablet/phone layouts. Pass the repository's required release checks without weakening them. Publish the verified changes to the existing GitHub Pages application and report any external-service blockers precisely.

## Implementation and release evidence

The first release is merged and deployed, not merely proposed:

- Repository: https://github.com/tobystrings/industrial-asset-graph
- Map Studio: https://tobystrings.github.io/industrial-asset-graph/?page=map&edit=1
- Implementation PR: https://github.com/tobystrings/industrial-asset-graph/pull/50
- Main release commit: `c8ce2779528e334935d0f1674cf187ab1b0dd37e`
- Verified PR head: `208c105ff9520f6f28956a39b6e974bbd0c850c8`
- Passing required CI: https://github.com/tobystrings/industrial-asset-graph/actions/runs/34391256019
- Successful Pages deployment: https://github.com/tobystrings/industrial-asset-graph/actions/runs/34391884161
- Live verification returned HTTP 200 for the page and its new `index-DFxCqiJf.js` bundle, containing Map Studio, Replace reference symbol, Edit instructions, and Preview edit. This hash is historical release evidence, not an invariant for future builds.

Validation: 54 test files passed; 206 tests passed with one pre-existing conditional skip. `npm test`, `npm run verify:data`, `npm run verify:visual-contract`, `npm run build`, and `npm run test:visual` all passed in CI. Desktop, tablet, and phone screenshots were inspected. Existing checks were retained; older phone editor tests now use the Drawing tools navigation.

The seven browser sizes are 1920×1080, 1366×768, 1024×768, 768×1024, 430×932, 390×844, and 844×390. At each size the new workflow creates a replacement stair and source cleanup, changes properties, previews/applies text commands, rejects unsupported compound instructions without partial edits, deletes the replacement while preserving its cleanup, exercises undo/redo, saves, and verifies persistence after reload. The broader application audit also passes.

## Code map

| File | Responsibility |
| --- | --- |
| `src/map/DetailedBuildingLayout.tsx` | Studio integration, responsive work areas, full screen/pop out, saved overlays |
| `src/map/MapStudioPanel.tsx` | Text instructions, previews, object palette/properties, layers, recovery |
| `src/map/MapAreaEditor.tsx` | Shared edit session, direct manipulation, snapping, history, saving |
| `src/map/studioModel.ts` | Validated object operations, selection/layer rules, studio data |
| `src/map/studioCommands.ts` | Offline command parsing, target resolution, atomic rejection |
| `src/map/StudioSymbols.tsx` | Engineering symbols and independent reference cleanup |
| `src/map/mapStudio.css` | Desktop and mobile studio layouts |
| `src/map/mapEditor.ts` | Area operations and graph-aware draft history |
| `src/facility/types.ts`, `schema.ts` | Studio types and package validation |
| `src/facility/FacilityProvider.tsx`, `runtimeDb.ts`, `syncClient.ts` | Persistence, revision checks, relationships, sync envelopes |
| `server/mapStudioAI.ts`, `server/api.ts` | Optional authenticated AI planning endpoint |
| `src/map/studio.test.ts`, `server/mapStudioAI.test.ts` | Editing, persistence, conflict, and planner coverage |
| `scripts/map_studio_visual.py`, `scripts/dashboard-visual-check.py` | Permanent browser workflows and visual regression gates |

## Remaining configuration and boundaries

- Freeform AI is not connected on the published Pages release. Supported offline commands are available now. Do not describe the offline parser as an active AI service.
- The server planner is implemented at `POST /api/map-studio/plan`. Activation needs a deployed authenticated API, server-only `OPENAI_API_KEY` and `IAG_MAP_AI_MODEL`, and frontend `VITE_IAG_API_URL` supplied to the production build. No AI key was added to the browser or committed to the repository.
- Shared saving still requires the existing backend setup. The release explicitly reports local saves when shared sync is unavailable.
- Raster reference pixels are not automatically vectorized. Users convert each needed feature with Replace reference symbol or Hide reference feature. Cleanup remains anchored when the replacement moves or is deleted.
- Drawing coordinates are normalized percentages, not calibrated field dimensions.
- Moving an equipment placement does not by itself assert a new physical area assignment. Canonical equipment records and IDs must remain intact.

## Operational guide

The following guide is reproduced from [MAP-STUDIO.md](MAP-STUDIO.md) so this context file contains the complete release workflow. For later changes, keep that guide and this handoff consistent.

# Map Studio

Open Map, then **Edit map** with an administrator account. The existing facility database remains authoritative. Map Studio opens in the shared application shell; Full screen expands it, and Pop out opens the same facility in another window after the current draft is saved.

Desktop uses drawing tools, a contained canvas, and a Text edits / Objects / Layers panel. On phones, use Map / Drawing tools / Text, objects, layers to switch work areas. Scroll to zoom, select Pan to drag the view, or use the compact Fit reset. Drawing coordinates are percentages of the reference extent, not surveyed physical dimensions.

## Doors, stairs and reference artwork

In Objects, choose a symbol and select Draw new symbol, then drag its bounds. Replace reference symbol instead adds a white source cleanup box behind the new symbol. It is a deliberate trace-and-replace operation, not automatic raster recognition. Check that the box covers the entire old feature without hiding adjacent information. The original source file is untouched.

Move the replacement by dragging; resize using its corner handle or X/Y/width/height fields. Doors have single, double, sliding and roll-up variants, rotation and flip. Stairs have step count and up/down direction. Other built-in symbols cover columns, windows, docks, drains and barriers. Select markup strokes and save them as a named custom symbol for reuse.

Source cleanup is independently selectable in the Objects list and has editable bounds. Moving or deleting the replacement never moves/deletes its cleanup. Delete the cleanup separately to restore the original pixels. Hide reference feature adds cleanup without a replacement. Layer visibility hides cleanup outlines, not the cleanup itself.

Walls have editable endpoints in Objects. Areas retain existing rename, merge, split and polygon-vertex tools. Grid snapping is configurable in Layers. Walls also snap to nearby editable wall endpoints and room corners; hold Shift while drawing to constrain a wall horizontally or vertically. Existing equipment can be placed from the equipment tray without creating duplicate assets. Moving its marker does not assert a new physical area assignment; change that record explicitly in the existing equipment editor.

## Text edits

Select an object or use an exact room name. Supported offline commands include:

- Rename this to Main Cooler
- Move this left 2
- Rotate this 90
- Flip this
- Resize this to 3 by 5
- Duplicate this
- Delete this
- Merge these rooms into Main Cooler

Separate commands with semicolons. The entire request must parse; an unrecognized clause prevents all edits. Ambiguous names request clarification. The map displays the proposal, and Apply preview commits it into the same history used by manual edits. A draft change invalidates an older preview. Refinement means revising the instruction and previewing again against the current draft.

Connected AI uses the existing shared API at `POST /api/map-studio/plan`, with verified administrator authentication. Configure `OPENAI_API_KEY` and `IAG_MAP_AI_MODEL` only on that server, and `VITE_IAG_API_URL` on the frontend. Without those external services, offline commands remain available and the interface does not claim AI is active. The planner sends only the entered instruction, selection, and object names/IDs, returns proposed actions or a clarification, and never writes the map. Unknown targets and invalid actions are rejected before preview. The API uses the [OpenAI Responses JSON format](https://developers.openai.com/api/docs/guides/structured-outputs), with application-side action validation and `store: false`.

## Saving and recovery

Save Changes writes through the existing versioned plant editor; Done saves and exits. Saving remains local when shared sync is not configured. Export current draft creates a facility-tagged recovery JSON; Restore draft validates it and refuses other facilities. Ordinary facility archive export/import also preserves studio configuration.

Undo/redo includes area geometry, asset assignments and relationship changes from merges/splits. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z operate when focus is outside a text input. Layer locks prevent modifications. Map edits made after a preview require a new preview; newer saves from another window are rejected with a reconciliation message rather than overwritten.

The original drawing still contains reference pixels until each required feature is deliberately replaced or hidden. This release does not automatically vectorize the entire plant drawing or calibrate dimensions to feet/meters.

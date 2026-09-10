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

## September 10 readability and connection update

Map colors now identify areas and equipment; they do not indicate safety or verification. The legend is above the canvas and available while editing. Area colors are stable by ID, so renaming a room does not change its color. Labels, controls, and symbol previews are enlarged. Desktop editing keeps the assistant beside the drawing; narrow screens stack the work areas without shrinking controls.

Text edits opens by default with an explicit connection status. The authenticated GET /api/map-studio/status checks server configuration and administrator access without exposing credentials. A successful check is not a successful provider call; Preview edit validates that separately. Offline commands remain labeled as offline. The Pages workflow now passes the VITE_IAG_API_URL repository variable into the build.

To activate freeform AI, deploy the existing server with SUPABASE_URL, IAG_ALLOWED_ORIGINS including the Pages origin, server-only OPENAI_API_KEY and IAG_MAP_AI_MODEL, and its existing server dependencies. Set the repository variable VITE_IAG_API_URL to the server HTTPS origin, rebuild Pages, sign in as admin, and use Check connection followed by an actual preview. Never put provider credentials in frontend variables. This code change does not provision those external services or assert they are connected.

On phones the large legend opens from its control above the map; it starts collapsed to leave room for the drawing. AI / text edits opens and focuses the assistant. Source Sans 3 is bundled locally, so interface readability does not depend on a Google Fonts request. Area labels wrap within their mapped bounds; equipment placements show compact IDs with full names retained in their accessible labels, tooltips, and object list.

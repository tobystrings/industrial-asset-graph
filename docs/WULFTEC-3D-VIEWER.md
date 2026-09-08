# Wulftec WCRT-200 reference model

Open **More → Wulftec 3D model**, or `?page=wulftec`.

Production builds also include a standalone viewer at `/industrial-asset-graph/wulftec/`, accessible without signing in.

## Connected equipment workflow

The standalone viewer's **Open in Asset Graph** link carries its assembly, carriage/full-machine view, and exploded position into the authenticated app. Inside the app, the viewer resolves the WCRT-200 from the active facility's loaded records. Multiple wrappers require an explicit selection; a missing requested asset never falls back to a different machine.

The equipment record has an **Open 3D model** action. Selecting cabinet, rotary arm, carriage, or conveyor geometry reveals existing component records, verification status, matching documents and source evidence. Component records open in the shared app shell and include their recorded relationships and revision history. Document and component pages return to the selected model state. Machine-level documents include the loaded service and maintenance registers without asserting that every row belongs to the selected subpart.

Associations use dossier component identifiers owned by the selected asset. Cover, drive, gate, and roller geometry use the prestretch assembly as context, clearly labeled as lacking individual component records. Frame and guard geometry remain unlinked when no corresponding records exist. No operational relationships or verification claims are created by the model.

The private Wulftec package must be imported on the current device through **Plant database → Add Private Asset Package**. The app supplies an actionable missing-record state when it is absent. Private source files remain in facility-scoped IndexedDB and are not included in the public viewer or GLB exports. The integration does not turn local private records into shared server data.

This is a procedural, illustrative reconstruction of the three user-supplied photographs: WCRT-200 manual cover, NTPS 30 exploded carriage, and general arrangement drawing. It does not add canonical facility records. Source photographs and private manuals are not bundled.

Drawing anchors: 386-inch conveyor extent, 142-inch frame height, 20-inch conveyor pass height, and 138-inch longitudinal frame span. Member sizes, hidden details, bearings, mesh, drive internals, and carriage dimensions are approximations. Exploded positions illustrate component separation, not a service procedure.

- Drag or use arrow keys with the canvas focused to orbit through 360 degrees.
- Scroll/pinch to zoom; right-drag/two-finger drag to pan.
- Use the explosion slider or Assemble/Explode buttons.
- Switch to NTPS 30 carriage for the cover, drive, chassis, rollers, and gate.
- Click geometry or choose an assembly to highlight it.
- Download exports the visible geometry and current exploded positions to binary glTF. Coordinates are in inches; apply a 0.0254 scale when importing into a tool that assumes meters.

The viewer uses locally bundled Three.js. No image-generation or external network service is needed at runtime.

## Standalone deliverable

Run `node scripts/export-wulftec-viewer.mjs` to generate `artifacts/wulftec-3d/Wulftec-360.html`. Open it directly in a WebGL-capable browser; all JavaScript and CSS are embedded. No account or server is required.

Run `python scripts/check-wulftec-export.py` on the Windows development host to check the standalone viewer at desktop and phone sizes and save an assembled GLB alongside it. The shared visual audit also covers the app viewer at all seven required sizes, with rotation, explosion, carriage selection, and GLB download at representative desktop/phone sizes.

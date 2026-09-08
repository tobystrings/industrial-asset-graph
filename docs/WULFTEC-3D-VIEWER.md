# Wulftec WCRT-200 reference model

Open **More → Wulftec 3D model**, or `?page=wulftec`.

Production builds also include a standalone viewer at `/industrial-asset-graph/wulftec/`, accessible without signing in.

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

# Climax interactive equipment images

Open Equipment → Climax → Explore cabinet photos, or Facility Map → Location unconfirmed equipment → Climax control cabinet → Explore cabinet photos.

The cabinet is a separate asset from the machine. Its area assignment follows the existing machine record; no measured map position or conduit route is asserted. Five visible drives, two unidentified motion units, a fuse bank, main disconnect mechanism, transformer and controller/I/O row have selectable photo regions. The saved PLC associations remain separate because no source maps them to the photographed devices.

## Navigation

`?page=cabinet&asset=LIEB-L2-CLIMAX-6759-CABINET&image=climax-interior&component=LIEB-L2-CLIMAX-6759-CABINET-upper-left&section=parameters`

Sections: overview, parameters, in, out, documents. Image and component selection use existing history navigation. Existing cabinet URLs keep the original cabinet drawing. Unknown cabinet/component IDs show unavailable states. Device list buttons provide touch and keyboard alternatives to small photo regions. Images use native contained scrolling at increased zoom; mouse dragging pans. Fit resets zoom and scroll.

## Content authoring and review

`featureConfig.imageViews` stores image dimensions, evidence ID, owning cabinet, associated machine and normalized rectangular regions (0–1). Each region references the owning cabinet or one of its components. Original images remain unmodified. Photo regions are configuration authored; there is no graphical hotspot editor in this pilot.

Component `savedParameters` is an optional array of versioned saved records. Each record has `id`, `sourceDocumentId`, optional `capturedAt`, `verificationStatus`, and `values` containing `code`, `name`, `value`, optional `unit`. The source document must belong to the component's cabinet and carry evidence. Original source backups are attached through the existing evidence workflow; transcribed values are added to component records through the existing facility package import/review process. Uploading a backup alone does not parse it or assert its values. Missing dates and values remain explicit. No file-format parser or live drive connection is added.

Use existing typed dependency authoring to record power, control, data, mechanical and process connections with evidence. Containment never becomes a supply connection. DOWNSTREAM_OF reverses traversal direction. Retired connections are excluded. Unverified and disputed records retain visible status. Tracing proceeds one edge at a time and therefore permits branches and cycles without recursive expansion.

Seed augmentation runs through the existing Climax package upgrade on fresh loads, restored local packages and shared publication hydration. It is additive and idempotent and preserves reviewed photo geometry and labels. The cabinet has no invented map marker. Schema validation rejects missing IDs, cross-cabinet regions, invalid geometry and parameter sources. Existing publication, access controls and facility isolation remain in use.

## Verification

Unit cases cover repeated imports, preserved edits, unresolved parameter records, zero-valued settings, invalid geometry, unrelated components, connection direction and branching, and absence of invented feeds. Responsive audit adds the selected Climax drive state at the representative laptop and phone workspace audit viewports. The focused browser journey covers real photo selection, view changes, direct links, browser Back, missing records and contained zoom. Browser fixture data is synthetic and never written to production.

Outstanding field content: installed component designations, saved drive backups, actual upstream supplies, downstream motors/mechanisms, and surveyed cabinet placement. The application renders these as missing or unconfirmed until evidence is added.

## Completed validation — September 16, 2026

- 280 unit tests passed; one existing test remained skipped.
- Facility data verification and permanent visual-contract verification passed.
- Production build, including browser and server TypeScript checks, passed.
- Focused desktop, phone and 320-pixel phone journeys passed: map entry, image selection, sketch switching, saved parameters, upstream/downstream tracing, browser history, invalid IDs and contained zoom.
- Full responsive audit passed at all nine configured desktop/tablet/phone sizes. Cabinet and narrow-phone map screenshots were visually reviewed.
- Parameter values and feed relationships used by browser tests were synthetic and confined to isolated browser storage.

Changes are in the local `codex/climax-photo-navigation` branch. No production deployment was performed. The local test build uses synthetic authentication configuration; deployment should use the repository's existing production configuration.

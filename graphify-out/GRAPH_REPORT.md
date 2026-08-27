# Graph Report - industrial-asset-graph-working  (2026-08-27)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 992 nodes · 2642 edges · 70 communities (55 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.86)
- Token cost: 1,998 input · 824 output

## Graph Freshness
- Built from commit: `7a221a08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Film Scene Management
- Dashboard Data Records
- Device Inspector Panel
- Audio Player Controls
- Facility Guide UI
- Demo Facility Configuration
- Project Dependencies
- Asset Management UI
- Control Cabinet View
- Animation Utilities
- Cabinet Door Sheets
- Asset Selection Panel
- Database Import Export
- Relationship Workspace
- Facility Editor API
- TypeScript Compilation Config
- Inspector Review Rail
- Document Workspace
- Drive Slot Walkdowns
- App Boot Engine
- User Audit Control
- Facility Map Navigation
- Field Documentation Tasks
- Scroll Behavior Utilities
- Archive Zip Utilities
- Floor Packet Logic
- Asset Directory System
- Evidence Fingerprinting
- Visual Regression Tests
- Industrial Hardware Specs
- Cabinet SVG Generator
- Facility Layout UI
- TypeScript Project References
- Agent Configuration
- Modernization Handoff
- Guide Documentation
- Service Worker Assets
- UX Pass Tests
- Agent Rules
- Case Former Metadata
- Conveyor Control Cabinet
- Film Opening Scene
- Terminal Responses
- Dashboard UI
- Cabinet PDF Documentation
- Project README

## God Nodes (most connected - your core abstractions)
1. `FacilityEditorApi` - 30 edges
2. `Dashboard()` - 30 edges
3. `FacilityAsset` - 24 edges
4. `FilmTheater()` - 24 edges
5. `areas` - 24 edges
6. `machines` - 23 edges
7. `useFacility()` - 22 edges
8. `VerificationState` - 19 edges
9. `markerClass()` - 19 edges
10. `DeviceIntel()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `FacilityProvider()` --indirect_call--> `exportPlantArchive()`  [INFERRED]
  src/facility/FacilityProvider.tsx → src/facility/runtimeDb.ts
- `FacilityProvider()` --indirect_call--> `exportPlantBackup()`  [INFERRED]
  src/facility/FacilityProvider.tsx → src/facility/runtimeDb.ts
- `FacilityProvider()` --indirect_call--> `listAttachments()`  [INFERRED]
  src/facility/FacilityProvider.tsx → src/facility/runtimeDb.ts
- `FacilityProvider()` --indirect_call--> `listObservations()`  [INFERRED]
  src/facility/FacilityProvider.tsx → src/facility/runtimeDb.ts
- `FacilityName()` --calls--> `useFacility()`  [EXTRACTED]
  src/facility/facilityPackage.test.tsx → src/facility/FacilityProvider.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI/CD Validation Pipeline** — agents_rules, docs_visual_layout_contract, readme [EXTRACTED 0.95]
- **Facility Guide Motion Assets** — public_assets_facility_guide_readme, public_assets_facility_guide_guide_idle_png [EXTRACTED 1.00]
- **Product Honesty Constraints** — agent_env, agent_handoff, docs_modernization_handoff [EXTRACTED 1.00]
- **Line 2 Cabinet Documentation Set** — public_assets_line2_control_cabinet_cabinet_svg, public_assets_line2_control_cabinet_cabinet_pdf, public_assets_line2_control_cabinet_cabinet_png, public_assets_line2_control_cabinet_photos_cabinet_reference_render_png [EXTRACTED 1.00]

## Communities (70 total, 15 thin omitted)

### Community 0 - "Film Scene Management"
Cohesion: 0.06
Nodes (76): FilmTheater(), ManifestScene, applyIncomingBeat(), beatIndexAt(), BeatStage, beatStageFor(), FilmBeatMessage, motionForBeat() (+68 more)

### Community 1 - "Dashboard Data Records"
Cohesion: 0.06
Nodes (68): allRecords, cabinet, cabinetRoot, cabinetSvg, duplicateIds, entityIds, evidenceIds, factRecords (+60 more)

### Community 2 - "Device Inspector Panel"
Cohesion: 0.06
Nodes (64): DeviceIntel(), chromeAtWidth(), cycleInspectorTab(), dualNavHidden(), INSPECTOR_TABS, InspectorPanel, inspectorVisible(), KEPT_SURFACES (+56 more)

### Community 3 - "Audio Player Controls"
Cohesion: 0.06
Nodes (53): appHrefs, audio, buildChapterButtons(), chapterButtons, chapterNum, chapters, chaptersBtn, chapterTitle (+45 more)

### Community 4 - "Facility Guide UI"
Cohesion: 0.09
Nodes (32): App(), initialView(), AppView, FacilityGuide(), GuideActions(), guideAnimationClass(), GuideBubble(), GuideCharacter() (+24 more)

### Community 5 - "Demo Facility Configuration"
Cohesion: 0.08
Nodes (33): demoFacilityPackage, featureConfig, areas, assetSerialSources, components, documents, documentStates, evidence (+25 more)

### Community 6 - "Project Dependencies"
Cohesion: 0.05
Nodes (40): dependencies, react, react-dom, @react-three/drei, @react-three/fiber, three, devDependencies, tsx (+32 more)

### Community 7 - "Asset Management UI"
Cohesion: 0.11
Nodes (32): AreaEditor(), AssetForm(), DatabasePanel(), documentationStates, downloadFile(), EvidencePanel(), ManageAssets(), MapPoint (+24 more)

### Community 8 - "Control Cabinet View"
Cohesion: 0.10
Nodes (29): CabinetDevice, CabinetMetadata, ControlCabinetView(), packageAssetUrl(), packageHref(), pretty(), DoorSheet(), destUnknownHighlight() (+21 more)

### Community 9 - "Animation Utilities"
Cohesion: 0.15
Nodes (25): barWidthAt(), cameraLerp(), clamp01(), countAt(), easeOutBack(), easeOutCubic(), emissivePulse(), growAt() (+17 more)

### Community 10 - "Cabinet Door Sheets"
Cohesion: 0.14
Nodes (25): cabinetHref(), DoorCard, doorSheetCards(), configuredDriveInstances(), driveInstanceFor(), LINE2_VFD_COUNT, line2DriveInstances(), graphFieldItemCount() (+17 more)

### Community 11 - "Asset Selection Panel"
Cohesion: 0.14
Nodes (20): SelectedAssetPanel(), SelectedAssetPanelProps, stateLabel, areas, documentationPercent(), AreaCaptureKit, captureKitForArea(), EMPTY_PROMPTS (+12 more)

### Community 12 - "Database Import Export"
Cohesion: 0.19
Nodes (25): applyImportedPlant(), ArchiveAttachment, blobToDataUrl(), dataUrlToBlob(), deleteAttachment(), ensurePlantSeed(), ExportAttachment, exportPlantArchive() (+17 more)

### Community 13 - "Relationship Workspace"
Cohesion: 0.13
Nodes (21): confidenceText(), modes, RelationshipsWorkspace(), DependencyDirection, domainLabels, semanticsFor(), buildTroubleshootIndex(), confidenceRank (+13 more)

### Community 14 - "Facility Editor API"
Cohesion: 0.09
Nodes (4): FacilityEditorApi, AttachmentRecord, ObservationRecord, PlantBackup

### Community 15 - "TypeScript Compilation Config"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2022, src, src/**/*.test.ts, vite/client, compilerOptions, allowJs (+16 more)

### Community 16 - "Inspector Review Rail"
Cohesion: 0.20
Nodes (20): EvidenceLike, InspectorRail, Props, Revision, stateLabel, TraceNode, applyKeepDecision(), decideReview() (+12 more)

### Community 17 - "Document Workspace"
Cohesion: 0.15
Nodes (16): DocumentBody(), DocumentsWorkspace(), stateLabel, states, StatusI(), DocumentBody(), StatusI(), root (+8 more)

### Community 18 - "Drive Slot Walkdowns"
Cohesion: 0.19
Nodes (20): DriveSlots(), applyKeptCapture(), canUseStorage(), capturesFor(), INVENTABLE, latestCapturedValue(), latestNoteFor(), loadWalkdownCaptures() (+12 more)

### Community 19 - "App Boot Engine"
Cohesion: 0.10
Nodes (15): boot, bootFrame(), canvas, commands, count(), ctx, finishBoot(), input (+7 more)

### Community 20 - "User Audit Control"
Cohesion: 0.22
Nodes (19): AuditEvent, digest(), hasAdminCredential(), IagUser, loadAuditEvents(), loadCurrentUser(), loadPendingChanges(), PendingChange (+11 more)

### Community 21 - "Facility Map Navigation"
Cohesion: 0.16
Nodes (15): AppView, FacilitySidebar(), group(), Props, BlueprintMap(), floorPlanCrop, floorPlanRect(), MapMode (+7 more)

### Community 22 - "Field Documentation Tasks"
Cohesion: 0.22
Nodes (13): categoryLabel, FieldDocumentationWorkspace(), baseline, FieldDocumentationCategory, fieldDocumentationProgress(), FieldDocumentationTask, fieldDocumentationTasks(), slug() (+5 more)

### Community 23 - "Scroll Behavior Utilities"
Cohesion: 0.24
Nodes (11): allViewsCanScroll(), chipSnapAxis(), cssAllowsScroll(), overscrollContain(), prefersReducedMotion(), SCROLL_PANE_SELECTOR, SCROLLABLE_VIEWS, scrollBehavior() (+3 more)

### Community 24 - "Archive Zip Utilities"
Cohesion: 0.24
Nodes (12): ArchiveValue, arrayBufferCopy(), bytesOf(), crc32(), crcTable, createStoredZip(), dosTimestamp(), put16() (+4 more)

### Community 25 - "Floor Packet Logic"
Cohesion: 0.27
Nodes (9): FloorPacket(), FloorPacket, floorPacketFor(), l4FloorPacket(), line2FloorPacket(), relationshipTypeCount(), suppliesHonesty(), UNUSED_RELATIONSHIP_TYPES (+1 more)

### Community 26 - "Asset Directory System"
Cohesion: 0.33
Nodes (10): AssetDirectory(), deviceSummary(), familyLabel(), statusLabel, componentsInSystem(), machinesInSystem(), SYSTEM_KINDS, TYPE_MAP (+2 more)

### Community 27 - "Evidence Fingerprinting"
Cohesion: 0.38
Nodes (9): EvidenceFingerprint, evidenceFingerprintBytes(), toHex(), isInventableField(), walkdownMoreDefaultOpen(), loadLastWho(), saveLastWho(), promptForUnknown() (+1 more)

### Community 28 - "Visual Regression Tests"
Cohesion: 0.36
Nodes (8): Path, assert_manager_geometry(), close_editor(), diagnostic(), exercise_manager_states(), exercise_workspace_states(), screenshot(), verify_pixels()

### Community 29 - "Industrial Hardware Specs"
Cohesion: 0.33
Nodes (6): MicroLogix 1400 PLC, PowerFlex 4 VFDs, Master Picture Index, Line 2 Cabinet Layout Diagram, Line 2 Cabinet Interior Layout SVG, Cabinet Reference Render

### Community 31 - "Facility Layout UI"
Cohesion: 0.67
Nodes (3): Facility Dashboard UI, Facility Floor Plan, Labeled Building Layout

## Knowledge Gaps
- **231 isolated node(s):** `ManifestScene`, `FilmBeatMessage`, `Manifest`, `VisualToken`, `FilmMessage` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `FacilityEditorApi` connect `Facility Editor API` to `User Audit Control`, `Demo Facility Configuration`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `FacilityAsset` connect `Field Documentation Tasks` to `Dashboard Data Records`, `Demo Facility Configuration`, `Asset Management UI`, `Animation Utilities`, `Asset Selection Panel`, `Relationship Workspace`, `Facility Editor API`, `Inspector Review Rail`, `User Audit Control`, `Facility Map Navigation`, `Asset Directory System`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `ManifestScene`, `FilmBeatMessage`, `Manifest` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Film Scene Management` be split into smaller, more focused modules?**
  _Cohesion score 0.06373626373626373 - nodes in this community are weakly interconnected._
- **Should `Dashboard Data Records` be split into smaller, more focused modules?**
  _Cohesion score 0.05727848101265823 - nodes in this community are weakly interconnected._
- **Should `Device Inspector Panel` be split into smaller, more focused modules?**
  _Cohesion score 0.06264199935086011 - nodes in this community are weakly interconnected._
- **Should `Audio Player Controls` be split into smaller, more focused modules?**
  _Cohesion score 0.06233766233766234 - nodes in this community are weakly interconnected._
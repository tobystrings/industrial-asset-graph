# Genie rebuild — audit and first vertical slice

## Audit before implementation

The existing guide is mounted only on Help. `GuideProvider` owns context and preferences;
App handles typed `facility-guide-action` navigation. Preserve that integration and the
dedicated page, which reserves layout space. The old character is a cropped PNG with
whole-image translations. Page-only rules, stale welcome messages, unused sound controls,
unscoped preferences, and a 45-second repeat window do not support field work.

The live source of truth is `FacilityProvider`: assets, individually verified facts,
required documents, evidenced relationships, and revisions. `FacilityEditorApi` supplies
observation capture and review. Production electrical entries have no individual
verification metadata; their presence must not be described as verified electrical facts.
There is no native work-order entity: service/task records are the honest destination.

The September publication workflow can publish newly captured evidence for the authorized
facility. The Genie must explain the active setting, never promise all new uploads are
private, and never alter access or promote observations itself.

## Product direction

One original articulated SVG character, in a responsive Help workbench. Summon from the
page title with asset/area/connection context preserved. No global floating character.
Short local answers, actual record sources, explicit verification states, one next action,
and direct observation capture. No fake AI, artificial thinking delay, or audio toggle
that promises speech. Muting means silencing proactive reminders.

## Implemented slice

### 1. Files

- `src/App.tsx`: derives live guide context and carries selection into action routes.
- `src/navigation/AppShell.tsx`: explicit Ask Genie entry and in-flow reminder placement.
- `src/production/ProductionWorkspace.tsx`: opens the electrical field sheet from Genie;
  adds amperage, control-voltage and safety-device capture fields to the existing model.
- `src/facility/publication.ts`, `src/facility/publicationAccess.test.ts`: enforce attachment
  access before uploads/cached URL reuse, and preserve local files when receiving shared data.
- `src/features/facility-guide/FacilityGuide.tsx`: responsive workbench, topic selection,
  source inspection, observation capture, draft recovery and actual-save feedback.
- `src/features/facility-guide/GuideCharacter.tsx`: original articulated SVG character.
- `src/features/facility-guide/GuideProvider.tsx`: account/facility scope, state and reminders.
- `src/features/facility-guide/GuideController.ts`: reminder eligibility and session limits.
- `src/features/facility-guide/GuideReminder.tsx`: nonblocking documentation reminder.
- `src/features/facility-guide/GuideSettings.tsx`: personality, motion and quiet controls.
- `src/features/facility-guide/guideContext.ts`: read-only live-package context derivation.
- `src/features/facility-guide/guideKnowledge.ts`: typed local task answers and destinations.
- `src/features/facility-guide/guideRules.ts`: task-specific priority and personality wording.
- `src/features/facility-guide/guideTypes.ts`: typed context, actions, messages and preferences.
- `src/features/facility-guide/guideStorage.ts`: validated, scoped browser preferences.
- `src/features/facility-guide/guideConfig.ts`: updated reminder limits.
- `src/features/facility-guide/guide.css`: isolated responsive styling and articulated motion.
- `src/features/facility-guide/index.ts`: removes the obsolete dialogue export.
- `src/features/facility-guide/GuideController.test.ts`, `guideRules.test.ts`,
  `guideContext.test.ts`, `guideStorage.test.ts`: behavior, source honesty and isolation checks.
- `scripts/genie_visual.py`, `scripts/dashboard-visual-check.py`: additional browser flows
  and representative states without removing existing viewport/workspace checks.
- `docs/GENIE-REBUILD.md`: audit, implementation inventory and limits.

Removed unused `GuideBubble.tsx`, `GuideDebugPanel.tsx`, `guideAnimations.ts` and
`guideDialogue.ts`. The old image is no longer rendered. Existing film assets remain intact.

### 2. Animation states

Entrance/waltz and greeting wave; idle breathing, cable movement and blink; talking mouth
and nod; pointing arm/head toward the adjacent action; thinking while an observation save
is pending; caution pose for uncertainty/electrical guidance; brief celebration after a
successful save; exit on dismissal; sleeping/off-duty pose when minimized.

Motion is articulated, not a translated portrait. Full motion respects the operating
system's reduced-motion preference. Reduced/Off retain readable static poses and disable
all animation. No artificial response delay or generated voice.

### 3. Live context and actions

The current facility, explicit asset, area, selected relationship and originating page
feed the workbench. Selected relationships resolve a real endpoint asset, including a
component's parent. Context includes individual fact verification, source references,
structured electrical gaps, recorded documentation tasks, weighted required-document
progress, direct links and distinct referenced evidence records. No checklist means no
percentage. Missing structured entries may still be documented in drawings.

Conflict guidance has first priority. Troubleshooting, document and map-edit contexts
take precedence over unrelated electrical gaps. Sources remain inspectable beside the
answer. Eight local topics cover next steps, electrical facts, traces, evidence,
verification, maintenance, maps/layers, and reports/backups.

Working destinations: map, assets, troubleshooting, documents, cabinet, evidence,
electrical field sheet, connections, review, service/task records and backups. Selection
is preserved where applicable. Observation capture directly uses the existing IndexedDB
editor API with FIELD_VERIFY and the signed-in author. It does not change canonical facts.
Drafts survive navigation/reload in the same tab, scoped by account/facility/asset. Save
errors retain the draft; stale asynchronous results cannot populate another asset's UI.

The guide is on Help. Ask Genie summons it; no global character or chatbot was added.
The only proactive surface is an opt-in, structurally reserved reminder after leaving
an asset, field, maintenance or cabinet page with recorded gaps. It never blocks navigation.

### 4. Personality

- Professional: “Next step for L2-CC-001.”
- Crew: “One less mystery for the next shift.”
- Full Genie: “The panel schedule isn’t a crystal ball.”

All three use the same underlying facts, actions and safety boundaries. Saved-observation
feedback is respectively “Observation saved,” “Good catch. The next shift thanks you,”
or “That’s one less campfire story.” Wording remains profanity-free.

### 5. Quiet behavior

Reminders are opt-in and never triggered merely to narrate a click. Occasional means at
least 10 minutes apart; Rare means at least 30. At most three appear per tab session,
once per asset, with the cap retained across reloads. Not now, minimize and hide pause
reminders for eight hours. Mute suppresses proactive reminders; there is no audio.
A successful finding suppresses that asset's unfinished-record hint without marking
any graph gap resolved. Preference reset is explicit. Browser preference keys include
both facility and user; timestamps persist across reloads. If browser storage is blocked,
the guide remains usable, with in-memory limits for the current mount.

### 6. Validation

Baseline: 57 test files passed; 222 tests passed, one pre-existing skipped test.
Final unit suite: 60 test files passed; 236 tests passed, the same one skipped test.
The build, data verification and permanent layout-contract check pass. The two-browser
publication test passes public attachment transfer, duplicate prevention, shared renames,
draft recovery, concurrent conflicts, explicit resolution and reload.

The visual suite runs against the configuration used by `.github/workflows/ci.yml`:
publication enabled, with a synthetic Supabase endpoint/key and intercepted browser
requests. No real account/service receives test captures. A default local-mode run
correctly saved a walkdown locally, but the pre-existing suite expects the publication
success wording. The suite's assertion was preserved and the build configuration aligned
with CI. The early ambiguous preference labels were corrected in the implementation.
Final `npm run test:visual`: PASS across all seven required viewports, including the
existing manager, field, cabinet, historical-evidence and map-edit workflows. Added Genie
states cover contextual answers, source inspection, actual observation saves, selected
asset navigation, settings persistence, reduced motion, hide/restore, keyboard focus
return, and reminder suppression across reloads. Desktop and phone screenshots were
visually reviewed for hierarchy, contrast and chrome clearance.

All five required checks pass. Public-sharing regression coverage additionally passes
`npm run test:publication`. The normal local build is restored after the synthetic CI
browser run; no environment file or deployed service setting was changed.

Nonfatal build warnings remain for bundle size, mixed static/dynamic imports, and a
legacy backdrop URL. No layout contract or existing visual assertion was weakened.

### 7. Next slice and current boundaries

Extend from direct selected-asset links to evidence-aware multi-hop explanations, with
explicit per-edge citations and unresolved branches. Add live Map Studio tool/draft events
and field-capture completion events rather than inferring work from clicks. Component
detail context can be deeper than the parent asset. The current KB explains map tools;
it does not inspect unsaved wall/door edits or operate them.

The product has no native CMMS work-order entity: Genie routes to actual service/task
records and says so. It has no live AI, speech, plant telemetry, safe-isolation knowledge,
automatic verification or evidence-publishing action. Review opens the existing review
workspace; a saved observation is not automatically submitted as a canonical change.
This slice does not add a blocking before-leave dialog or infer that unsaved work is lost.

The audit found an existing publication defect: all attachment blobs were uploaded,
regardless of access label. This slice restricts attachment publication to PUBLIC_APP,
including cached-upload reuse, and preserves LOCAL_ONLY/RESTRICTED attachments when
applying shared snapshots. It also declines legacy private-file downloads and implicit
promotion of an existing private attachment. Existing reference metadata in the plant
package remains governed by that package's publication policy. This fix cannot retract
files that were already published by an earlier version.

No FacilityPackage schema, facility records, access labels, revision semantics, import/
export or existing browser data were migrated or rewritten by the guide. The narrowly
scoped publication change enforces the existing attachment access labels.

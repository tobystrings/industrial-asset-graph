# Facility Guide

The Facility Guide is a persistent, local, rules-based assistant. It uses facility state already present in the application and never invents asset facts, document evidence, or relationships.

## Architecture

- `GuideProvider` owns context, preferences, persistence, current message, and typed actions.
- `GuideController` enforces the session prompt cap and automatic-prompt cooldown.
- `guideRules` selects declarative, priority-ordered prompts.
- `guideDialogue` contains short grounded copy.
- `FacilityGuide`, `GuideCharacter`, `GuideBubble`, `GuideActions`, and `GuideSettings` render the interface.
- `useFacilityGuide` is the integration API for future pages.

Preferences and dismissed tips are stored in `localStorage`. Automatic prompts are capped at eight per session with a 45-second cooldown. Escape closes the bubble. Reduced-motion preferences are respected.

## Extending

Pages update guide context through `useFacilityGuide().setContext`. Actions are typed and dispatched as `facility-guide-action` browser events so existing navigation remains independent. Add rules to `guideRules.ts`; ensure every message is supported by real context.

Append `?guideDebug=1` in development to display the current context and available rule IDs.

## Assets

The supplied superhero image is the still fallback. No transparent motion footage was supplied. See `public/assets/facility-guide/README.md` for optional animation filenames.

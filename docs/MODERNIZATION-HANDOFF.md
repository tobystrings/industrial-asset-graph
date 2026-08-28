# Industrial Asset Graph — Modernization, Features, Animation

**Status:** proposal for agent handoff  
**Date:** 2026-08-13  
**Repo:** `/Users/p/Downloads/industrial-asset-graph-main`  
**Live local:** `http://127.0.0.1:4173/industrial-asset-graph/`  
**Film:** `http://127.0.0.1:4173/industrial-asset-graph/presentation/`  
**Audience:** implementing agent. Do not invent facility facts. Do not add 3D.

This document is the work order. Implement in the phases below. Each phase has files, behavior, and a check an agent can run.

---

## 0. What this product is

A **facility knowledge dashboard** for J. Lieb Foods. It is not a CMMS, not SCADA, not a digital twin.

The film’s thesis: *the facility should know how the facility works.* The app’s job is to make that true on a screen a maintenance electrician can use on a plant floor or at a desk.

Every number, nameplate, location, and wire claim must stay **evidence-aware**:

- `VERIFIED` — backed by accepted evidence
- `FIELD_VERIFY` — known gap, must be captured in the field
- `INFERRED` — working assumption, visibly labeled
- `DISPUTED` — conflicting sources (e.g. serial vs tag)
- `RETIRED`

**Hard rules (do not break):**

1. Do not infer conductors, hidden wiring, PLC logic, or unverified machine coordinates.
2. Do not bundle local-only evidence (photos, PLC programs, manuals) into the public frontend.
3. Do not add a 3D viewer. The README and visual-check script forbid a legacy 3D entry point.
4. Relationship types already exist (`FEEDS`, `CONTROLS`, `UPSTREAM_OF`, …). Use them. Do not invent new ones unless a real evidence record requires it.
5. Honor `prefers-reduced-motion: reduce` (already in `dashboard.css`). Motion is additive, never required to understand state.
6. Never hide **all** navigation at once. Today `@media (max-width: 1050px)` sets both `.facility-sidebar` and `.top-nav nav` to `display: none`. That is a defect, not a breakpoint.

---

## 1. Current state (as shipped)

Read these first:

| File | Role |
|---|---|
| `src/App.tsx` | Two views only: `dashboard` \| `cabinet` via `?view=` |
| `src/Dashboard.tsx` | Entire dashboard, ~47 dense lines, dead nav |
| `src/ControlCabinetView.tsx` | SVG cabinet + device list |
| `facilities/lieb-foods/` | J. Lieb facility package: areas, **2 assets**, components, documents, maps, and typed relationships |
| `src/types/facility.ts` | Source of truth for verification / graph types |
| `src/dashboard.css` | One 90-line global stylesheet, industrial dark |
| `index.html` | Title still **Plant Dependency Map**; **no font load** |
| `presentation/` | Narrated film. Terminal commands Risk / Map / Trace / Verify / Help are **film-only** |
| `vite.config.ts` | `base: '/industrial-asset-graph/'` — keep this |

### What the screenshot shows (bugs, not taste)

1. **Map letterboxing.** `.facility-map` is `#e9eaeb` and the PNG uses `object-fit: contain` + invert filter. Result: two huge pale slabs left/right of the floor plan. Looks unfinished.
2. **Dead chrome.** Top nav `Assets` / `Documents` do nothing. Sidebar `Areas` / `Equipment` / `Systems` do nothing. Search works only for the two machines.
3. **Empty verification = zeros.** With no asset selected, Verification Status shows 0/0/0/0/0. The footer is the only honest facility-level signal.
4. **Machine markers are fake positions.** `left: 43 + index * 15%` — not field-verified coordinates. The legend already admits this; the UI still looks like GPS.
5. **Relationships are a wrap of cards**, not a graph. Types `FEEDS` / `CONTROLS` / `UPSTREAM_OF` are in the type system and unused in data/UI.
6. **Documents don’t open.** Clicking a doc tile shows a stub (title + path). The markdown under `docs/machines/` and `docs/control-cabinets/` is never rendered.
7. **Fonts are missing.** CSS names Inter and Barlow Condensed. `index.html` never loads them. Fallback is Arial/system.
8. **No motion language.** One `transition: .15s` on map regions. Status dots are static. Film is cinematic; the app is inert.
9. **Title mismatch.** Browser tab says “Plant Dependency Map.” Brand says “Industrial Asset Graph.”
10. **Responsive that removes the product.** At `≤1050px` the sidebar **and** the top nav disappear. At `≤620px` search disappears too. A phone user cannot change area, open Assets, or find a VFD. The film button survives; the work tools do not.
11. **Plant-laptop height kills the queue.** `@media (max-height: 820px)` sets `.unknowns { display: none }`. `1366×768` is the official visual-check size. The field-verification list — the point of the app — is hidden on the screen it was tested for.
12. **Phone is a 2,000px scroll.** `.asset-panel { min-height: 950px }` at `≤620px`. Five panels stack (`map` + asset + relations + verify + activity). Unusable one-handed at a cabinet.
13. **Cabinet drawing is a 900px-wide scroll.** `.cabinet-svg svg { min-width: 900px }` at `≤760px`. No pinch-zoom, no pan affordance, 8px list padding.

Data volume is honest and thin: Warehouse F holds both documented assets (`FG-L4-MTN-001`, `L2-CC-001`). Empty areas are a feature, not a bug — they are the field-work queue.

---

## 2. Design direction

Keep the **dark operations** look. Do not restyle it as a SaaS marketing site. Modernize *inside* the industrial language:

- **More instrument, less brochure.** The film already sells. The app should feel like a board you can work from.
- **One selected thing at a time.** Area → asset → component → evidence. Selection always has a visible breadcrumb.
- **Status is light, not text.** Dots already exist. Make them the primary scan layer (pulse by state).
- **Trace is the signature interaction.** The film promises `Trace`. The app must actually draw Area → Machine → Cabinet → Device → Evidence.
- **Empty is useful.** An undocumented dock should say “not started · 0 assets · open field capture,” not a blank panel.

Color tokens stay (`--bg #07111b`, `--blue #49a4ff`, status green/yellow/orange/red). Add motion tokens only.

---

## 3. Modernization (visual + technical)

### 3.1 Immediate polish (do first, one PR)

- Load fonts in `index.html`:
  - Barlow Condensed 600/700
  - Inter 400/500/600
  - `display=swap`
- Change `<title>` to `Industrial Asset Graph · J. Lieb Foods`.
- Fix the map canvas:
  - Background of `.facility-map` must match the inverted drawing (`#07090a` or similar), **never** `#e9eaeb`.
  - Prefer a cropped/padded asset, or `object-fit: cover` only if overlays still hit the same building geometry. If cover breaks overlays, keep `contain` but paint the letterbox the same black as the plan.
  - Soft vignette so the plan sits in the panel instead of floating in a white frame.
- Give the empty asset panel a **facility-level** summary (area counts by status, 2 documented assets, 14 open field items) instead of only “Select an asset.”
- Verification panel with no selection should show **facility-wide** counts, not zeros.
- Focus rings already exist. Keep them. Add `:focus-visible` on map regions that is thicker than hover.

### 3.2 Layout that survives a plant laptop

Current grid (`minmax(475px, calc(100vh - 404px))` + 288px) collapses badly at 1366×768 (the visual-check target). **§5 is the full desktop/mobile contract.** Short version for the desktop pass:

- Collapse the right column into a **tabbed inspector** on `laptop` and shorter desks: `Overview | Documents | Queue`. Do **not** hide `.unknowns` to buy height.
- Keep the map as the hero. Never shrink it below 360px height on desktop.
- Sidebar stays on every viewport ≥1050px. Below that, it becomes a drawer, not `display: none`.
- Status bar: keep on desktop. Add crumb `Warehouse F › FG-L4-MTN-001`. On phone the status bar is replaced by the bottom nav (see §5.4).

### 3.3 Code structure (only as needed)

Do **not** rewrite the app. Split only when a phase requires it:

```
src/
  Dashboard.tsx              keep as composer
  map/FacilityMap2D.tsx      extract when adding zoom/trace
  graph/RelationshipGraph.tsx
  inspector/SelectedAssetPanel.tsx
  motion/tokens.css          @keyframes + CSS vars
```

No new framework. No Tailwind unless the whole sheet is migrated (do not). No Three.js. SVG + CSS is enough.

Vite `base` stays `/industrial-asset-graph/`. All asset URLs must keep working on GitHub Pages.

---

## 4. Feature improvements

Ship in this order. Later features assume earlier ones.

### F1 — Navigation that does what it says

**Problem:** Dashboard / Assets / Documents / Control cabinets look like an app. Only Dashboard and Control cabinets work.

**Do:**

| Control | Behavior |
|---|---|
| Dashboard | Current layout (map-first) |
| Assets | Same shell, inspector opens an asset table (the 2 machines + filterable components). Selecting a row selects the area + asset. |
| Documents | Same shell, list of `documents[]` with state chips. Click opens the markdown viewer (F3). |
| Control cabinets | Existing `ControlCabinetView` |
| Sidebar Areas | Filter map + list to that layer (already partially works via area list) |
| Sidebar Equipment | Jump-list of machines/components |
| Sidebar Systems | Group by `line` (Line 2 / Line 4) — no new data required |

Deep-link: `?view=dashboard|assets|documents|cabinet&area=&asset=&doc=`

### F2 — Command palette (the `/` key is already reserved)

Search currently auto-selects only when there is exactly one machine match.

Replace with a small command palette on `/`. On `phone` / `compact` the same index is the **Find** tab (see §5.4) — do not ship a keyboard-only finder.

- Assets, components, documents, areas
- Film commands as first-class jumps: `Risk`, `Map`, `Trace`, `Verify`, `Help`
- Keyboard: `/` open, `↑↓` move, `Enter` go, `Esc` close

`Risk` opens a facility-risk strip (veteran knowledge + undocumented areas).  
`Trace` runs F5.  
`Verify` focuses the verification panel + field queue.  
`Help` is a one-screen legend (states, evidence policy, keys).

### F3 — Documents that open

`docs/machines/FG-L4-MTN-001/*.md` and `docs/control-cabinets/line2/*.md` already exist.

- Import them as raw strings (`?raw`) or a tiny Vite glob.
- Render markdown in the inspector (lightweight: `marked` or a 40-line subset renderer — headings, lists, code, bold). Do not pull MDX.
- Show verification chip + evidence ids at the top of every doc.
- `LOCAL_ONLY` evidence: show a locked row (“exists in local package — not in this build”), never a broken image.

### F4 — Honest map

- Area overlays stay. Improve hit-feel: fill on hover, label chip on select (shortName).
- Machine markers: if coordinates are **not** field-verified, do **not** pin them on the floor. Cluster them in a **dock attached to the selected area overlay** (a small tray on the overlay edge) labeled `positions unverified`.
- When a coordinate *is* verified later, store `{ x, y, verificationStatus }` on the asset and only then pin it.
- Clicking an empty area (Dock 1) should select it and show an empty-state capture card, not do nothing useful.

### F5 — Trace (signature feature)

The film’s `trace` command is the product.

On Trace (command palette, relationship panel CTA, or film terminal “open in app”):

1. Highlight Warehouse F overlay.
2. Draw a polyline / bezier: Area → selected machine → cabinet (if L2) → first verified component → evidence chip.
3. Animate the stroke (`stroke-dashoffset`) over ~900ms.
4. Inspector follows the hop (brief highlight per node).
5. If the user has no asset selected, Trace uses `L2-CC-001` as the demo path and labels it `example path · Line 2 cabinet`.

Use **only** existing `relationships[]`. Do not invent `FEEDS` edges. If you add a relationship, it must cite an `evidenceIds` entry.

### F6 — Relationship graph (replace the card wrap)

Bottom panel becomes an SVG graph:

- Root node = selected asset
- Children = `CONTAINS`
- Evidence nodes = `SUPPORTED_BY_EVIDENCE` (smaller, dashed)
- Future: `CONTROLS` / `FEEDS` as directed edges when data exists
- Cap visible nodes at ~12; “+N more” still opens the cabinet for L2
- Click node → select that entity (component click opens cabinet if parent is L2-CC-001)

### F7 — Field-verify workflow (no backend)

The queue already exists (`unknowns[]`).

- Checklist UI with localStorage persistence (`industrial-asset-field-queue`).
- Each item: open / captured / skipped. Captured stores a timestamp + optional note. **No file upload to the hosted app.**
- Export button: download a JSON/CSV of the queue for the local evidence package.
- Progress on the asset banner: `3 / 7 field items captured (local only)`.

### F8 — Cabinet view upgrades

Keep the SVG. Add:

- Search already works. Add type filters (VFD / I/O / PLC / Power).
- Selecting a device **pans/zooms the SVG** so the device is centered (viewBox animation). Same controller must accept wheel, trackpad, and pinch (§5.6).
- Selected device pulse (see animation).
- Cross-link: “Show on facility map” returns to dashboard with `?asset=L2-CC-001`.
- Keyboard: `j`/`k` next/prev device.

### F9 — Film ↔ app bridge

In `presentation/player.js` terminal:

- After `map` / `trace` / `verify`, offer `OPEN IN APP` → `../?command=trace` etc.
- Dashboard reads `command` once, runs it, strips it from the URL.

Do not rewrite the film.

### F10 — Later (do not start until F1–F6 are green)

- Multi-asset authoring UI (out of scope unless asked).
- Auth / roles.
- Live PLC / OPC-UA. Never implied.
- Offline PWA cache of the public app only.
- Printable LOTO sheet from verified facts only.

---

## 5. Desktop and mobile compatibility

This is a **field tool that also lives on a desk**. Desktop is the briefing surface. Phone is the cabinet surface. Do not ship one stacked layout and call it responsive.

No native app. Responsive web only. `viewport-fit=cover` and `dvh` are required; a React Native shell is not.

### 5.1 Who holds which device

| Surface | Typical glass | Job | Shell |
|---|---|---|---|
| **Desk** | 1920×1080, 2560×1440 | Plan the round, review docs, run Trace | Two-pane: map + inspector + graph |
| **Plant laptop** | **1366×768** (official visual-check) | Same job, short height | Two-pane, **tabbed** inspector, sidebar kept |
| **Tablet** | 768×1024 / 1024×768 | Hold at the panel, share the drawing | Map or cabinet as hero; inspector as sheet |
| **Phone portrait** | 390×844, 360×780 | Find the asset, tick the field queue, open one doc | Map + bottom sheet + 4-item nav |
| **Phone landscape** | 844×390 | Read the cabinet drawing | Cabinet-only: drawing + chips, detail as sheet |

If a control cannot be used with **one thumb** on a 390-wide screen, it does not belong on phone. Put it in the sheet or drop it.

### 5.2 Breakpoint contract

Replace the ad-hoc `1050 / 620 / 820` soup with **named** ranges. Put the numbers in `:root` and use them only there.

```css
:root {
  --bp-phone: 619px;     /* portrait phones */
  --bp-compact: 859px;   /* phone landscape, small tablet */
  --bp-tablet: 1049px;   /* tablet portrait, small laptop */
  --bp-laptop: 1365px;   /* 1366×768 plant laptop */
  --bp-desk: 1679px;     /* 1440–1680 desks */
  /* 1680+ = wide */
}
```

| Name | Width | What the user sees |
|---|---|---|
| `phone` | ≤619 | §5.4 phone shell. No fixed sidebar. No 5-panel stack. |
| `compact` | 620–859 | Same shell, slightly wider map. Search visible. |
| `tablet` | 860–1049 | Sidebar becomes a **left drawer** (hamburger). Map + sheet. |
| `laptop` | 1050–1365 | Current desktop chrome. Sidebar **stays**. Inspector is tabs, not a squeezed column. |
| `desk` | 1366–1679 | Current 2×2 grid, after letterbox fix. |
| `wide` | ≥1680 | Cap the map stage at ~1200px and center the plan. Do not stretch overlays across an ultrawide letterbox. |

**Forbidden at every range**

- Hiding sidebar **and** top nav together.
- Hiding search on `phone` / `compact`. Search becomes the Find tab / icon, never `display: none`.
- `display: none` on `.unknowns` to save height. Put the queue in the inspector **Queue** tab instead.
- `.asset-panel { min-height: 950px }`.
- `.cabinet-svg svg { min-width: 900px }` on phone. The drawing must fit the stage and zoom inside it.
- `100vh` for app chrome. Use `100dvh` (and `100svh` as fallback) so iOS toolbars do not cover the bottom nav.
- Hover-only instructions (`map-hint`). Show the same hint on `:focus-visible` and on the selected-area chip.

### 5.3 Desktop (desk + plant laptop)

**1366×768 is the primary desktop target**, not 1920. Design the laptop shell first, then let desk breathe.

Concrete laptop layout (`1050–1365` wide **or** height `< 800`):

```
[ 54px top nav, film link collapses to icon+label ]
[ 168px sidebar | map (flex) | inspector 360px with tabs ]
[ graph strip 200px, or collapsed behind inspector "Graph" tab if height < 740 ]
[ 32px status + crumb ]
```

Rules:

- Map height ≥ 360px. If the graph strip would push it under, **move the graph into the inspector** as a tab. Do not clip the map.
- Inspector tabs: `Overview · Docs · Queue · Graph`. Remember last tab in `localStorage`.
- Film CTA: icon + “Film” at `laptop`; full “WATCH PROJECT FILM” only at `desk+`.
- Keyboard stays first-class: `/` palette, `?` help, `Esc` closes sheets, `j`/`k` in cabinet.
- Skip links: “Skip to map”, “Skip to inspector”. First tab stop.
- Pointer: every hover state must have a matching `:focus-visible` state. Map regions need a 2px focus ring that survives the invert filter.
- Do not rely on `title=` tooltips for verification notes. Put the note under the fact (already started with `fact.note`).
- Ultrawide: `object-fit: contain` is correct **after** the letterbox is painted plant-black. Overlay percentages stay valid only if the image’s content box is the positioning context — keep overlays as siblings of the `img` inside a box that matches the **rendered image**, not the panel. Implementation: wrap `img` + overlays in `.map-stage` sized to the image’s used box (a short ResizeObserver), or accept contain-centered and size `.map-stage` with `width: auto; height: 100%; aspect-ratio: <image>`.

### 5.4 Phone portrait shell

Do **not** stack the desktop panels. Replace the dashboard on `phone` and `compact` with this:

```
┌─────────────────────────────┐
│ JL   Warehouse F        ☰ 🔍 │  48px + env(safe-area-inset-top)
├─────────────────────────────┤
│                             │
│   map  (min 38dvh, max 46dvh)│  pinch-pan; areas tappable
│                             │
├─────────────────────────────┤
│ ━ sheet handle              │
│ crumb · status chips        │  snap: 28dvh / 58dvh / 90dvh
│ selected asset or empty     │
│ Overview | Docs | Queue     │
└─────────────────────────────┘
│ Map   Find   Queue   Cabinet │  56px + env(safe-area-inset-bottom)
└─────────────────────────────┘
```

**Bottom nav (required)**

| Tab | Opens | Why it exists |
|---|---|---|
| Map | Sheet to 28dvh, map focused | Orient. Default landing. |
| Find | Full-height search (same index as `/` palette) | `/` is undiscoverable on mobile. |
| Queue | Sheet to 58dvh on field items | The job at the machine. |
| Cabinet | `?view=cabinet` if the selection has a cabinet; else Line 2 cabinet with a “example · L2” chip | The drawing is why they pulled the phone out. |

Hamburger `☰` opens Areas / Equipment / Systems / Film / Help. It is the **only** overflow. Do not hide primary work behind it.

**Sheet rules**

- Drag handle, 44px hit.
- Snap points as above. Selecting an area opens 28dvh. Selecting an asset opens 58dvh. Opening a document opens 90dvh.
- Swipe down to 28dvh, never off-screen (or the user loses the selection with no undo).
- Body scroll locks when the sheet is at 90dvh.

**What phone does *not* show**

- Recent Activity feed (desk only).
- Full relationship graph. Phone gets a vertical **path list** (Area → Asset → components) with a “Trace” button. Same data, no SVG force-layout.
- Film as an autoplay hero. Film is behind ☰ or a single row. Autoplay audio on iOS will fail anyway.

### 5.5 Tablet and phone landscape

- **Tablet portrait:** phone shell but map may grow to 50dvh; sidebar drawer can stay pinned if width ≥ 900.
- **Phone / tablet landscape + cabinet view:** drawing takes the left 62%, device chips on the right. Detail is a bottom sheet. This is the “standing in front of the panel” layout.
- **Phone landscape + dashboard:** keep the phone shell; do not suddenly resurrect the desktop grid.

### 5.6 Map and cabinet on touch

**Map**

- `touch-action: none` on `.map-stage` once pinch/pan is implemented; until then `touch-action: manipulation` (kills 300ms double-tap zoom).
- One finger pans, two fingers pinch. Double-tap an area to select + zoom to its overlay.
- Area overlays smaller than 44×44 (Dock 1 is ~3.7% × 15%) are **not** reliable hit targets. On `phone` / `compact`, selecting areas is done from the **area list** in the drawer. Map tap still works when the overlay is large enough (Warehouse A, Freezers).
- Unverified machine markers stay in the area tray (F4), not as 136px cards overlapping the plan.

**Cabinet**

- Implement a single pan/zoom controller used by F8 (wheel/trackpad on desk, pinch on touch). `viewBox` animation from §4 F8 is the same code path.
- Default phone view: whole cabinet fitted (`meet`). Select device → ease viewBox so the device fills ~40% of the stage.
- Device list on phone becomes **horizontal chips** under the search field, 44px tall, not a 300px scroll stealing the drawing.
- Download links (SVG/PDF/PNG/JSON) move into a `⋯` menu on `phone` so they do not wrap the header.

### 5.7 Touch, type, and shop-floor realities

| Rule | Spec |
|---|---|
| Hit target | **44×44 CSS px** minimum for every button, chip, nav item, sheet handle. |
| Input font | **16px** on `phone` / `compact` so iOS does not zoom the page on focus. |
| Status dots | Stay 11px visually; the **row** is the hit target. |
| Contrast | Dark shop + fluorescent. Keep current tokens. Do not drop fact text below `#c5d0d8` on `--panel`. |
| One-handed | Primary actions in the bottom 56px or the sheet. No toast that covers the nav. |
| Gloves / grease | No 8px `font` as the only label. Doc tiles: 12px minimum on phone. |
| Safe areas | `padding-top: env(safe-area-inset-top)` on `.top-nav`; `padding-bottom: env(safe-area-inset-bottom)` on bottom nav and status bar. |
| Viewport | `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` |
| Theme | `theme-color` `#07111b` (already close). |
| Overscroll | `overscroll-behavior: none` on map stage and cabinet stage so Safari rubber-band does not drag the whole app. |
| Reduced motion | Sheet snaps instantly; no pulse. See §6.4. |
| Offline | Phone will lose Wi‑Fi in a steel room. Phase D may add a service worker for the **already-loaded** app shell + current markdown. Do not claim offline authoring. |

### 5.8 Film on a phone

The film is 16:9 with Ken Burns. On a 390-wide screen that is a postage stamp plus captions.

- Play in portrait with letterbox, **or** show “Rotate for the film” and lock the player to landscape via a full-viewport overlay (`position: fixed; inset: 0`). Prefer the overlay so the user does not lose the dashboard.
- Start control must be ≥ 48px and in the thumb zone.
- Terminal command row wraps to two lines. `OPEN IN APP` (F9) must remain tappable.
- Do not autoplay sound. iOS will block it; the existing click-to-start stays.

### 5.9 What to change in CSS *first* (Phase A, no new shell)

These edits are allowed before the phone shell exists and already fix the worst desktop/mobile lies:

1. Delete `.unknowns { display: none }` from the `max-height: 820px` query.
2. Delete `.facility-sidebar { display: none }` and `.top-nav nav { display: none }` from the `1050px` query. Replace with a `.nav-toggle` that opens a drawer.
3. Delete `.global-search { display: none }` from the `620px` query. If space is gone, turn the field into a 44px 🔍 that opens Find.
4. Delete `.asset-panel { min-height: 950px }` and `.asset-panel { min-height: 620px }`.
5. Paint `.facility-map` plant-black (already in Phase A).
6. `html, body, #root, .dashboard { min-height: 100dvh; }`.
7. Add `viewport-fit=cover`.

### 5.10 Test matrix (agent must hit these)

Extend `scripts/dashboard-visual-check.py` after the phone shell exists. Until then, manual + Playwright from `npm run dev`.

| Viewport | Device scale | Must show | Must not |
|---|---|---|---|
| 1920×1080 | 1 | Sidebar, map, inspector, graph, status | White map slabs |
| **1366×768** | 1 | Sidebar, map ≥360px, inspector **tabs**, **field queue reachable** | Hidden `.unknowns`, clipped CTA |
| 1024×768 | 1 | Drawer or sidebar, map, sheet/inspector | Desktop 5-row stack |
| 768×1024 | 2 | Phone/tablet shell, bottom nav or drawer | `min-height: 950px` panel |
| **390×844** | 3 | Bottom nav (4 items), map ≥38dvh, sheet, Find | Missing search, missing nav, 900px cabinet scroll |
| 360×780 | 3 | Same as 390, no horizontal page scroll | Horizontal `body` scroll |
| 844×390 | 3 | Cabinet landscape usable, or dashboard shell without clipping nav | Overlap of sheet and nav |

Console: zero errors other than expected 404s for local-only evidence.

Add `data-testid` only if selectors get brittle (`map-stage`, `bottom-nav`, `inspector-tabs`). Prefer roles as the current script does.

**Manual on a real phone (Windows user: open `http://192.168.4.40:4173/industrial-asset-graph/`):** Warehouse F → L2 cabinet → pinch a VFD → back → Find “PowerFlex” → mark one queue item → lock/unlock phone → item still there.

---

## 6. Animation system

Motion should feel like a **well-made HMI**, not a marketing site. One language, reused.

### 6.1 Tokens — add `src/motion/tokens.css`

```css
:root {
  --ease-out: cubic-bezier(.16, 1, .3, 1);
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --dur-fast: 140ms;
  --dur: 280ms;
  --dur-slow: 560ms;
  --dur-trace: 900ms;
}
```

Import from `main.tsx` after `dashboard.css`. All new motion uses these vars.

### 6.2 What to animate

| Element | Motion | Notes |
|---|---|---|
| Status dots | Soft pulse, period 2.4s, amplitude by state | `VERIFIED` calm, `FIELD_VERIFY` stronger, `DISPUTED` sharper. Pause on hover. |
| Map region select | 1px → 2px border + inset glow, `--dur` | Already half-there; ease it. |
| Area select | Overlay label fades in; other areas dim to 40% | Dim is opacity only, not display. |
| Machine / area tray | `translateY(6px)` + fade, `--dur` | Stagger 40ms per marker, max 5. |
| Inspector swap | Crossfade 180ms | Do not slide the whole column (feels cheap). |
| Trace path | `stroke-dashoffset` `--dur-trace` | One-shot per invoke. Replay on button. |
| Relationship edges | Draw-in when asset changes | Same stroke technique. |
| Cabinet device | 2-cycle glow on select; viewBox ease `--dur-slow` | Cancel in-flight tween on rapid j/k. |
| Command palette | Scale 0.98→1 + fade `--dur-fast` | |
| Progress bar | Width ease when asset changes | |
| Film link | Keep existing hover. Optional 8s slow sheen, disabled if reduced motion | |

### 6.3 What **not** to animate

- Continuous Ken Burns on the floor plan (that belongs in the film).
- Parallax, particle dust, scanlines on the whole UI.
- Number-ticker “AI” counters.
- Layout thrash (animating `grid-template-rows`).
- Anything that moves faster than 200ms without a user gesture, except status pulse.

### 6.4 Reduced motion

Existing rule zeros all animation. After adding tokens, **narrow** that rule so layout transitions can stay instant but we still allow a static (non-pulsing) selected glow. Pattern:

```css
@media (prefers-reduced-motion: reduce) {
  .dot { animation: none; }
  .trace-path, .relation-edge { stroke-dashoffset: 0; }
  .inspector-fade { transition: none; }
}
```

Do not use the current `* { animation: none !important }` once real motion ships — it is too broad. Replace it with the explicit list above.

---

## 7. Phased delivery

### Phase A — Honesty + polish (½–1 day)

- Fonts, title, map letterbox, facility-level empty states, verification totals without selection.
- Wire sidebar Equipment list (no new views yet).
- **§5.9 CSS deletions:** stop hiding `.unknowns`, sidebar+nav, and search. `100dvh`. `viewport-fit=cover`.
- Visual check: `npm run test:visual` still passes (Warehouse F + L2-CC-001 at 1366 and 1920). Field queue must be visible at 1366×768.

**Done when:** screenshot no longer has white slabs; zeros are gone; tab title is correct; 1366×768 still shows nav **and** the field queue.

### Phase B — Navigation + documents + phone shell (1.5 days)

- F1 views + query params.
- F3 markdown viewer for existing docs.
- F2 command palette with Map / Trace / Verify / Help stubs (Trace can scroll/highlight until Phase C).
- **§5.4 phone shell:** bottom nav (Map / Find / Queue / Cabinet), sheet snap points, Find = palette, hamburger overflow.
- **§5.3 laptop inspector tabs** so 1366×768 does not crush the map.

**Done when:** `/` finds `MicroLogix`; Documents tab opens `electrical.md`; `?view=cabinet` still works; **390×844** shows four nav items, no horizontal page scroll, search reachable; 1366×768 keeps the sidebar.

### Phase C — Trace + graph + motion tokens (1–1.5 days)

- `tokens.css`, pulse, select, inspector fade.
- F5 Trace on the map.
- F6 SVG relationship graph.
- F9 film `OPEN IN APP` for `trace`.

**Done when:** invoking Trace draws Area → L2 cabinet → PLC without inventing edges; reduced-motion still usable.

### Phase D — Cabinet + field queue + touch (1–1.5 days)

- F8 pan/zoom + j/k **and** pinch/pan (same controller, §5.6).
- F7 localStorage queue + export.
- Cabinet phone chips + `⋯` downloads.
- Extend `dashboard-visual-check.py` with 390×844 and 768×1024 (§5.10).

**Done when:** selecting CONV #6 frames that drive on desk **and** on a 390-wide viewport; refresh keeps checklist state; cabinet has no 900px forced min-width.

Do not start Phase D if A–C are unfinished.

---

## 8. Implementation notes for the agent

### Commands

```bash
cd /Users/p/Downloads/industrial-asset-graph-main
npm install
npm run dev -- --host 0.0.0.0 --port 4173
# app:  http://127.0.0.1:4173/industrial-asset-graph/
# film: http://127.0.0.1:4173/industrial-asset-graph/presentation/
npm run verify:data
npm run build
npm run test:visual   # needs Python + Playwright/Pillow; skip if env missing, do not fake-pass
```

Windows on the same LAN: `http://192.168.4.40:4173/industrial-asset-graph/`.

### Constraints while coding

- Match existing style: no unused deps if CSS/SVG will do. Allowed adds: a markdown parser if F3 needs it (`marked` is enough).
- Keep `documentationPercent`, verification enums, and `LOCAL_ONLY` access flags.
- Machine marker positions stay **unverified** until a fact says otherwise.
- Do not expand facility packages with fake assets to make the map look full.
- Do not change presentation audio, cue timings, or narration copy except the F9 “open in app” control.
- `scripts/dashboard-visual-check.py` asserts Warehouse F selection and “no legacy 3D entry.” Update selectors if you change class names; do not delete the check.

### Suggested commit slices

1. `fix(ui): map letterbox, fonts, empty-state honesty`
2. `fix(responsive): stop hiding nav/search/queue; dvh + safe-area`
3. `feat(nav): wire Assets/Documents views + command palette`
4. `feat(shell): phone bottom-nav + sheet; laptop inspector tabs`
5. `feat(docs): render existing machine/cabinet markdown`
6. `feat(graph): SVG relationships + Trace path`
7. `feat(motion): tokens, pulses, cabinet focus`
8. `feat(field): local queue + cabinet pan/zoom (pointer + pinch)`

---

## 9. Acceptance (product)

A maintenance user can:

1. Open the dashboard and immediately see **which areas are empty vs in progress**, without clicking.
2. Hit `/`, type `line 2`, open the cabinet, tab to a VFD, and see it framed on the drawing.
3. Run **Trace** and watch a single evidence-backed path draw.
4. Open Electrical for the Meta case former and read the real markdown, with its verification chip.
5. Mark three field-queue items captured, refresh, and still see them (local only).
6. Turn on reduced-motion and still complete 1–5 with no missing information.
7. On a **1366×768** plant laptop: see the sidebar, reach the field queue, and keep the map ≥360px tall.
8. On a **390×844** phone, one-handed: Map → Warehouse F → Cabinet → pinch a drive → Find “PowerFlex” → check a queue item. No horizontal page scroll. No missing search.

A reviewer can:

- Diff the PR and find **zero new unverified coordinates or wiring**.
- Run `verify:data` green.
- Confirm the film still plays and the app still deploys under `/industrial-asset-graph/`.
- Hit the §5.10 viewport matrix (at least 1920, 1366, 390).

---

## 10. Out of scope

- Replacing the film.
- Live equipment state, alarms, or historians.
- User accounts.
- Filling empty buildings with placeholder machines.
- A full design-system rewrite or light theme.
- React Native / tablet-native app (responsive web is enough).
- Showing the full desktop 2×2 grid on a phone “so it matches.”

---

## 11. Why this order

The screenshot’s problems are **trust** problems first (white map, dead buttons, zeroed stats). Motion on top of that would look like makeup. Phase A makes the current data honest **and** stops the CSS from hiding nav/queue on the plant laptop. Phase B makes the chrome true on desk **and** gives the phone its own shell. Phase C delivers Trace. Phase D makes the cabinet usable with a thumb.

If only one phase ships, ship **A**. If two, A+B — otherwise the phone remains a 2,000px scroll.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repository is a dependency-free browser game implemented with native JavaScript, CSS, and ES Modules. It has no package manager, build step, lint configuration, third-party test framework, or CI configuration. Automated tests use Node's built-in test runner.

The game uses a 14-row × 10-column board containing 14 icon types with 10 tiles each. A pair can be eliminated only when the matching tiles are in the same row or column with no occupied cells between them (a straight, zero-turn path). This is intentionally narrower than traditional link-up rules that allow one or two turns.

## Running and verification

Start the static server from the repository root:

```bash
node server.js
```

Open `http://localhost:3013/`. Do not open `index.html` through `file://`; the browser modules require HTTP.

There are no build or lint commands. Run all automated tests with:

```bash
node --test tests/*.test.mjs
```

Run one test file, or filter to one named test, with:

```bash
node --test tests/move-animation.test.mjs
node --test --test-name-pattern="stale callbacks" tests/move-animation.test.mjs
```

For a basic server syntax check, run:

```bash
node --check server.js
```

Behavioral verification is manual in the browser. When interaction code changes, exercise:

- single-target and multi-target elimination;
- row and column dragging, blocked movement, rollback, and candidate commit;
- first and subsequent deadlock dialogs, reshuffling, giving up, and restarting;
- 375px, 768px, and 1440px viewport widths;
- `prefers-reduced-motion` behavior;
- browser Console and Network panels for runtime errors and failed module requests.

The original design and detailed acceptance checklist are in `docs/superpowers/specs/2026-07-06-lianliankan-redesign-design.md`; the implementation plan is in `docs/superpowers/plans/2026-07-06-lianliankan-redesign.md`.

## Architecture

The dependency flow is:

```text
index.html
  └─ game/main.js
       └─ game/interaction.js
            ├─ game/board.js
            ├─ game/drag-input.js
            ├─ game/move-animation.js
            ├─ game/svg-icons.js
            └─ game/dialogs.js
```

- `server.js` is a small Node `http` static-file server fixed to port 3013. `/` resolves to `index.html`.
- `index.html` owns the static page skeleton, controls, status regions, and the three native `<dialog>` elements.
- `styles.css` owns the visual tokens, fixed 10-column/14-row CSS Grid, responsive cell pitch, animations, and reduced-motion overrides.
- `game/main.js` is the browser entry point. It initializes on DOM readiness and triggers pitch remeasurement after fonts load.
- `game/board.js` is the DOM-free model and rules layer: board generation, path checks, target discovery, deadlock detection, reshuffling, single-tile shifting, snapshots, and restoration.
- `game/interaction.js` is the controller and rendering layer. It owns module-private state, synchronizes the model to existing cell elements, handles Pointer Events, drives asynchronous selection and elimination, implements drag rollback/commit, and coordinates win/deadlock flows.
- `game/drag-input.js` locks one active pointer for the lifetime of a drag so another mouse or touch input cannot replace the dragged tile.
- `game/move-animation.js` owns per-cell FLIP animation lifecycles. Its ownership tokens prevent stale animation callbacks from overwriting newer movement on the same cell.
- `game/svg-icons.js` contains the 14 inline SVG icons and face-overlay helper.
- `game/dialogs.js` wraps the native dialogs in callbacks or Promises and manages their event listeners.

## State and interaction constraints

`game/interaction.js` uses one module-private state object. The important coordination fields are:

- `board`: the 2D numeric/null model;
- `busy`: blocks input during asynchronous animation/dialog windows;
- `mode`: `idle`, `selected`, or `waiting`;
- `anchor` and `candidates`: current multi-target selection state;
- `pendingRevert`: snapshot and reverse moves retained while a dragged multi-target choice is pending;
- `pitch`: measured distance between cell centers, used to convert pointer movement and animate shifts;
- `deadlockCount`: controls the first-deadlock versus later-deadlock flow.

Keep model mutation in `game/board.js` and DOM/UI behavior in `game/interaction.js`. `game/board.js` should remain usable without a browser DOM.

Dragging moves only the initially grabbed tile through consecutive empty cells. The first occupied cell or board edge blocks further movement; never push neighboring tiles. One pointer owns the drag until release or cancellation. The model shift is followed by FLIP-style transforms based on the measured `state.pitch`; do not replace this with a hard-coded cell distance. If a completed drag produces no removable target, restore the saved board and animate the reverse move. If it produces multiple targets, highlight every candidate and preserve the snapshot until the player commits one or clicks elsewhere to roll back.

Selection and elimination contain timed asynchronous windows. Any change to these flows must keep `state.busy`, CSS selection/hint classes, timers, and dialog cleanup consistent so stale input or listeners cannot leak into the next state.

## Stable implementation constraints

- Preserve native ES Modules and the no-dependency/no-build-tool architecture unless the requested change explicitly introduces tooling.
- Preserve the 14×10 board, icon counts, and zero-turn elimination rule unless game rules are intentionally being changed.
- Preserve the dynamic pitch measurement used by drag math and movement animation.
- Preserve keyboard/screen-reader semantics already provided through native buttons/dialogs, ARIA labels, the grid role, and live status text.
- Preserve the CSS and JavaScript reduced-motion paths when adding or changing animation.

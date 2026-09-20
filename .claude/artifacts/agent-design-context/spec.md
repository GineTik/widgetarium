# Spec: the agent's design context states only what the engine enforces

## TL;DR

`docs/ai/surfaces.md` is the largest page in the agent's 1297-line incoming prompt and it documents a workflow CLAUDE.md forbids, describes laws that do not fire, and requires a drawn board the agent has not got at write time. Rewrite the design half of the prompt so every claim cites the file and line that enforces it or is marked a gap — but a blocking decision comes first, because two code paths currently disagree about who lays a surface.

## Complexity

**medium** — three documents, one of them shipped into every vault, plus a blocking design decision. No new runtime behaviour in this spec; the code change it implies is specified separately once the decision lands.

## Goal

An agent reading the prompt should be able to predict what the screen will look like. Today it cannot, because the page it reads describes a different system from the one that runs.

## Background

**Current state.** Measured in `research.md`:

- The prompt is **1297 lines, 11 361 words, 78 640 characters ≈ 20 000 tokens**: `docs/ai/brief.md` plus seven handbook pages plus `docs/patterns/README.md`. `catalogue.md` stays on disk.
- `surfaces.md` is 290 lines — the single largest page.
- **Laying is deterministic**: ten runs of three real trees, byte-identical.
- **Two paths disagree.** `surfaceVerdicts` advises `group` on every content tile across three screens. `withDefaultSurfaces` writes none of them, because `wantsWriting` requires `isBox(node)` and every one of those tiles is a leaf.
- **A box gets a plate only when it has sibling boxes** (`decided()`, the `box.of.length === 1` gate). The engine holds no signal about what a set's members look like.
- `surfaces.md` step 7 tells the agent to write the advised surface into the note. CLAUDE.md says the agent sets none while building a screen. The page's own step 4 requires a **drawn** board, so its workflow cannot run at write time.

**Problem.** The page is not a description of the system. An agent that obeys it either writes surfaces by hand (forbidden) or gets nothing (the writer path) — and neither reproduces the reference design in `docs/reference/`.

**Target state.** Every normative sentence in the design half of the prompt either cites the enforcing `file:line` or sits under a heading that says it is not enforced yet.

## Requirements

### MUST

- [ ] REQ-1: `docs/ai/surfaces.md` is rewritten so each rule carries the `file:line` that enforces it. A rule with no enforcer moves to a "not enforced yet" section or is deleted.
- [ ] REQ-2: The hand-writing workflow (steps 4–8: measure the drawn board, run `surfaces`, write the advice into the note) is removed or explicitly scoped to the person's Design tab, whichever the decision in Open Questions settles.
- [ ] REQ-3: A design-system page states the rules that are enforced today and are not written anywhere: the spacing ladder by depth, the radius ladder, concentric corners, fill-not-outline with the light-theme `--wg-kit-card-edge` exception, no uppercase, no cast shadow on a plate, the 42px control floor, and **`ALLOWED_INSIDE[APART]` excluding `item`** — no plates on navigation rows, an information card permitted.
- [ ] REQ-4: The prompt stays within ±10% of 1297 lines. `surfaces.md` shrinking pays for the new page.
- [ ] REQ-5: No rule is invented. Every claim is traceable to code, to a `docs/research/` finding, or is labelled a gap.

### SHOULD

- [ ] REQ-6: `docs/ai/design.md` (86 lines) merges into the design-system page rather than sitting beside it, so there is one place a design decision is looked up.
- [ ] REQ-7: The "not enforced yet" section is written as a work list, so it doubles as the specification for the follow-up code change.

### COULD

- [ ] REQ-8: `tools/surface-probe.mjs` and `tools/surface-shapes.mjs` join `npm test` as a gate, so a law that stops firing fails a run instead of quietly going stale.

## Acceptance criteria

### Scenario 1 — every normative claim is traceable

- **Given** the rewritten `surfaces.md` and design-system page
- **When** a reader picks any sentence that tells the agent what to do
- **Then** that sentence carries a `file:line`, or stands under the "not enforced yet" heading
- **Verified by**: reading, plus REQ-8's probe if it lands

### Scenario 2 — the page no longer contradicts CLAUDE.md

- **Given** the rewritten page
- **When** it is read beside CLAUDE.md's surface section
- **Then** neither tells the agent to do what the other forbids
- **Verified by**: `grep` for "write the advised" returning nothing

### Scenario 3 — the prompt does not grow

- **Given** the rewritten pages
- **When** the incoming prompt is measured the way `research.md` measured it
- **Then** the total is within ±130 lines of 1297
- **Verified by**: `cat docs/ai/brief.md docs/ai/README.md … | wc -l`

### Scenario 4 — the probes still pass

- **Given** the documentation change
- **When** `node tools/surface-probe.mjs` runs
- **Then** the ten runs stay identical and the written/advised columns are unchanged
- **Verified by**: running it

## Test plan

Documentation only, so the tests are the probes and the line count.

- [ ] `node tools/surface-probe.mjs` — determinism holds, written and advised unchanged
- [ ] `node tools/surface-shapes.mjs` — the eight shapes give the same answers
- [ ] `npm run test:docs` — whatever it already asserts about the handbook still passes
- [ ] `npm run lint:lang` — every string English
- [ ] line count within ±130 of 1297

No DB, no seed: nothing here touches a person's data.

## Out of scope

- **Changing which path runs.** This spec makes the documentation true about today. Making the engine lay better surfaces is the follow-up, and it cannot be specified until Open Question 1 is answered.
- The `group`/`item` inversion to a depth-coloured single word.
- Examples with abstract widgets in `docs/patterns/`.
- The widget catalogue and screenshot tooling.
- Anything about `React` or porting the canvas.

## Open questions — blocking

**Q1. Which path is the truth?** They cannot both be. The answer decides what REQ-2 says.

- **(a) The writer.** `withDefaultSurfaces` at read time, agent writes nothing. Matches CLAUDE.md. Today it produces almost nothing on a real screen, so the follow-up must teach it to write onto the box around a leaf, or the tree must carry a box per band.
- **(b) The advice.** The agent runs `surfaces` and writes what it says. Matches the page. Needs a drawn board, so it cannot run before the first save, and it yields a uniform `group` on every band — no variety at all.

My reading: **(a)**, because (b) cannot run at write time and CLAUDE.md already made the call. But (a) as it stands writes nothing, so accepting (a) means accepting a bare screen until the follow-up lands.

**Q2. Does the uniform grey get accepted as the baseline?** The advice path gives every band the same grey plate. It is consistent and defensible, and the reference design's variety is — measured — not reproducible by any rule currently in the code. Accepting uniform-grey as the floor makes the documentation writable today.

**Q3. Does `docs/ai/design.md` merge or stay?** REQ-6 assumes merge; if the person wants the design direction kept separate from the enforced rules, it stays and the new page only carries what is enforced.

## Notes on process

Research was done by measurement rather than by code search — two probes over the real engine, both kept in `tools/`. `/brainstorm` was skipped deliberately: the option space here is two named, already-measured alternatives, not an open field, and the user has asked for fewer detours.

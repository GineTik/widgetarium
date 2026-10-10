# Design systems in the agent flow

`SPEC` · 2026-10-10

## TL;DR

Today every app gets the same "quiet and strict" look, because the brief says the look is always the kit's. This spec replaces that with a design-system stage. The agent filters a catalogue of design systems by the product's fit, merges three sources into three new systems, draws a design book for each in parallel, and lets the person pick one. Then the app's own kit, widgets and design book are rewritten to the chosen system before any page is built. It is written to be run later, stage by stage, by one agent, after the architecture update lands.

## What exists today (verified 2026-10-10)

| Fact                                                                                          | Where                                                                                         |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Stage 1 says "the look is always the kit's and copy is rewritten"                             | `docs/ai/brief.md` Stage 1                                                                    |
| One vault-wide design system is laid once, with the style line "Quiet and strict"             | `docs/ai/design-system.md`, `layDesignSystemOnce` in `apps/obsidian/src/ai/agent-files.ts:55` |
| Rules are parsed per id and checked by `rules <app>`; an app file overrides by id             | `packages/core/src/design-rules.ts`                                                           |
| Canvas tabs are Docs, References, Components; "Brief" and "Design system" are renamed to Docs | `TABS_RENAMED` in `apps/obsidian/src/design-canvas-page.ts`                                   |
| Jobs with phase, page and `--after` run stages 2–5 a page at a time                           | `brief.md` "Then plan the build as jobs"; `apps/obsidian/src/ai/job-*.ts`                     |
| A provider takes `{model}`; there is no effort setting                                        | `apps/obsidian/src/ai/providers.ts`                                                           |
| Vault widgets draw with the plugin's kit, not a project copy (a TODO)                         | CLAUDE.md, "In Obsidian"                                                                      |
| A project made by `create` gets its own kit copy and aliases                                  | `packages/widgetarium/src/cli/create-command.ts:46`                                           |
| Reference pictures and notes on the canvas: `reference`, `note`                               | `apps/obsidian/src/ai/reference-command.ts`                                                   |
| Trait-format systems, fit profiles and merge rules                                            | `docs/design-systems/{verdant,gallery,cloud,merging}.md`                                      |

## Prior art

| Product                                     | Approach                                                                           | Taken here                                                |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Claude Design                               | A design system is built once from references or code and applied to every project | One chosen system per app, applied to everything after it |
| Google Stitch `DESIGN.md`                   | Tokens plus plain-language description in one file, portable between agents        | The system file is traits in words plus a token table     |
| Mobbin / Refero _(from memory, unverified)_ | References filtered by app category and pattern                                    | The catalogue is filtered by fit parameters, not browsed  |

## Measured: which agent draws a design book

Same task, same sources, `docs/design-systems/test-sea-swim*`:

| Run                      | Time         | Tool calls | Tokens   | Traits / variant | Result                                      |
| ------------------------ | ------------ | ---------- | -------- | ---------------- | ------------------------------------------- |
| Opus 5.5, default effort | ~21 min      | 105        | 331k     | 21–22            | strong, many fixes                          |
| Sonnet, default effort   | ~17 min      | 58         | 306k     | 21–23            | strong, many fixes                          |
| **Opus 5.5, low effort** | **~7.4 min** | **25**     | **173k** | 12               | strong ideas, less detail, two defects left |

Decision (the person's): design-book jobs run on **Opus, low effort**.

## Stages

Each stage ends green on its checks before the next one starts.

### Stage 1: the catalogue

- **Format.** One folder per system: `catalogue/design-systems/<id>/system.md` (fit profile, conditional traits, traits in the ten categories, token table), `references/*.webp` (the source pictures with author credit), optional `book.dc.html`.
- **Schema.** `DesignSystemSchema` in `packages/core/src/design-system-catalogue.ts` parses the front matter: `id`, `title`, `author`, `fit` (each parameter an **array** of values), `traits[]` (`id`, `category`, `text`, `needs?`), `tokens`. One reader, `readDesignSystems`. Nothing else parses these files.
- **Shipping.** Laid read-only into the vault like `@catalogue`, with a `.laid-by-plugin` mark (`tools/system-widget-files.mts`).
- **Command.** `widgets.mjs systems --centre function,information --tone calm …` returns systems ranked by matched parameters, each with its score and its conditional traits already filtered.
- **Seed.** Verdant, Gallery, Cloud, converted from `docs/design-systems/`. The old "Quiet and strict" style becomes one more catalogue system, so the default is no longer special.
- **Product patterns.** A second catalogue, `catalogue/patterns/<id>.md`, in the format of `docs/design-systems/patterns/README.md`: the structure of a product (what stands in the centre, which regions serve it, how they behave), independent of the look. Same fit parameters plus `object kind` and `activity`, so one filter serves both. Seed: `stage-inspector`, plus the fifteen bases of `packages/core/src/layouts.ts` rewritten as patterns. Command: `widgets.mjs patterns --…`.
- **Checks.** The schema refuses a system with a missing category or a trait without an id; the ranking test pins the order for three briefs (kanban, delivery, sea-swim) and is falsified by swapping one fit value.

### Stage 2: the agent's grants and context

- **Brief.** Delete "the look is always the kit's". Add: the app's look comes from its chosen design system, and the agent may edit the app's kit copy, layout widgets and any widget of the app.
- **Design system file.** `docs/ai/design-system.md` keeps only the layout and composition laws (SH, P, S, R, C). The style line and every look rule move into the catalogue system they belong to. `layDesignSystemOnce` stays, laying the laws.
- **Handbook.** A new `docs/ai/design-systems.md`, read on demand: fit, traits, merging rules (from `merging.md`), the design-book format. Brief, board, surfaces and examples stay under 6,000 words together.
- **Effort.** Providers gain an `{effort}` placeholder and an `effortArgs` per provider. Claude Code's flag must be checked against its current CLI docs first. For providers without one it is empty.
- **Checks.** `test:docs-code` passes on the new page; a brief test asserts the removed sentence is gone.

### Stage 3: the design-system stage in the flow

It runs after the spec and before any page design. Stages become: 1 spec, **2 design system**, 3 domain, 4 design, 5 data, 6 pages.

1. **Fit.** The orchestrator fills the app's fit profile from the spec. Each parameter may hold several values when the request is vague.
2. **Shortlist.** `systems --…` and `patterns --…` each return their top 12 by matched parameters; conditional traits the app fails are already dropped. Reading only cards (idea, fit), the orchestrator keeps 3–5 of each, one line per drop.
3. **Review.** It reads the kept entries in full and writes `.widgetarium/apps/<app>/design-systems/review.md`: for each, what to take, what to reject for this product, and why.
4. **Design.** Using them as references, not parts, it writes three proposals by `merging.md`. Each has a pattern (the structure) and a system (the look): a new idea, deliberate compatible traits, no reference above 40%, colour as a logic with the hue chosen for the product, and an imagery role and type. Output: `.widgetarium/apps/<app>/design-systems/proposed/<n>.md`.
5. **Books.** Three `design-system` jobs run **in parallel**, Opus at low effort, each drawing one design book (format below) on the canvas, with new CC0 photos found for the product.
6. **Choice.** The orchestrator asks one question: keep 1, 2 or 3, or say what to change. Edits loop on the same jobs until one is chosen.
7. **Writer.** `withDesignSystemChosen(app, n)` is the one writer. It moves `<n>` to `.widgetarium/apps/<app>/design-system.md` and the book to the Design system tab, and keeps the others under `proposed/` as history the person can return to.
8. **Tab.** A canvas tab **Design system** (remove `"Design system": DOCS_PAGE` from `TABS_RENAMED`) shows the chosen book, the system file and the proposals.

- **Checks.** A job test runs the stage on a fixture app and asserts three proposals, three books, one choice written and two kept. Falsify by letting the writer drop the history.

### Stage 4: the app's kit becomes the system's

- **Kit copy.** Each app gets its own kit copy and aliases, the way `create` does for projects. This also closes the "draw with the plugin's kit" TODO for vault apps. Vault widgets of the app import the app's copy.
- **Tokens first.** One job writes the system's token table into the copy's `--wg-kit-*` values and `theme.css`. All colours stay tokens (`audit-colors` clean).
- **Components by dependency tier.** Build the import graph of the kit's components. Tier 0 imports no kit component (button, badge, icon…); tier n imports only lower tiers. A tier's components run as parallel jobs, one component each. The next tier starts when the whole tier is green.
  - Behaviour is kept; only the look changes, unless the system's traits change a control's function. For example, a lens scrubber replacing a select is a new component beside the old one, never a silent swap.
- **Coverage.** The job list is generated from the graph, so no component can be skipped. Done = every component's job ended green.
- **Effort.** Start with Opus low effort. Measure on one tier against default effort (time, defects found by `test:paint`) before running every tier.
- **Checks.** `npm run test:types`, `test:paint` per tier, `audit-colors`. Falsify by restoring one hard-coded colour.

### Stage 5: the design book becomes real

- The signature components of the chosen system become real widgets `@<app>/<name>`.
- The book is rebuilt as an ordinary app page from kit components, tokens and those widgets. No hard-coded colour, size or fake button is left.
- Because it is built from the kit, a later kit change updates the book by itself.
- **Checks.** `check` on every new widget; a test fails if the book page holds a literal colour.

### Stage 6: pages, with a restyle step

Stages 3–5 of today's brief, plus one step: **a widget taken from the catalogue is restyled to the app's system** by its own job before it is placed. Function, ports and states are kept. Its kit imports point to the app's copy, and logic it carries that the app needs elsewhere may be split into its own widget.

## The design book format

Every book has the same sections in the same order. Each one is clearly separated:

1. A **huge heading in the book's own style** (as large as a hero line).
2. **One paragraph of meaning**: why it is so. For example: "Colours come from one main hue, sea blue, chosen from the idea of waves; every photo is graded to the same hue."
3. **The visual**, drawn by the system's own rules.

| #   | Section               | Shows                                                          |
| --- | --------------------- | -------------------------------------------------------------- |
| 0   | Hero                  | the idea itself, as the system would open an app               |
| 1   | Colour                | the logic: hue, steps, jobs, sync with images                  |
| 2   | Type                  | scale and voice                                                |
| 3   | Imagery               | role, type, the user-photo rule with a loud photo kept in line |
| 4   | Layout                | how a screen is cut, where the accent lives                    |
| 5   | Surfaces              | which plates exist and when                                    |
| 6   | Controls              | the kit's families, by ground                                  |
| 7   | Functional blocks     | the signature instruments                                      |
| 8   | Widgets               | real widgets of the product                                    |
| 9   | Space and transitions | density, edges, fades                                          |
| 10  | In an app             | two or three full desktop screens                              |
| 11  | Rules                 | do / don't                                                     |

A book still obeys its own system: a no-plates system has no plates in its book. The hero is kept as the strongest part; sections are what make it read as a book rather than a landing page.

## Open questions

1. Claude Code's effort flag, and how Codex and other providers express it.
2. Does a widget ship its own kit, or always import the app's? The proposal: always the app's, with the restyle job rewriting the imports.
3. Reference pictures in the catalogue: credit and contact per author, and permission before anything ships publicly.
4. Is the kit copy per app or per vault when two apps share a vault?

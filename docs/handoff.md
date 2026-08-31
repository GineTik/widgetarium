# Handoff — what is unfinished

`HANDOFF` · 2026-08-31

Repo: `/Users/denissevcuk/Projects/Obsidian Plugins/widgetarium`. Read `CLAUDE.md` first — it carries
the laws that cost the most to learn here. `docs/record-identity.md` holds a decision that task 2
implements.

**State right now:** `npm run build` plus all 30 gates plus `lint:lang` are green. Nothing is broken.
What is missing is proof and three unbuilt pieces.

## Read this before starting anything

**Nine agents ended early in this session** — eight to a 600-second stall watchdog, one to an API
session limit. They died at random points: some on their first orientation step, some after finishing
the work. It is not task size and not the brief. Work already written to disk survived every time;
what did not survive was whatever came last, which was almost always the falsification pass.

Consequences for how to work here:

- **Do not read `src/surface.js`, `src/model.js`, `src/kit.js`, `styles.css`, `src/settings-window.js`
  or `widgets/@task/kanban-board/widget.jsx` whole.** `grep -n` to locate, then narrow ranged reads.
- Work in small increments and write to disk often.
- Every edit targeted and uniqueness-asserted; refuse to mutate on an ambiguous marker. A marker that
  occurred twice once caused a restore to land in the wrong function, leaving the suite green while
  the popover would have been permanently invisible under reduced motion.
- **Never restore a shared file from a whole-file snapshot** — one agent did and reverted a
  neighbour's work inside a 90-second window.
- **`/Users/denissevcuk/Documents/Obsidian/Personal/Personal/` is the owner's vault and is off
  limits.** No reads, no writes, no migration scripts. Prove everything on fixtures.
- Do not commit. Do not touch git branches.

**The acceptance rule:** a check that cannot be broken on purpose proves nothing. Mutate the source to
violate the law the check claims, confirm it goes red, restore with a targeted edit, verify by md5,
and report the table. If a check turns out unfalsifiable, delete it — along with whatever depends on
it — rather than ship it. **Six rounds this session shipped with every gate green and were rejected by
the owner on sight**, because the checks asserted declared values instead of rendered behaviour.

`npm run test:paint` drives real headless Chrome and reads resolved computed values; the jsdom suites
resolve no cascade and lay nothing out, so a CSS claim proved only there is not proved.
`test:dialog`, `test:view` and `test:drag` are timing-flaky — re-run alone before blaming a change.
`test:render` no longer exists (see task 5).

---

## Task 1 — falsify the boards work, and finish one cleanup

**This is the highest priority.** The implementation is landed and green; it has never been proven.

A board is now a record: a `boards` source at `Orbitask/Boards`, declared in
`widgets/@task/kanban-board/manifest.json` (~line 90) and in
`widgets/@task/archived-columns/manifest.json`. Widget-facing helpers `readBoardRecord`,
`boardWriter`, `boardsToCreate`, `archivedColumnsFor` are exported from `widgetarium` and imported at
`widgets/@task/kanban-board/widget.jsx:1`. The kanban reads its board at `:488`, writes columns at
`:497`, computes what is unfiled at `:520`, creates on an explicit press at `:528`. A **"Move boards
into files"** action with a `ConfirmDialog` sits at `:8-13` and `:693`. The older name-keyed map still
reads: `normalizeArchivedColumns` / `archivedColumnsOn` (`src/model.js:149-158`), consumed at
`src/surface.js:251`.

**Prove each of these on a rendered board, counting what is drawn — never from a setter:**

1. adding a column on board A does **not** add it to board B — this is the defect the whole change
   exists to fix, so a mutation reverting to the shared setting must go red
2. archiving a column on A leaves B untouched; each board lists only its own
3. column order is per board and survives a switch
4. with **no** board files present, the strip and the kanban still work from the old comma-joined
   string
5. pressing "Move boards into files" creates one file per board
6. it **never** overwrites a board already on file
7. dismissing the confirmation creates nothing
8. after migration, columns, order and archived columns come from the record
9. the archived-columns map from the previous round still reads, and its contents land on the right
   board record

If a law has no check, write one, then falsify it.

**Cleanup in the same file:** a shared `ConfirmDialog` exists (`src/dialog.js`, exported through
`src/api.js`) and the kanban already uses it for archiving. **Two older inline confirms remain** at
`widgets/@task/kanban-board/widget.jsx` ~340 and ~388, using a `.ok-confirm` accent Button (three
`ok-confirm` occurrences: one CSS rule, two buttons). Move them onto the shared dialog. If either
differs in a way the shared one cannot express, say so and leave it.

Gates: `build`, `test:board`, `test:interact`, `test:view`, `test:model`, `test:engine`,
`test:settings`, `test:window`, `test:search`, `test:kit`, `test:ideal`, `test:paint`, `test:drag`,
`lint:lang`.

---

## Task 2 — record identity

Designed and agreed with the owner; **not built**. The full decision is `docs/record-identity.md` —
read it, it is short, and it carries the reasoning and the failure modes.

In brief: a UUID in frontmatter under a namespaced key (`widgetarium` / `wgId`), exposed by the
gateway as `record.id`. **Assigned only on an explicit action** — creating a record, or a migration
the person presses — **never on render**, because a gateway that writes while being drawn litters the
vault on the first note that opens. Resolution is id first, name or path second, so everything keeps
working for records that have no id yet.

**Exactly two references move to ids.** Not a sweep over every widget:

- **task → board.** `props.board` holds a name today, which is why renaming a board currently
  rewrites **every task file** — the strip walks every row whose prop equals the old name. With an id
  that becomes one write to one file. This is the whole win.
- **the strip's selection → board.** `activeTab` holds a name; it holds an id when the strip is
  record-backed.

Everything else stays. A `holds` row already carries a widget id as its identity; a view's name is a
label; archived columns are a fact of the board record.

**Duplicate ids** come from **copies**, not from generation — "Make a copy" is a menu item, templates
get copied, imports arrive pre-duplicated, and Obsidian offers no hook on the copy. The rule is
**deterministic, never random**, because the vault syncs and a random choice makes two devices
disagree: the id stays with the record whose **path sorts first**, the other is re-minted. Detection
happens on read and is reported; the re-mint is a write, so it waits for the next explicit write to
that record or a "repair duplicates" action. Silently picking one of two records claiming one id is
forbidden.

---

## Task 3 — embed the tab strip into the view group

`@core/editable-tabs` exists (`widgets/@core/editable-tabs/`, shared component in
`src/editable-tabs.js`), carries `"was": "@task/board-tabs"` so old notes resolve through the
`renamed` map at `src/registry.js:154`, publishes its selection under a configurable `selectionKey`
setting (default `"board"`), and has Rename / Add / Archive / Archived list with Delete behind a
confirmation.

**What to build:** `@core/view-group` embeds that same strip as its own tab row, one tab per view,
synchronised with its `holds` rows.

- renaming a tab renames the view
- adding a tab creates an **empty** view showing an "Add widget" placeholder; pressing it opens the
  widget catalogue, and the chosen widget fills the tab
- archiving a tab **hides** it while its page, its widget and all that widget's settings remain;
  Restore brings it back untouched
- the group's **Design** tab gains a switch to **hide** the strip, so the group can still be driven
  from outside by a separate switcher — hide, not disable

**Why this exists:** without it, a person who adds a View group has no way to switch views until they
work out that a separate switcher widget is needed.

**The shape to follow — this is the agreed design and it is the point of the task.** The strip does
not own its list. One law, three storages: the verbs (add, rename, archive, reorder, delete) are
written **once** over rows, and each storage supplies only `read()` / `write(rows)`. Boards read a
folder; the group's views read its `holds` rows; a plain strip reads its own setting. Two code paths
for one operation is the disease that produced `views` meaning three different things, slot versus
mount, and archived columns living in two places.

**Prior art that settles two questions, so do not re-litigate them:** the entry affordance must be
permanently visible, never hover-only — Gutenberg shipped a hover-only parent selector, called it not
ideal for usability, made it always visible nine months later, and still had to add a sidebar
back-button five years after that. And a breadcrumb alone is enough at this depth; do not build a
tree panel.

---

## Task 4 — the substitution still does not work in the owner's vault

**This is the oldest open bug and the research is done.** Read
`docs/research/post-processors-and-live-preview.md` — it has primary sources, quotes and links.

The decisive finding: `registerMarkdownPostProcessor` is **reading mode only**, confirmed by an
Obsidian team member on the forum. **A plain paragraph in Live Preview is never handed to a post
processor**; Live Preview is CodeMirror 6 and needs an editor extension with a `Decoration.replace`
widget. Every mature plugin that renders widgets inside note text ships **two pipelines** — Meta Bind,
Dataview and Obsidian Tasks all pair a post processor with a CM6 view plugin.

Reading view adds two more traps: rendered sections are cached, so a processor registered after a note
was drawn never applies to it (already fixed — `main.js` now calls `rerenderNotes()` after the rules
load), and reading view is virtualized, so off-screen sections are unloaded, which the Obsidian team
calls correct and impossible to disable.

**Two things to check before building anything:**

1. **Instrumentation is already in place and has never been read.** The owner turns it on with
   `app.plugins.plugins.widgetarium.logging = true` and filters the console on `widgetarium:sub`. No
   `process` line at all means the processor never ran; `rules: 0` means the rules had not landed;
   `live: 0` means the rule is draft, off or broken; a match with no surviving host means it was
   inserted and discarded. **Ask him for that output before writing code.**
2. **`substituteBlock` calls `replaceWith` on the element the processor was handed**, when a whole
   block matches. The official example replaces a `<code>` **inside** that element, and
   `MarkdownRenderChild`'s own docs say its container should be **a child of** the preview sections.
   No source, official or community, endorses replacing the section element itself. This is an
   unproven but plausible cause and is cheap to test.

Also note: Dataview uses `findAllSelf("p,h1,…")` rather than `querySelectorAll`, **because `el` is
sometimes the paragraph itself** rather than a wrapper around it. Our code uses
`querySelectorAll("p, li")`, which returns nothing in that case.

**One trap worth knowing:** `src/substitution-dialog.js:121` builds its preview with the rule forced
to `draft: false, enabled: true`. The dialog therefore draws a working substitution for a rule that is
a draft or switched off — **the preview is not evidence that a rule is active.**

---

## Task 5 — decisions waiting on the owner

Do not guess these; ask.

- **The button edge on hover.** A raised control carries a 1px hairline at rest; on hover its fill
  drops to `--wg-kit-fill-hover`, which is grey, and the hairline stays. The owner's rule is that grey
  buttons have no edge. A hairline that blinks under the pointer is arguably a defect. Should the edge
  follow the fill?
- **`test:render` was deleted from `package.json`** by an agent nobody asked. It had been red for a
  long time (its demo notes reference deleted packs). Restore and fix, or leave it removed?

---

## Task 6 — small debts, none blocking

- **Five dead CSS rules** scoped under `.wg-set-list` in `styles.css` (~1946, 1952, 1960, 1964, 1968).
  **Nothing has emitted `.wg-set-list` since the kit took over the row** — verified by grep across
  `src/`, `widgets/` and `tools/`. Four of them are inert behaviour (unset rows are not faint, the add
  row is not muted, values are the wrong grey). The real repair is routing `src/settings-window.js`
  through `SidebarRow`, which would remove the whole block.
- **`GLYPHS.text`** in `src/kit.js` has no consumer — it existed for a two-state toggle icon that was
  replaced by the ellipsis menu.
- **Debug scaffolding left in `tools/paint-test.mjs`**: a `window.__err` handler (~line 70) and a
  `PROBE` early-return guard (~line 265). Inert, but diagnostic code.
- **`tools/settings-test.mjs`'s `check` was `String(got) === String(want)`**, which made every
  object-vs-object comparison vacuous. The object case is repaired. **The type-blind case was never
  audited**: `check(x, 1)` still passes when `x` is the string `"1"`. Audit that file and the other
  harnesses that copied the helper.
- **`test:dialog`, `test:view`, `test:drag` are timing-flaky** — the checks read animation state
  before it starts. Reproduced with all changes reverted, so it is not from recent work. A flaky gate
  teaches people to ignore red.
- **Archived columns, narrow limit:** a note written before the board-record change, whose archived
  column holds zero tasks, shows and restores correctly but reappears in the list only once some
  column edit rewrites `columns`.
- **View group, absent affordance:** there is no way to move an **arbitrary existing tile** into a
  group from the settings window; only the "Add a view group" press absorbs, and only the tiles whose
  manifest declares a `view` name. An existing group is never topped up.

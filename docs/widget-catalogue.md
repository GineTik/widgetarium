# The catalogue is one surface with three jobs

`SPEC` · 2026-08-30

## TL;DR

One catalogue surface, opened in three modes — browse, place, fill a slot — drawing every widget
**live at a declared preview size**, scaled by the same `transform` the settings window already
uses, with sample data the manifest carries. Slot picking ranks candidates by whether the parent
hands down the fields they require, but never hides a misfit. Remote widgets arrive pinned to a
commit in a lockfile, and nothing updates itself.

---

## 1. What already exists, and what the catalogue may not rebuild

| the thing | where | what it means here |
|---|---|---|
| `WidgetRegistry.load()` | `src/registry.js` | the installed list ALREADY exists — polled every 500ms, compiled, keyed by manifest id |
| a load failure is an entry | `registry.js:loadOne` catch | a widget that will not compile is `{ manifest, error }`, not an absence |
| live widget scaled in a dialog | `src/settings-window.js` + `settings-fit.js` | `transform: scale(n)` on the widget's own box, pan, zoom, a 0.7 floor with a measured reason |
| `viewHost(host)` | `src/engine/view-host.js` | a widget sees `platform`, `can`, `ui.notify`, `ui.renderMarkdown`. Nothing else |
| `collapseBelowPx` → chip | `src/chip.js` | a widget too narrow to be itself already knows how to draw a stand-in |
| the palette | `surface.js:1137` | today's "add widget": a row of text chips over `registry.list()` |
| the slot dropdown | `settings-window.js:213` | today's slot picking: every widget in the registry, unfiltered, by title |

The catalogue replaces the last two and reuses the first four. **It builds no second inventory.**
The registry is the installed list; the remote index is a second list that merges into it by
manifest id.

---

## 2. Live render, not screenshots — and how it stays affordable

**Decision: live. Rejected: screenshots, and rejected: rendering at board size.**

Screenshots lose on four counts, and the fourth is decisive: they do not follow the Obsidian theme
(the whole kit is CSS tokens, light and dark), they go stale silently, they need a publish step and
somewhere to host binaries, and **the code is already compiled and in memory** — the settings
window proves the render-at-scale path works today. Android moved off static previews to
`android:previewLayout` for the first two reasons; Apple's widget gallery renders the real widget
with placeholder data. Nobody who can render live ships a picture.

Rendering at board size loses too. A 13-cell board widget is ~860px wide; a bento tile is ~300px,
so the scale is 0.35 — under the 0.7 floor `settings-fit.js` set for a measured reason ("12px type
at 0.7 renders at 8.4px, below which a preview answers nothing").

So the preview is not the widget at its board size. It is the widget at **a size it declares for
this purpose**:

```
manifest.preview.size   cells, default = defaultSize clamped to 6 x 4
       │
       ▼
  preview frame            fixed px box = spanToPixels(preview.size)
       │  transform: scale(k), transformOrigin: top left     k >= 0.7
       ▼
  bento tile               the frame's scaled box IS the tile's aspect
```

**This is the argument for a bento grid over a list.** Tiles are not uniform because the previews
are not uniform: a widget declaring 13×1 gets a wide short tile, a card gets a small square one.
The grid carries the widget's real proportion, which is information a list throws away.

A widget whose `preview.size` still scales below 0.7 draws its own chip (`chip.js`) instead — it
already has that design, and a chip is an honest answer, not a broken one.

### How many render at once

IntersectionObserver, mount on enter, unmount on exit with one row of hysteresis, and a hard cap of
12 mounted previews. Over the cap, a tile shows the chip until something scrolls out. Each preview
is a full preact tree with hooks and effects; the cap is what keeps an infinite feed from being an
infinite number of them.

### The preview host

A preview is mounted through a **stub host**, never the real one:

```
  real board                        catalogue preview
  ──────────                        ─────────────────
  useSource → vault folder          manifest.preview.rows, frozen
  actions.create → writes a note    can* = false, run() rejects
  context ← the board's selection   context prefilled from `consumes`
  ui.openNote → opens a pane        no-op
  pointer events → the widget       pointer-events: none on the frame
```

Two consequences worth stating out loud. **Browsing the catalogue must not be able to write the
vault** — a preview with a live `actions` object is a widget running arbitrary code next to a
`create`. And **the frame is inert**, which both removes that risk and answers "did I just click
something?".

A widget whose source has no sample gets `rows: []`, `isLoading: false` — its own empty state,
which is a truthful preview. A `consumes` key with no sample gets `undefined`, same rule.

### A widget that throws

Three failure modes, three containments, all cheap:

- **will not compile** — the registry already caught it; the tile is a failure card with the
  message, and never mounts.
- **throws while rendering** — a preact class component with `componentDidCatch` wraps every
  preview. The tile becomes a failure card; the grid is untouched.
- **throws in a handler or async** — not catchable. The inert frame means there are no handlers,
  and a preview with no interaction starts nothing that lands later. This hole is closed by the
  frame being inert, not by a boundary.

---

## 3. Slot picking by required fields — the verdict

**The idea is right and worth building. Three corrections, one of which is not small.**

### Why it is right

It is structural subtyping, the same check TypeScript does and JSON Schema's `required` encodes: a
candidate fits when every field it requires is a field the parent hands down. It is O(fields), it
is data, it needs no runtime type. And it is the only check that can say **why** something does not
fit — "needs `status`, this board hands down `title`, `due`, `priority`" — which is what makes the
filtered list trustworthy instead of mysterious. A name-based tag (Apple's `supportedFamilies`,
one string per side) is cheaper and cannot say that; every new pairing becomes a coordination act
between two authors.

### Correction 1 — the PROP name is not secondary; the SOURCE name is

The user's instinct separates two names that look alike. Read what the code does today:

```
kanban-board  ──  slots.card({ task: toCard(row) })      surface.js:640, widget.jsx:455
task-card     ──  function OrbiTaskCard({ settings, task })
```

`tasks` — the source name — is indeed irrelevant to the child: `task-card` declares no `sources` at
all. But `task` — the prop name — is load-bearing at runtime. The parent passes it by name and the
child destructures it by name. Rename either and the slot silently renders empty.

So the match is **prop name AND field shape**, and the fields live inside the named prop. Dropping
the name entirely would mean the engine guessing which of the parent's props a child's field set
was meant for, which is the type inference that cannot exist here.

### Correction 2 — it runs off emitted data, never types

`docs/typed-widgets.md` settles this: types are erased, the build writes the manifest. Two new
generated blocks, each derivable from a TS type and hand-writable until the build exists:

```jsonc
// child — what it will accept in a slot
"accepts": {
  "task": { "required": ["title"], "optional": ["tag", "priority", "status", "progress", "initials", "due", "files"] }
}

// parent — what its slot hands down
"slots": {
  "card": { "of": "widget", "default": "@task/task-card",
            "gives": { "task": ["title", "tag", "priority", "status", "progress", "initials", "due", "files"] } }
}
```

```
fits(child, slot) :=
    for each prop P in child.accepts
        P ∈ slot.gives                       ← the name
        child.accepts[P].required ⊆ slot.gives[P]    ← the shape
```

Generating `accepts` from TS is also the only thing that keeps it honest: a hand-written list drifts
from the destructuring on the next edit, and the compiler will not notice.

### Correction 3 — rank, do not filter. This is the one that matters

`gives` describes what the parent DECLARES it hands down. `toCard(row)` builds that object in JS at
runtime, from frontmatter that may or may not carry `approval`. Declaration drift is not a bug to
be fixed once, it is the normal state of two files edited on different days.

A hard filter turns drift into "my widget vanished from the list and nothing said why", which is
the worst failure a picker has. And a missing OPTIONAL field is not a failure at all — `task-card`
guards every field with `has()` and simply draws less.

So: **fits-first ordering, misfits below a divider that names what is missing.** The picker teaches
instead of refusing, and the same data drives both.

### What it costs

`accepts` and `gives` in the manifest, ~40 lines of set arithmetic, and a build that can emit them.
Until the build exists, two authored blocks that can go stale — which is exactly why they must be
advisory from day one, not after the first complaint.

---

## 4. Two levels, reconciled: the press does what the entry point means

**Decision: the fast path is the default press, and it differs per mode. The detail page is never
the primary press.**

| opened as | primary press does | dialog? |
|---|---|---|
| `place` (palette, command palette) | adds the tile at `defaultSize`, closes | no |
| `slot` (from a slot row) | fills the slot, closes | no |
| any mode, widget NOT installed | opens the install dialog | yes, once |

The conflict the user felt is real but it is not "fast vs detailed" — it is **"when does a press
cost something"**. Adding a tile is free and reversible. Fetching and running someone's code is
neither. So the dialog appears exactly where the cost is, and nowhere else.

The detail page is reached from an affordance in the tile's corner — never by the tile itself.
It carries: README (the host already renders markdown), links, version and the pinned commit,
installed/update state, and the playground.

### The playground, and an honest note about it

**Decision: the playground IS the settings window, pointed at a staged widget.** Fetch to
`.widgetarium/staging/<id>/`, compile through the same registry code into a throwaway registry the
board cannot see, and hand it to `useSettingsWindow`. Install then becomes a folder move plus a
lockfile entry.

Do not build a second playground. The settings window already has pan, zoom, the 1:1 button, the
narrow preview and the cell lattice — all of it earned by measurement.

**But the UI must not present "try before you install" as safer than installing.** Staging runs
`new Function(source)` in the plugin's realm, which is precisely what installing does. It is a
convenience, not a safety boundary, and calling it one would be a lie the user acts on.

---

## 5. Where it opens from

One surface, three modes, one component:

```
        ┌── settings window, a "Widgets" panel ──┐
Ctrl+P ─┼── command "Widgetarium: catalogue" ────┼──▶  catalogue(mode)
        └── a slot row in the settings window ───┘        browse | place | slot
                                                            │
                            mode decides: primary press, and what fit is ranked against
```

**The catalogue is a plugin-side surface, not a widget.** It needs the registry and the network,
and `viewHost` grants neither. Shipping it as `@widgetarium/catalogue` would mean widening the one
boundary in this codebase that is worth keeping narrow, to dogfood a surface only the plugin will
ever draw.

It reuses the settings window's dialog chrome so it looks like the rest, which is what "embedded
like a normal widget" actually asks for.

---

## 6. Where widgets come from

```
  .widgetarium/widgets/**            catalogue.json (shipped, curated)
  scanned by WidgetRegistry               fetched index per source
            │                                     │
            │  origin: "local"                    │  origin: "<repo>"
            └──────────────┬──────────────────────┘
                           ▼
              merged by manifest id — local always wins
                           │
        installed ─────────┴───────── available
```

- **Every local widget appears**, including one the user wrote this morning that no repository
  knows about. Its origin is `local`, it has no update, and it is never overwritten.
- An installed widget whose files no longer hash to its lockfile entry is **installed · edited**.
  An update offered against it must fork or refuse, never silently overwrite.
- The remote index is a static JSON in one curated repository (HACS's default-repository model),
  not N requests fanned across authors' repos. One fetch, cacheable, no rate-limit cliff.
- Installed-only vs everything is a toggle over one merged list, not two code paths.

---

## 7. Security — what is true, and the one thing to build

### What `viewHost` already denies, and it is more than most

A widget is handed `platform`, `can`, `ui.notify`, `ui.renderMarkdown`. Not `app`, not `plugin`,
not the vault. Data reaches it only through `data` and `actions` built from sources **the user
bound by hand** — so a widget cannot read a folder nobody pointed it at. That is a genuinely good
boundary and it should be said plainly, because the rest of this section is not.

### What it does not deny, and cannot

`registry.js` compiles with `new Function(...)` in the plugin's realm. The `createRequire`
allowlist constrains only the `require` calls sucrase emitted from `import` statements — nothing
reads the source. A hostile widget writes `window.app.vault` (Obsidian exposes it on desktop),
or `fetch`, or `window.require` on Electron, in one line, and `viewHost` never sees it.

`viewHost` is a convention an honest widget respects. It is not a sandbox.

The only real sandbox is an iframe on a null origin talking over `postMessage` — at which point the
widget loses the preact tree, the kit, the DOM and the theme. That is a rewrite of the widget
contract, not a hardening pass. **It cannot be done cheaply, and pretending otherwise is how a
catalogue ships with a security page that means nothing.**

Also true, smaller: `loadStyles` appends a widget's stylesheet to `document.head` unscoped, so a
widget can restyle Obsidian itself.

### The review-then-update attack

Curate v1. The user installs. Later the author — or a stolen account, or whoever the repo was
transferred to — publishes v2 that reads the vault and POSTs it. If the plugin follows a branch,
that costs the attacker one push. **Obsidian has this exact hole**: initial human review,
unreviewed updates thereafter.

### Recommended first step: a lockfile, pinned to a commit

`.widgetarium/widgets.lock.json` — per installed widget: source, resolved **commit SHA**, the files
taken, and a content hash of each. Install resolves a ref to a SHA once and writes it. **Nothing
ever auto-updates.** "Update available" is a comparison; pressing it shows the code diff before
applying.

A SHA and not a tag, because a tag can be moved under the same name.

Why this and not something else first:

- it makes the update attack cost the user's deliberate press, every time;
- it answers "what am I running", which permissions, signing, a registry and ratings all need
  before they mean anything;
- it needs no server, no account, no review process — none of which exist;
- it does not corner the paid ambition: a lock entry names a SOURCE generically, so a licensed
  source is a later field, not a schema break.

### Second step, later: declared permissions — for the diff, not for the gate

The manifest declares `permissions: ["network", "system", "write"]` and the host withholds what it
can (refuse to build `actions.create`, and so on). Be honest about what this buys: it stops an
honest widget surprising you, and a hostile one steps around it the same way it steps around
`viewHost`.

**Its real value is the diff.** A v2 that adds `network` to its manifest is one line a human sees
before pressing Update. That is enforcement by attention, and at this scale it is the only kind
that works.

### Rejected for now

- **Ratings and reports.** A server, a moderation duty and a Sybil problem, for a curated list of a
  handful of authors. Zero signal at this scale.
- **A per-install "at your own risk" nag.** Once, on the first install from a source outside the
  curated list, naming what a widget can do — read anything you point it at, reach the network, run
  as long as Obsidian runs. A nag on every install is a nag nobody reads.
- **Signing.** No keys, no identities, nothing to verify against.

---

## 8. Manifest additions

```jsonc
{
  "readme": "README.md",
  "repository": "https://github.com/…",
  "links": { "home": "…", "support": "…" },
  "author": { "name": "…", "url": "…" },

  "preview": {
    "size": { "w": 6, "h": 4 },
    "sources": { "tasks": { "rows": [ /* records, shape of the source's record type */ ] } },
    "context": { "board": "Marketing Team" }
  },

  "accepts": { "task": { "required": ["title"], "optional": ["status", "due"] } }
}
```

**These collide with `typed-widgets.md`, which says the manifest becomes generated and untouchable.**
A README pointer and a repo URL are not derivable from a type. Resolution: they are authored in
TypeScript — a `widget.meta.ts` the build reads — so the manifest stays fully generated and TS stays
the one source of truth.

For `preview` this is not a workaround but the better design: **sample data typed against the
source's record type is the only way the sample cannot drift from the shape the widget consumes.**
The compiler checks the fake data. Nothing else can.

---

## 9. Order of work

```
0  preview + meta in the manifest, hand-written        ← depends on nothing
1  preview host (stub data, writes denied) +
   error boundary + inert frame                        ← 0
2  bento grid, scaled live previews, virtualised       ← 1
3  entry points: palette + command, browse/place       ← 2      ▲ ships here, no network yet
4  accepts/gives, fit ranking, slot mode               ← 0, 2
5  catalogue.json, index fetch, lockfile + pinned SHA,
   install / uninstall / update-with-diff              ← 3
6  detail page: README, links, versions, playground
   on a staged widget                                  ← 5
```

**Step 3 is the first shippable one**, and it needs no network at all: a bento catalogue over local
widgets already replaces both the text-chip palette and the unfiltered slot dropdown. Everything
remote comes after, on top of a surface that is already earning its keep.

Step 4 is deliberately parallel to 5 — the fit check needs nothing from the network, and building
it against the two real widgets that already have a slot (`kanban-board` → `task-card`) is the only
way to find out whether `gives` can be written honestly.

---

## Open

- **Who runs `widgetarium build`** — already open in `typed-widgets.md`, and it decides how long
  `preview` and `accepts` stay hand-written. Long enough matters: hand-written means drift, which
  is the whole reason fit is advisory.
- **An update against a locally-edited widget** — fork, refuse, or overwrite with a diff shown.
  Overwriting somebody's own edit is the one unrecoverable action in this design.
- **`preview.size` vs `defaultSize`** — one field or two. Two is honest (a preview and a placement
  are different questions) and is one more thing to keep in step.
- **The index shape** — one curated registry repo, or a fetch per author's repo. Recommended: one
  repo, but it makes the curator a bottleneck for every version bump.
- **Whether `accepts` is per-prop or one shape per slot kind.** Per-prop matches what the code does
  today; one shape is simpler to generate. Needs the build to exist before it can be answered.

---

## What is built, 2026-08-30

Steps 0–4 stand, and step 5 is built except the fetch of the index itself.

**The index is a file, not yet a fetch.** `.widgetarium/catalogue.json` — absent by default, and an
absent index simply means All and Installed show the same list. Its shape:

```jsonc
{ "widgets": [
  { "id": "@demo/clock", "title": "Clock",
    "repository": "https://github.com/acme/widgets", "ref": "main",
    "path": "widgets/@demo/clock", "files": ["manifest.json", "widget.jsx"],
    "defaultSize": { "w": 3, "h": 2 } } ] }
```

No sample file ships, because no curated repository exists yet and an index pointing at nothing
would answer every press with a 404. Writing the file is what turns the toggle into two lists.

**Install is one press, and it is pinned.** The card never says whether a widget is here already —
that distinction was rejected — so the press picks when the widget is installed and fetches first
when it is not. `ref` is resolved to a commit SHA once, every file is taken at that SHA, and
`.widgetarium/widgets.lock.json` records the SHA plus a content hash per file. Nothing re-fetches
on its own.

**One check runs before anything reaches disk:** the `manifest.json` that came back must carry the
id the index promised. A repository serving `@evil/miner` under `@demo/clock` is refused with
nothing written. This is the only attack this design can actually see — §7 still stands on the
rest, and installing still runs somebody's code in the plugin's own realm.

**Uninstall refuses what it did not install.** A widget with no lock entry is one the person wrote,
and removing it is not the catalogue's to do.

Still open from §9: the index fetch, update-with-diff, and the detail page.

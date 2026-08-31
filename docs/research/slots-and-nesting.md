# Getting inside a container, and the three shapes a slot can take

`RESEARCH` · 2026-08-31

## TL;DR

Two capabilities are missing: walking **into** a container while editing, and an editor for a
container's **slot map**. The research says the second is nearly free and the first is not — a mount
already has storage and a write path and only lacks the UI, while a slot is a bare string with
nowhere to put an entered child's settings, so "enter the card" needs a file-format change before it
needs any pixels. It also says the three-kind plan is half novel: **nobody distinguishes single from
list** (every slot already holds an array; cardinality-1 is a constraint), and **nobody offers a map
type** — the keyed case is always either N named declarations or an ordered array with the key as a
field. Runtime-authored keys were tried and withdrawn by Puck, forbidden by Angular, and survive only
in Vue.

---

## 1. What exists today

### One settings affordance, top-level only

There is exactly one gear in the plugin, rendered per top-level board tile
(`src/surface.js:509-516`), and what it opens is decided by that tile's `widget` id and nothing else.
`useSettingsWindow` is a hook **inside `TileView`** (`src/surface.js:398-417`), so there is one window
per board tile and no way to address anything else. **There is no descent path in the code at all.**

The header already renders `.wg-set-crumbs` wrapping a single crumb (`src/settings-window.js:421-431`),
and its CSS is already a flex row (`styles.css:1810-1814`). A trail was anticipated; nothing builds one.

### Why the gear "opens the child" — resolved

No code path opens a child's settings, and reading the actual board explained why it looked like one
did: **the board has no `@core/view-group` tile at all.** `Orbitask/Board.md` holds `@task/board-tabs`,
`@task/view-tabs`, a **bare** `@task/kanban-board`, `@core/filter-panel` and `@task/task-dialog`. The
gear opens the kanban because the tile *is* the kanban.

The same fact explains the switcher: `@core/view-group` is the only widget in the pack whose manifest
declares `consumes: ["view"]`. With no group on the board, `view-tabs` publishes to nobody and the
kanban draws itself unconditionally — **there was no mechanism by which `Selected view` could ever
have worked.** Measured on that board, with no click: `context.view = "Archived columns"`, the tab bar
drawing `"Archived columns"`, and `.orbi-kanban` on screen. The same harness on a board *with* a group
draws `Archived columns`.

The id-versus-name trap is **not** implicated here, but it is real and three-way:
`@core/view-group.views` (setting) takes widget **ids**, `@core/view-group` **publishes** context
`views` as display **names**, and `@task/view-tabs.views` (setting) takes display **names**.

### A "slot" here is two mechanisms, and the distinction was deliberate

`docs/view-group.md:26-42` states it: a **slot** is a template hole — the parent resolves the data and
hands it down. A **mount** is a nested tile minus geometry.

| | slot | mount |
|---|---|---|
| declared | `slots: { card: { of, default, gives } }` | `mounts: { views: {} }` — spec empty and unread |
| resolved | `resolveSlots`, `src/surface.js:102-127` | `resolveMounts`, `src/surface.js:185-197` |
| persisted | `{ name: widgetId }`, a bare string — `src/model.js:29-36` | a full child tile, **recursive** — `src/model.js:20-26, 135-148` |
| write path | none | `configure` → `onPatch` → `patchMounted` → `patchTile` — **already works** |
| edited | `slotRows` + the full catalogue, ranked by `slotFit` — `src/settings-window.js:223-259` | `mountGroups`, a bare unranked title list — `:270-306` |
| cardinality | exactly one | a list, keyed by widget id with `#2` on repeat |

Two consequences that decide the shape of the work:

- **A slotted child has nowhere to store anything.** Its settings are its manifest defaults. Entering
  a card to edit it is not merely unwired — the file format has no place for the result.
- **Entering a mount is nearly free.** Storage, recursion and the write path all exist.

`spec.of === "widget"` is authored in the kanban manifest and **read by nobody** — a free field sitting
exactly where a slot kind would go.

### The view-group's map is already a dictionary, with the key on the wrong side

`nameOf(entry) = entry.manifest?.view ?? entry.title` (`widgets/@core/view-group/widget.jsx:50-52`) —
so `"view": "Kanban"` is a fact about the **child's file**. Three consequences follow directly:

1. a view cannot be renamed on a board;
2. two views of one widget collide — the second persists as `…#2` but both answer to "Kanban";
3. a widget with no `view` silently answers to its title.

**So:** one kind exists explicitly (solo `slots`), one as a list (`mounts`), and the dictionary exists
only as a list with a derived key. The list and the dictionary are the same code path.

### The controls that exist

`settingRows` has three behaviours: `boolean` → `Switch` (implemented, used by no shipped manifest),
`number` → a text popover with `Number()` on apply, everything else → a text popover. Across all 12
manifests: `text` ×20, `number` ×4. **There is no select, enum, colour, date or list control**, and
**no drag-reorder primitive anywhere in the kit.**

What is reusable: the folder picker's searchable single-select (`src/settings-window.js:197-212`), the
rich catalogue picker with previews and ranking (`src/catalogue-dialog.js`, `src/fit.js:26-36`), the
row primitives, and — the most important find — the **master–detail list editor already built in
`src/substitution-dialog.js:183-209`** over an ordered array of `{ id, name, widget, … }`
(`src/substitution.js:3-35`). That is the shape the whole industry converges on, already built and
already tested.

### The typed build does not exist

`docs/typed-widgets.md:57` already names slots as a manifest-injected fact, and `:133-146` is the exact
precedent — `SoloGateway<Passage>` → `manifest.inline`, hand-authored until the build exists. But
there is no build script, no `typescript` dependency, and `src/registry.js:19` does not even strip
types (sucrase runs `["jsx", "imports"]` only).

Two naming collisions to settle first:

- **`Solo` is taken** — `SoloGateway<T>`, and `here` is labelled "(solo)". Reusing it puts one adjective
  on two unrelated axes.
- **`slot` is taken in the host layer** — `host.slot(binding)` (`src/host.js:161`). `docs/typed-widgets.md`
  renames that to **gateway**, which frees the word. That rename is a precondition, not a detail.

---

## 2. Prior art

### The comparison

```
              descend            ascend            permanent level chrome       bypass
Figma      dbl-click / Enter   Shift+Enter       none (layers panel)          Cmd-click deep select
Sketch     Enter               Esc               none                         Cmd-hover-click
Framer     Enter               Esc               none                         ⌘Esc → root
Webflow    ↓ / dbl-click       ↑ / label / bc    label + breadcrumb + banner  Navigator
Gutenberg  click (deepest)     ⌘A escalation     breadcrumb + parent button   List View
Notion     —                   —                 none                         —
Retool     via tree            Esc = deselect    component tree               ⌘-click = don't fire
Puck       canvas / outline    "Select parent"   outline zone labels          Outline
Sanity     open item (modal)   Close = pop 1     in-modal breadcrumb          structure panes
Contentful open ref (slide-in) close slide       stacked slides ("peeking")   —
```

### Figma — parent-first, keyboard ladder, no breadcrumb

Click selects the parent; `Enter` or double-click descends; **`Shift+Enter`** ascends; `Cmd`-click
deep-selects. There is no breadcrumb — the only ancestor indicator is the auto-expanding Layers panel.
Depth is the norm and the canvas is the product, so Figma spends zero pixels on level chrome and pays
with modal key pairs plus an always-available tree.

`Esc` does not ascend, and a Figma community manager gave the reason: *"We use a different key command,
partially due to how different browsers handle the esc key"* — with users objecting that `Shift+Enter`
*"force designer/user to leave his/her hand from the mouse."* Sketch, unconstrained by a browser, uses
`Esc`. Deep-select is documented as *"fairly indiscriminate"*.

### Webflow — the inverse: deepest-hit, four ascent paths, permanent chrome

Click hit-tests the innermost element; a **label appears at the element's top-left corner**. Four
documented ways up — the label ("helpful if a child element is inside a parent element that is
difficult to select"), a **breadcrumb bar under the canvas**, right-click → Select Parent Element, and
the Navigator tree. Arrow keys walk the tree. `Esc` deselects, it does not ascend.

Components carry the strongest level chrome in the survey: instances outlined green, a **green banner
at the bottom of the canvas** while editing a main component in context, and a changelog entry
explicitly adding *"clearer labeling to let you know whether you're editing a component or one of its
instances."*

### Gutenberg — tried both models, reverted one, documented why

This is the most decision-relevant history found.

- **Click-through (parent-first, explicitly modelled on Figma/Sketch/Illustrator)** shipped in 5.9,
  June 2019. Its best argument was accessibility: *"It does not require fine motor skills to select a
  parent block. The hit areas are most literally as big as the block itself."* **Disabled on desktop
  three months later**: *"the 'clickthrough' experiment is not that successful especially when editing
  complex templates."* The named failure mode is **more than two levels** — Columns → Column → content.
  It survives on mobile only.
- **The breadcrumb is literally click-through's successor** — the issue was opened nine days before
  click-through was disabled, framing it as the *"child block first"* counterpart.
- **Padding as a click target — abandoned.** Nested contexts produce *"too many shades."* Fallout was
  immediate: *"Since updating to 7.1 the slight padding around the child objects is gone and selecting
  is impossible."*
- **Navigation/Select mode — shipped, then removed**, and the removal is an open accessibility
  regression. The stated reason is the key insight: Select mode's design **predated nested blocks**.
  Users *"become trapped editing inside nested content"*, with "use List View" as the workaround.
- **Hover-only affordances, measured twice.** The parent-selector button was hover-only for ~9 months —
  *"obviously not ideal for usability"* — then made always visible. Five years later a **back-button had
  to be added to the inspector sidebar**, an admission that neither the breadcrumb nor the toolbar
  button was discoverable enough.

Dated complaints across seven years: *"you have to click in the very right-hand or left-hand edge"*
(2018); selecting an intermediate parent requires hitting *"a very narrow (1px) space"*; *"It shouldn't
be this difficult to select Blocks"*, open 17 months.

### Framer, Notion, Retool, Obsidian Canvas, Elementor

**Framer** — Figma's ladder with `Esc` restored: `Esc` = Select Parent, `⌘Esc` = Select Top Parent,
`Enter` = Select All Children. No breadcrumb. A measurable discoverability failure: the Help Center's
Canvas category has 16 articles and none covers selection depth, and third-party guides publish the
rule inverted.

**Notion** — the counter-example: there is no parent step at all. `Cmd+A` escalates block text → whole
page, with nothing between. To grab a toggle *with* its contents you must hit its own ⋮⋮ handle with
the mouse; no documented keyboard path exists. It works because Notion is a text editor, not a canvas.

**Retool** — authority moves to the tree, and it inverts the usual relationship: selecting a component
in the tree *"makes it visible and, where necessary, switches a container's view to make it active."*
`⌘+Click` means "Select Without Interacting", because components are live during editing — the danger
is not picking the wrong level but firing the component's action.

**Obsidian Canvas** — the cleanest small idea in the set: a group gets **its own hit-target**, selected
by clicking its title or its border. Give the container dedicated chrome that is not part of any
child's hit area.

**Elementor** — the failure mode when a tree's labels carry no identity: an inner container is
*"created with the same name as the parent container, which makes it difficult to distinguish."*

### How slots are declared, and what their editors look like

**Puck** — `slot` is a **field type**: `{ content: { type: "slot" } }`, params only `type`/`allow`/`disallow`.
**The keyed case is just N slot fields whose names are the keys.** The slot field **renders nothing in
the sidebar** — `AutoField` opens with `if (props.field.type === "slot") return null;`. It exists only
as a canvas drop zone and as a named sub-group in the Outline tree. Ascent is an ActionBar
*"Select parent"* action, hidden at root. No breadcrumb.

**Why Puck replaced DropZone with slots** is the strongest available argument for putting the kind on
the field rather than in a side-table: old zones lived in a global table keyed `"<id>:<zone>"`, outside
the component's props; slots live inline on the parent's props, which gives *"an inline data model that
supports `defaultProps`, `resolveData` and Server Components out-of-the-box."* **A zone that is not a
prop cannot participate in the prop lifecycle.** The casualty was runtime-generated zone names.

**Plasmic** — `{ type: 'slot', allowedComponents, defaultValue, isRepeated }`; the keyed case is N named
slot props. A slot is canvas-selectable, not a sidebar widget. Descend via the tree or Spotlight mode.

**Builder.io** — keyed slots are declared as *inputs* alongside scalars (`{ name: 'column1', type: 'uiBlocks' }`),
and **the path string is the key, repeated by hand in JSX**. Navigation is the Layers tab only.

**Gutenberg** — the counter-example: *"A block can render at most a single `InnerBlocks`"*. There is no
keyed InnerBlocks; Columns are built by nesting, so the key is *position*. Refusing the keyed shape
inline pushed it out into **template parts** — a separate slug-addressed entity with its own storage and
focus mode.

**Framework vocabulary:**

| | default | named | keyed case | word for keyed |
|---|---|---|---|---|
| Web Components | `<slot>` | `<slot name>` | the DOM algorithm | named slots |
| Vue 3 | `<slot>` | `#x` | `$slots` = `Record<string, SlotFn>`; **dynamic `#[dyn]`** | named slots |
| Svelte 4 | `<slot>` | `<slot name>` | `$$slots` (presence only) | named slots |
| Svelte 5 | `children` snippet | *abolished* | props holding `Snippet` values | **none — just props** |
| Angular | `<ng-content>` | `select` (a CSS selector) | `TemplateRef` + `NgTemplateOutlet` | template outlet |
| React | `children` | none | `Record<string, ReactNode>` | **none** |

Svelte 5 **deleted** slots because *"the more advanced the use case became, the more involved and
confusing the syntax became"*, folding them into ordinary props. And **Radix's `Slot` points the other
way** — it *"merges its props onto its immediate child"*. In React, "Slot" means push-down; everywhere
else it means accept-from-above. Any vocabulary here has to disambiguate that or it reads backwards.

**Row editors for the keyed case:** Payload Blocks is the most complete and the only one with a proper
key/value split — **`slug`** = which component, **`blockName`** = an editor-editable per-instance label —
with a drawer picker, collapsible rows, drag-to-reorder and a row action menu. Strapi's Dynamic Zone
has a thumbnail picker modal but **no per-entry name** — identity is the component type. Sanity has no
map type at all: keyed = an object with developer-named fields; list items get an auto `_key` that is
*an address, not a label*, and editing opens a modal that now carries **a navigable breadcrumb where
Close pops exactly one level**. Contentful's slide-in stack was designed as a breadcrumb from day one —
they **explicitly rejected inline flattening** because *"the inlined content would make the initial form
very long"* — and their Experiences product now ships a `slots` config where *"each slot requires a
unique key and a display name"*. Framer's property controls are the closest typed-dictionary control:
the canonical composition is `Array<Object{ name: String, target: ComponentInstance }>` — **the key is a
field inside each row, not the map key**, which buys reordering and duplicate tolerance for free.

Two useful negative results: **Storybook** has no component picker at all, because *"complex values such
as JSX cannot be synchronized between the manager and the preview"* — the recommendation is a primitive
string arg plus a `render` function. And **react-jsonschema-form** warns directly about the control in
question: for user-defined key names, *"The UX for editing properties whose names are user-defined is
still experimental."* **Appsmith** shipped the predictable bug: tab names can be renamed to duplicates,
because the uniqueness invariant lived only in the add path.

---

## 3. Four findings that generalise

1. **The two hit-test models are a real fork, and Gutenberg tried both.** Parent-first
   (Figma/Sketch/Framer/Puck) versus deepest-hit (Webflow/Gutenberg/Notion). Gutenberg shipped
   parent-first copying Figma and **reverted it in three months** — killed by depth ≥ 3, which is
   exactly the depth here: group → board → card.
2. **A container with no pixels of its own cannot be clicked, and no keybinding fixes it.** This is the
   mechanism behind Gutenberg's 1px gutter and Webflow documenting the label-click. Obsidian Canvas's
   answer — give the container a title bar and border that belong to it alone — is the only structural
   fix found. `@core/view-group` draws nothing of its own, so it is exactly this case.
3. **A hover-only affordance is a non-existent affordance**, measured twice in Gutenberg: hover-only for
   nine months, then always-visible, then a sidebar back-button five years later because it still was
   not discoverable.
4. **Nobody distinguishes single from list, and nobody offers a map type.** Every system's "one slot"
   already holds an ordered array; cardinality-1 is expressed by a constraint, not a type. The keyed
   case is always N named declarations or an ordered array of `{name, ref}`. Runtime-authored keys are
   consistently withdrawn — Puck removed dynamic zone names, Angular forbids runtime `ng-content`, only
   Vue's `v-slot:[dyn]` survives.

---

## 4. The options

### Navigation

**A1 — a crumb in the header, push/pop inside the one window.** *(Sanity's in-modal breadcrumb;
Contentful's stack; Gutenberg's bottom breadcrumb.)* The window keeps its box; `.wg-set-crumbs` grows a
real trail; a row gains a chevron that pushes, a crumb pops.

Cost: a path array in the window's record, and `panelBody` reading a resolved `{manifest, tile, onPatch}`
triple instead of `state.*` — that triple is the only thing the Settings and Data tabs consume. **Mounts
are nearly free**; **slots are not**, because `tile.slots[name]` is a bare string with nowhere to store an
entered child's settings. `place` does not exist one level down, so the Design tab must be absent or mean
something else. Escape is already claimed by the window's close ladder. The row shape and kit primitives
already exist. Precedent: `docs/widget-catalogue.md:212-218` already commits to re-pointing this window.

**A2 — a tree/outline panel.** *(Universal — every one of the six builders surveyed has one, and for
Builder.io and Plasmic it is the only documented way up.)* A walker over `tile.mounted` + `tile.slots`
crossed with each child's manifest; all the data exists, and `countReaders` (`src/surface.js:814-825`) is
a working template for the descent. Costs chrome in a window already carrying three glass surfaces.
Elementor's failure warns it only helps if labels carry identity — and here two mounts of one widget are
both labelled "Kanban".

**A3 — enter from the canvas by double-clicking the child.** *(Figma/Webflow/Plasmic.)* The window already
draws the live widget. Cost is high: the canvas is claimed by pan and zoom, a shield covers it below 1:1,
and the widget's own handlers are live underneath. Prior art argues against it twice — Gutenberg reverted
exactly this at exactly this depth, and the view-group has no pixels of its own.

**A1 and A2 are complements, not alternatives.** Every mature product ships both, and Gutenberg's history
reads as the cost of shipping neither for long enough.

### The three editors

| kind | today | shape from prior art | reuse | new |
|---|---|---|---|---|
| **solo** | `slots` | a value row + a picker; **Replace already correct** | `slotRows`, catalogue in `fill` mode, `src/fit.js` | **Enter** — blocked on storage |
| **list** | `mounts` | ordered rows: label, drag handle, `✕`, "Add" → picker *(Payload, Strapi, Sanity, Framer)* | row primitives, `src/substitution-dialog.js:191-207` | reorder — no drag primitive in the kit — and replacing the bare popover with the catalogue |
| **dictionary** | does not exist | the same rows **plus a name field per row**; Payload's `slug`/`blockName` split | the substitution dialog wholesale | uniqueness on **rename**, not only on add |

**Replace and Enter must both live on every row**, which means two press-targets per row. Payload solves
it with a collapsible row plus a separate action menu; Gutenberg with "Edit" primary and "Replace"
demoted to the ellipsis — they swapped these in Feb 2024. Note the two pickers here are **already
inconsistent** (rich catalogue for slots, bare title popover for mounts); unifying them is a prerequisite,
not an extra.

### Who owns the key

- **B1 — the child owns it (today).** `manifest.view`. Zero new UI. Cannot rename; duplicates collide.
- **B2 — the board owns it: an ordered array of `{ name, widget }`.** What **every product surveyed
  converged on**, and the shape `src/substitution.js:3-35` already implements. Needs a migration from the
  comma-string, and the persistence key in `tile.mounted` stops being the widget id, so old boards need
  mapping.
- **B3 — the author owns it: N named slot declarations.** Puck, Plasmic, Builder, Vue and Web Components
  all do this. **But it contradicts the stated goal** — user-authored keys at runtime, which no surveyed
  product allows. B2 is the industry's answer to that wish: use a list, and put the key in the item's data.

### Two structural findings the type plan must absorb

1. **Two kinds, not three.** A three-class scheme would be novel — not automatically wrong, but worth
   knowing it has no prior art.
2. **`Slot` would have to cover two things this project decided were different.** `docs/view-group.md:26-42`
   says a mount has its own host, sources and settings and a slot has none. One `Slot` type spanning both
   either erases that decision or needs a second axis — fed-by-parent versus standalone — and only the
   standalone one can be entered without a format change.

**Can the manifest carry the kind?** Yes — `docs/typed-widgets.md:57` already names slots as manifest-injected,
`:133-146` is the exact precedent, and `slots.card.of` is a field nothing reads. **Is the typed build the
right producer?** In principle yes and Puck's migration argues the kind belongs on the field, but the build
does not exist: no script, no dependency, no owner, and types are not even stripped yet.

---

## 5. Open questions only the owner can answer

1. ~~Does the gear really open the child's settings?~~ **Answered:** there is no group on the board;
   the tile is the kanban. The remaining question is whether the board should be restructured — turning
   the kanban into a mount inside a new `@core/view-group` tile, across all twelve authored layouts.
2. **User-authored keys at runtime, or author-declared named slots?** No surveyed product allows the
   former and two actively removed it. If it is the former, B2 is the only shape with prior art.
3. Does `Slot` absorb `mount`, or do both survive? If they merge, which one wins the semantics?
4. Do slots become enterable — which means a file-format change to `tile.slots` and a migration? Without
   it, "enter the card" is unreachable at any cost.
5. What does the Design tab mean one level down? A mounted child has no `place`.
6. Breadcrumb, tree, or both?
7. Does the slot kind wait for `widgetarium build`, or is it hand-authored first, the way `inline` was?
8. Are duplicate view names an error, a warning, or auto-disambiguated?
9. Is reordering in scope? There is no drag primitive in the kit, and every row-list in the survey has one.

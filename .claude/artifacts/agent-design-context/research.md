# Research: what the engine actually decides about surfaces

Measured, not read. Two probes in `tools/`, both run in under a second with no model involved.

## The three trees

`tools/surface-probe.mjs` builds the Home, Sessions and Music trees exactly as published in the design canvas — a root row, a navigation column, a kept main column, tiles as leaves — and runs the real engine over them.

## Finding 1 — the laying is deterministic

Ten runs of the same three trees produce byte-identical output. Nothing in `withDefaultSurfaces` depends on order, time or chance. **The determinism claim holds.**

## Finding 2 — there are two paths and they disagree

| tile   | `withDefaultSurfaces` writes | `surfaceVerdicts` advises |
| ------ | ---------------------------- | ------------------------- |
| nav    | `apart`                      | none                      |
| pro    | none                         | `group`                   |
| fly    | none                         | `group`                   |
| heat   | none                         | `group`                   |
| stats  | none                         | `group`                   |
| run    | none                         | `group`                   |
| bugs   | none                         | `group`                   |
| albums | none                         | `group`                   |
| groups | none                         | `group`                   |
| tracks | none                         | `group`                   |

**The advice is uniformly `group` on every content tile across all three screens.** The writer writes none of them.

The cause is in `wantsWriting` (`src/surface-default.js`):

```js
return isBox(node) && node.surface === undefined;
```

A surface is only ever written onto a **box**. Every tile above is a **leaf**, so the advice never lands.

## Finding 3 — a box gets a plate only when it has sibling boxes

`tools/surface-shapes.mjs` runs eight tree shapes:

```
a bare leaf, straight in the region              {}
a leaf wrapped in a box of its own               {}
a heading beside the leaf, in one box            {}
two collections in one box                       {}
two indicators in one box                        {}
three bands, each its own box, one widget each   {"0/0":"group","0/1":"group","0/2":"group"}
three bands, each holding a heading and a widget {"0/0":"group","0/1":"group","0/2":"group"}
a band of two widgets beside a band of one       {"0/0":"group","0/1":"group"}
```

The gate is `decided()` in `src/surface-laws.js`:

```js
if (box.of.length === 1) return nothing("2", "it stands alone in its box, and the box already sets it apart");
```

A lone box in its parent is refused. **The determinant is the number of siblings, not the content.** The engine has no signal at all about what a set's members look like.

## Finding 4 — the handbook documents the workflow CLAUDE.md forbids

`docs/ai/surfaces.md`, step 7 of "The phase":

> Write the advised `surface` (and `side`) into the note, one save at a time, lint, run again.

`CLAUDE.md`:

> **A surface is laid by the algorithm as the board is read, never written while a screen is built.** … The agent knows what a surface is and may set one when the person asks for that node by name; **it sets none while building a screen.**

These contradict directly. The page also requires a **drawn** board — step 4, "the plugin measures the drawn board… A board never drawn cannot be judged" — so its workflow cannot run at write time at all.

## Finding 5 — what the page claims versus what fires

| `docs/ai/surfaces.md` says                            | measured                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `collection` wears "`group` around the whole"         | never, when the collection is a leaf                                                                |
| `indicator` wears `group`                             | never, when the indicator is a leaf                                                                 |
| corners "computed, never written", 14px then 8px less | not checked here                                                                                    |
| `apart` on a sidebar facing the kept column           | holds — `navigationVerdict`                                                                         |
| nesting table                                         | matches `ALLOWED_INSIDE` in `src/surface-roles.js:29`                                               |
| P1, P2, P3 gate a plate inside a plate                | holds, but P1 only fires when `where.underSurface !== NO_SURFACE`, so it never runs at region level |

## Finding 6 — one rule the page does not state, and it is already enforced

`ALLOWED_INSIDE[APART] = [GROUP, OBJECT, APART]` — `item` is absent, so **a row inside a sidebar cannot be plated at all**, while a `group` (an information card) is permitted. This is exactly the rule a design system would want to state, and it needs no new code.

## What this leaves

The design in the canvas is reproducible by neither path. The advice path gives a uniform grey plate on every band; the writer path gives nothing. Before any documentation can be true, one of them has to become the one that runs.

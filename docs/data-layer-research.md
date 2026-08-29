# Where a widget's data comes from

## TL;DR

The hierarchy in OrbiTask — workspace, project, board, list — is not a hierarchy. It is a
flat collection of tasks plus layered filters, which is what Notion, Airtable and Obsidian's
own Bases all do. What Widgetarium is missing is not a data model but three smaller things:
a declared data contract per widget, an adapter that satisfies it, and a shared board-level
context the widgets can filter against. Slots fall out of the same design.

## What already exists, and should not be reinvented

**Obsidian shipped this.** Bases, a core plugin since 1.9, gives database views over notes:
table, cards, list, map. The data stays in markdown frontmatter; the view lives in a `.base`
file or an embedded code block. Filters come in two layers — one for all views, then one per
view, applied in that order.

That two-layer filter is exactly the workspace → project → board nesting, and it settles the
question this research started from: **nesting is filters, not folders.**

**Headless is the portability answer.** TanStack supplies behaviour and renders nothing;
shadcn distributes source you own, with no runtime dependency, through a registry the CLI
reads. Between them they describe the shape a portable widget needs: the view knows nothing
about where data lives, and the thing that fetches is swapped per host.

## The three layers

```
  VIEW          the widget. Pure, portable, knows nothing about Obsidian.
   ↑            Receives typed data and settings as props.
  CONTRACT      what the widget declares it needs — the missing piece today.
   ↑            A schema, colocated with the component, not a decorator.
  ADAPTER       the host. Turns a source into that shape: a vault folder,
                a REST endpoint, memory. One per platform.
```

A widget written this way runs unchanged on the web: the same view, a different adapter.
That is the whole reason to split them, and it is worth the extra file.

## Why a decorator on props cannot work

Reading a component's prop types at runtime is not possible in JavaScript — the types are
gone by then. The options are a build step that emits them, or declaring them. Declaring is
cheaper and reviewable in a diff:

```js
export const schema = {
	data: { kind: "collection", of: { title: "text", status: "select", due: "date" } },
	settings: { lists: { kind: "list", of: "text", default: ["To do", "Doing", "Done"] } },
};
export default createWidget(KanbanBoard);
```

Colocated with the component, so it travels with it, and shaped like Zod so the border can
be validated rather than trusted.

## The hierarchy is filters — with one exception

Task fields carry `project`, `board`, `status`. Selecting a board is a filter on a field.

The exception is the one that broke the reasoning: **a board with no tasks in it does not
exist as a field value.** "Add Board" cannot write a value nothing holds yet. So the
dimensions are not derived from the tasks — they are stored in their own small collection,
one note per board, and the tasks reference them. Dimensions are data, not a projection of
data. Every product that has this feature stores them.

## What Widgetarium actually lacks

Not a data model. A **shared context per board**: the selected workspace, project and board
live above the widgets, and each widget reads them as filter inputs. Today a widget's source
is fixed at author time and nothing can change it, so the breadcrumb cannot drive the kanban.

That is the smallest change that makes the OrbiTask page possible:

- a board-level context object, written by one widget and read by others;
- `source` becomes bindable to it, not only fixed;
- filters stay per widget, as they are now.

## Slots

Once a widget takes children by name, "replace this card with another one" is configuration
rather than a fork:

```js
export const schema = {
	slots: { card: { of: "widget", default: "@orbitask/task-card" } },
};
```

The board config names which widget fills each slot. Same mechanism as the registry, one
level down.

## Open, in order

1. The context object: where it lives in the note, and who owns writes to it.
2. Whether `source` binding is a setting or its own field on a tile.
3. Whether slots nest more than one level, and what stops the recursion.

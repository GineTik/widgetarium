# A record's identity is an id, not its name

`DECISION` · 2026-08-31

## TL;DR

Every record gets a **UUID in its frontmatter**, under a namespaced key, exposed by the gateway as a
plain `record.id`. Stored references point at the id; the name is only a label. This exists because
**renaming a board today rewrites every task file** — the strip walks every row whose `props.board`
equals the old name. With an id that becomes one write to one file. An id is assigned **only on an
explicit action** — creating a record, or a migration the person presses — never on render, because a
gateway that writes while being drawn litters the vault on the first note that opens. Everything must
therefore keep working for records that have **no id yet**.

## The shape

```js
const board = boardGateway.get()
const tasks = tasksGateway.list({ boardId: board.id })
```

- stored in frontmatter under a namespaced key (`widgetarium` / `wgId`), so it reads as machine data
  in Obsidian's Properties panel
- exposed by the gateway as `record.id` — the storage key never leaks into widget code
- **resolution is id first, name or path second.** That fallback is what lets an un-migrated vault
  work, and what lets a person hand-create a note without breaking a reference.

## Which references move to ids, and which do not

Only two, because an id earns its cost where a reference is **stored** and must survive a rename:

| reference | today | becomes |
|---|---|---|
| task → board | `props.board` holds the name | the board's id |
| the strip's selection → board | `activeTab` holds the name | the board's id, when the strip is record-backed |

Everything else stays as it is. A `holds` row already carries a widget id as its identity, and the
view's name is a label the board owns. Archived columns stop being separate storage entirely — they
become a fact of the board record.

**A blanket sweep over every widget is not the task.** The two references above are the whole win.

## Tabs: label and value

When the strip is backed by records, a tab **is** a record: the id is its identity, the name its
label. The row carries `{ id, name }`; the person sees only the name; renaming writes the name into
the record and the row's identity does not move.

When the strip is backed by a plain setting there are no records, so there is nothing to hold an id —
the name is the value. That is what keeps the lightweight mode lightweight.

## Duplicate ids — the real failure mode

Not generation. UUIDs do not collide. **Copies do:** "Make a copy" is a menu item in Obsidian,
templates get copied, and imports from Notion or Roam arrive pre-duplicated. Obsidian offers no hook
on the copy, so this cannot be prevented, only handled.

**The rule is deterministic, never random.** A vault syncs across devices; a random choice makes two
devices disagree and produces a second duplicate instead of repairing the first.

- the id stays with the record whose **path sorts first**; the other is re-minted
- path-sort, not creation time — ctime lies across copies and sync
- **detection happens on read and is reported.** The re-mint is a write, so it happens on the next
  explicit write to that record, or through a "repair duplicates" action a person presses.

Silently picking one of two records that claim the same id is forbidden — the same law this codebase
already applies to two widgets claiming one context key.

## Why this is safe in Obsidian

A stable `uid` in frontmatter is established practice — Advanced URI builds rename-proof links on
one, and Zettelkasten workflows have used them for years. Obsidian auto-updates its own wikilinks on
rename, but that only rescues **its** links, never a reference a plugin stored.

The costs, named rather than hidden: the key is visible in the Properties panel (hence the
namespace), and the file must be written once to gain an id (hence explicit actions only).

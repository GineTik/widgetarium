# Boards written today must still open after the next release

`TASK` · 2026-09-02 · owner: unassigned · repo: widgetarium

## TL;DR

Nothing in the plugin records which version wrote a board, and nothing stops a widget from shipping
a change that makes older boards unreadable. Before the first public release, capture the two
snapshots that stop existing the moment it ships, stamp boards with a version, and put one gate in
the build.

## Why now and not later

The migration *runner* can wait — an absent version reads as `1`, and the chain can arrive with the
first migration that needs it. What cannot wait is anything that records **the state as released**:
a lock file taken at the release tag, and a board fixture built with the released widgets. Bought a
version late, both record a state that is already gone, which is the same as not having them.

## Deliverables

### 1 · `v` on the board document

Every board written from now on carries a schema version. Reading treats a missing `v` as `1`, per
the lazy-migration law in `CLAUDE.md`. Writing always emits the current one.

### 2 · `migrate(doc)` — an ordered chain

A list of pure functions, each `n → n+1`, applied in order on read until the document reaches the
current version. No function may reach the vault, prompt, or depend on a widget being installed.
Prior art: Grafana's `schemaVersion` and its `SchemaVersionMigrationFunc` chain, which is the reason
its dashboards survive upgrades.

Ship the runner with an empty chain. The first real migration proves it.

### 3 · `widgets.lock.json` — the manifests as released

A snapshot of every shipped widget's contract, committed at the release tag. The build compares the
current manifests against it and **fails** on:

| change | why it fails |
|---|---|
| a new `required` need or verb on a shipped widget | every existing board that lacks it stops drawing |
| a need, prop, setting or widget id removed without `was` | boards reference it by that name |
| a need's type narrowed | data that resolved yesterday stops resolving |

Renames are allowed and carry `was`, which is already the law for settings, mounts and widget ids —
this extends it to needs and props.

### 4 · A frozen fixture per released version

One real board note per release, saved verbatim, asserted to render. Per `CLAUDE.md`'s falsification
rule: break a migration on purpose, watch the fixture go red, restore with a uniqueness-asserted
edit, verify by md5. A fixture that cannot be broken on purpose proves nothing and must be deleted.

## Out of scope

- Migrating vault data. Migrations touch the board document only; the vault is the person's.
- Versioning widget *packages*. This is the board format and the widget contract, not distribution.

## Done when

- A board written before this task, opened after it, renders and gains `v` on its next write.
- `widgets.lock.json` exists at the release tag and the build fails on each of the three rows above,
  proved by making each change on purpose.
- The fixture test is in `npm test` and goes red when a migration is broken.

# A source is a place, not a list

`SPEC` · 2026-09-01

## TL;DR

`catalogue.json` names **sources** — a folder or a repository — and the widgets in one are
found by reading it. A folder source lives in the vault, so installing from it is a copy and
needs no network. The old `{ widgets: [...] }` index still reads; nothing migrates.

## The shape

```json
{
  "sources": [
    { "path": "/Users/me/Projects/widgetarium/widgets" },
    { "repository": "https://github.com/owner/repo", "ref": "main", "path": "widgets" }
  ]
}
```

**The vault IS the installed set.** Anything under `.widgetarium/widgets` is installed, by
definition — so a source is never a folder inside the vault. It is a path on the machine, or a
repository. Nothing waits in the vault to be installed; that is a contradiction in terms.

Both kinds hold the same thing: `@scope/name/manifest.json`. That is the only shape either
side has to agree on.

## Why not a list of widgets

The index required an entry per widget, written by hand. A widget that existed was invisible
until somebody remembered to list it, and the list drifted from the folder on the next commit.
Reading the place removes the second copy of a fact the folder already carries.

## Three storages, one law

| source | discovery | install |
|---|---|---|
| folder on the machine | `fs` over `@scope/name`, desktop only | copy into the vault, no network |
| repository | the commit's tree, filtered to `manifest.json` | fetch each file at that commit |
| index entry (old) | none — the entry IS the declaration | fetch, as before |

`available()` is the one place that merges them, and **local always wins**: a widget somebody
wrote this morning is never replaced by a source entry sharing its id.

## The scope travels with the widget

`@habit/heatmap` imports `@habit/lib`. Installed alone it loads and immediately throws, and the
message names the widget rather than the missing file. So `lib.js` and `tokens.css` are copied
beside it — the scope is part of what a widget is, not a thing installed separately.

## What a folder source is for

The monorepo, before it is published. A widget in `widgets/` on disk is not in anybody's vault,
so it is genuinely not installed — the catalogue offers it, a press copies it in, uninstall takes
it back out. The same widget served from GitHub later installs by the same press.

It is also what lets someone clone the repository and install from their own copy without a
network, which is the cheapest possible distribution and needs nothing built.

Reading outside the vault is a **desktop power**: `Platform.isDesktopApp` gates the door, and a
build without one offers no folder source and refuses to install from one rather than writing
nothing quietly.

## The check that has to hold

A repository serving something else under a known id is the one attack this catalogue can see,
so the manifest that comes back is compared to the id that was promised **before any write**.
A folder source needs no such check: nothing crossed a network to get there.

## Open

**Refresh.** `available()` is read once at load. A widget added to a staging folder while
Obsidian is open does not appear until the plugin reloads. The registry polls its own folder
every 500ms; the catalogue does not poll a source, and it should not — a network source cannot
be polled that way. What it needs is a re-read on opening the catalogue, which is one call in
one place and is not written yet.

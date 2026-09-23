# A source is a place, not a list

`SPEC` · 2026-09-01

## TL;DR

A **source** is a folder or a repository, and the widgets in one are found by reading it. A folder
source is a path on the machine, so installing from it is a copy into the vault and needs no network.
Sources come from three homes and merge into one list; the old `{ widgets: [...] }` index still
reads, and nothing migrates.

## Three homes, one list

| home                                        | who owns it | when it changes                              |
| ------------------------------------------- | ----------- | -------------------------------------------- |
| `src/registries.js`, bundled into `main.js` | the curator | a release of the plugin                      |
| `registries` in the plugin's `data.json`    | the person  | they add one, and an update never touches it |
| `.widgetarium/catalogue.json` in the vault  | legacy      | read, never written                          |

`sourcesOf` (`src/sources.js`) is the one place they merge, **nearest the person first**: where two
sources offer one widget id, the one they added themselves wins over what shipped, and a source
named twice is read once. Identity is the path, or the repository with its ref and folder.

**The shipped list is a module, not a file beside `main.js`.** Obsidian carries `main.js`,
`manifest.json` and `styles.css` and nothing else, so a list that must arrive with a release has to
be inside the bundle — which is also why the person's own registries cannot live there, and live in
`data.json` instead.

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

## Four storages, one law

| source                     | discovery                                                 | install                                       |
| -------------------------- | --------------------------------------------------------- | --------------------------------------------- |
| folder with a registry     | `widgetarium-registry.json` at the folder names the rest  | copy into the vault, no network               |
| folder without one         | `fs` over `@scope/name`, desktop only                     | copy into the vault, no network               |
| repository with a registry | `widgetarium-registry.json` at the root names the folders | fetch the files its row names, at that commit |
| repository without one     | the commit's tree, filtered to `manifest.json`            | fetch each file at that commit                |
| index entry (old)          | none — the entry IS the declaration                       | fetch, as before                              |

**A registry is read at the place the source names** — the repository root for a repository, the
folder itself for a folder, with a row's `path` read from there. Both sides go through one
`readRegistry`, so a registry written for a newer plugin offers nothing on either. A folder with no
registry beside it is still read by walking it, which is what a monorepo being worked in wants.

**A registry says which folders; the widget's own manifest says what the card shows.** The row
carries `id`, `path` and `files` — what the install needs — and everything descriptive is read from
`path/manifest.json`, so nothing is written twice. A row whose manifest is missing still draws from
the row alone. The registry declares its own format, and one written for a newer plugin offers
nothing rather than half of itself — `docs/versioning.md`.

**Every offer names the commit it was read at**, which is the whole of update detection: the lock
records the commit a widget was installed from, and a disagreement between the two is what paints
the update state. A folder source answers `local`, which agrees with the lock it wrote and so never
claims an update.

`available()` is the one place that merges them, and **local always wins**: a widget somebody
wrote this morning is never replaced by a source entry sharing its id.

## The scope travels with the widget

`@default/heatmap` imports `@default/lib`. Installed alone it loads and immediately throws, and the
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

## An offer carries its code, not only its name

A card saying "not installed yet" defeats the reason cards draw widgets at all: a name teaches
nothing about what a widget looks like, and that is the moment somebody has to decide.

A folder source is on the machine, so its code costs one file read. The offer carries the
widget's source and its scope's lib, and `buildWidget` compiles them through the same
`runModule` the registry uses — one path, so a card cannot draw something the board would not.
A widget that will not compile becomes the card an installed broken one already gets.

**This runs code from the source before anybody chose to install it.** That is the trade: the
preview host is a stub with no actions and an inert frame (`docs/widget-catalogue.md`), so what
it can reach is a render. A repository source is not compiled — its code would have to be
fetched per card, and a network read per tile is a different decision than a file read.

## The check that has to hold

A repository serving something else under a known id is the one attack this catalogue can see,
so the manifest that comes back is compared to the id that was promised **before any write**.
A folder source needs no such check: nothing crossed a network to get there.

## Open

**No entrance writes a registry.** `data.json` holds them and the installer reads them, but nothing
in the app adds one — that is a field and a press, and it is the next step.

**Refresh.** `available()` is read once at load. A widget added to a staging folder while
Obsidian is open does not appear until the plugin reloads. The registry polls its own folder
every 500ms; the catalogue does not poll a source, and it should not — a network source cannot
be polled that way. What it needs is a re-read on opening the catalogue, which is one call in
one place and is not written yet.

## A registry names its scope

`widgetarium-registry.json` may name `scope` once and each widget by `name`; the row's id is the two
joined. The widget's own `manifest.generated.json` answers everything the card shows, so the registry
repeats nothing. A registry that moved says `deprecated: { movedTo: "<repository>" }`, and every card
it offers says where newer versions are published.

## An install says what it is doing before it does it

Before anything is written, the widget's code is run and its manifest compared with the card it was
served with; a card saying something the code does not is refused. The lock entry is then written as
`pending` right before the files, and becomes `installed` after them. A widget whose entry is still
`pending` is not run, and its tile says to install it again. Which commits a person may install from
a curated registry is the next task (`.tasks/approved-commits`): until then every commit a source
serves is installable.

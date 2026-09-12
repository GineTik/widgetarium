# Publish your widget to everyone

A widget you wrote can be offered to every person running Widgetarium, installed from your own
repository with one press. What the catalogue reads is a **registry**: a JSON file in the root of a
public repository, listing the widget folders it holds.

## 1. Put the widgets in a public repository

Three things are required, and a repository missing any of them cannot be listed:

- it is **public**, so the plugin can read it without a token;
- it carries a **LICENSE.md with the MIT licence**, so the widgets may be distributed at all;
- every widget is its own folder, the way it sits in your vault.

```
your-widgets/
	LICENSE.md
	widgetarium-registry.json
	widgets/@you/clock/widget.tsx
	widgets/@you/clock/widget.css
```

## 2. Write the registry

`widgetarium-registry.json`, in the repository root:

```jsonc
{
	"name": "Clocks and counters",
	"author": "@you",
	"widgets": [
		{ "id": "@you/clock", "title": "Clock", "path": "widgets/@you/clock", "files": ["widget.tsx", "widget.css"] }
	]
}
```

`id` is the widget's own id and its first half is your pack — the row a person filters by in the
catalogue. `path` is the folder inside the repository; `files` is what is taken from it.

The registry lists folders, never code. When somebody presses Install, the repository's ref is
resolved to a commit once, every file is taken at that commit, and both the commit and a hash per
file are written to the vault's `.widgetarium/widgets.lock.json`. Nothing re-fetches on its own, so
a change you push reaches nobody until they ask for it.

## 3. Send the repository

There is **no server yet**. The registries the catalogue reads ship inside the plugin, and a new one
is added by hand:

1. send the repository's URL to the address on this page;
2. it is read, and the widgets in it are checked;
3. the registry joins the list in the next release of the plugin — and everyone who updates gets
   your widgets in their catalogue.

The pack name comes from the ids in your registry. If that pack is already taken, you will be asked
for another one before anything is published.

## What a reader is agreeing to

Installing runs the author's code in the plugin's own realm, exactly as writing it yourself does.
That is why the list is curated by hand while there is no server: a registry is read by a person
before it reaches anybody's vault.

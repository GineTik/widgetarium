# Versioning

## TL;DR

Three numbers, three jobs, one file: `src/version.js`. The plugin's own version is semver in
`manifest.json` and nothing reads it but Obsidian. The block format `v` is stamped into every
```widgetarium block the plugin writes; a missing `v` reads as 1, and a block from a newer plugin
is refused rather than migrated down. A widget's `api` in its manifest is the contract it was
built against; the plugin holds the range it runs, and a widget outside it refuses to mount, to
install and to draw, naming itself and both numbers.

## The three

```
what                 where                        who reads it          out of range
-------------------  ---------------------------  --------------------  --------------------------
plugin version       manifest.json "version"      Obsidian              nothing, it is semver
block format         v: in the widgetarium block  normalizeBoard's       the note prints why, the
                                                  caller, before it      board is never mounted and
                                                  mounts                 never written back
widget api           api: in a widget manifest    the registry, the      the tile prints why, the
                                                  installer, the         install is refused before
                                                  catalogue offer        any file reaches the vault
```

## The numbers the plugin holds

`src/version.js` — `BLOCK_FORMAT` (what a write stamps), `WIDGET_API` (the contract widgets are
compiled against), `MIN_WIDGET_API` (the oldest still run). A widget is mountable when
`MIN_WIDGET_API <= api <= WIDGET_API`.

## Why a newer block is refused, not read

The lazy-migration law says reading accepts the old shape and writing emits the new one. It has
nothing to say about a shape from the *future*: an older plugin cannot know what it dropped, and
one save would write the loss back into the person's note. So a block above `BLOCK_FORMAT` is not
normalised, not mounted, and therefore never queued for a write.

## Why the widget api has two bounds and the block format has one

A widget is code this plugin runs, so it can be wrong in both directions: too new for the runtime,
or built against a contract the runtime has since removed. Hence a range.

A board is a file the person already owns, and the plugin wrote it. It may only be wrong in one
direction — newer than the reader. There is deliberately no `MIN_BLOCK_FORMAT`: **every format the
plugin ever wrote must stay readable forever**, which is the lazy-migration law. A change that
would make an old board unreadable is not a version bump, it is a migration, and it belongs in
`normalizeBoard` on the read path.

## When to raise which

- **`BLOCK_FORMAT`** — only when a board written by the new plugin cannot be read correctly by the
  old one. A field the old reader ignores costs nothing; a field that changes what an existing
  field means costs the format.
- **`WIDGET_API`** — when the widget contract gains something (a prop kind, a verb, a manifest
  key). Widgets built against the old number keep running.
- **`MIN_WIDGET_API`** — only when something the old contract promised is actually gone. This
  breaks third-party widgets and is the expensive one.

## Prior art

Chrome's `manifest_version` and Figma's plugin `api` are the same shape: an integer contract the
host holds a range for, refusing what falls outside. Obsidian's own `minAppVersion` and VS Code's
`engines.vscode` invert it — the extension declares a host range instead. The integer wins here
because the widget contract is a runtime shape (manifest keys, `can()`, the gateway), not a
package resolved by a range solver. Excalidraw's scene `version` and tldraw's `schemaVersion` are
where the block format comes from, tldraw with the same rule: a reader refuses a file newer than
its schema rather than writing it back.

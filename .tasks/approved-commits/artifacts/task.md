# Only reviewed commits reach a vault

`TASK` · 2026-09-17 · owner: unassigned · repo: widgetarium

## TL;DR

Today every commit a registry serves installs unreviewed: the commit is pinned automatically at install and an update is a press. A curator list of approved commit hashes, which no widget author can write, is what makes a malicious next commit invisible until someone has read it.

## Decided

- The developer's `widgetarium-registry.json` never carries a commit.
- The curator keeps the list: scope, name, approved commit hash. `SHIPPED_SOURCES` in `src/registries.js` is the empty slot for it.
- Install downloads the approved commit by hash (`raw.githubusercontent.com/<owner>/<repo>/<hash>/...`); newer commits are not offered until approved.
- A source the person added themselves stays unreviewed: commit pinned at install, updates by press, card marked unreviewed.

## Open

- Where the list lives: bundled in the plugin (approval ships with a release) or a file in the curator's repository fetched at runtime (approval without a release).
- Whether the lock also pins file content hashes beside the commit, so a forged commit would have to match twice.
- Who reviews a diff before approval: an AI review in the curator's CI, a person, or both.

## Prior art

- Obsidian: every plugin version is scanned automatically; popular and flagged ones are reviewed by hand (obsidian.md/blog/future-of-plugins).
- Raycast: every update is a pull request reviewed before it reaches the store.
- Chrome Web Store: an update asking for new permissions is disabled until the person consents.

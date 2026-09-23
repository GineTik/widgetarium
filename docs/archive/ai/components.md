# Where a component comes from

**You do not draw components. You find them.** Drawing by hand is the last resort. This is the order
you try things in.

## 1. A widget that already does the job

`node .widgetarium/bin/widgets.mjs find --about kanban` before anything else. A whole widget beats a
component: it already carries its manifest, its props and its responsive ladder.

## 2. The kit

`widgetarium/kit` is installed, themed and responsive. It holds `Button`, `IconButton`, `Card`,
`Plate`, `List`, `Row`, `Pill`, `Field`, `CodeArea`, `Segmented`, `Switch`, `Popover`, `PopoverItem`,
`PopoverSearch`, `Calendar`, `Progress`, `MarkdownEditor`, `Sidebar`, `SidebarSheet`, `SidebarRow`,
`Icon`, `Count`, and the `Dialog` family from `widgetarium`. Read `src/kit.js` for exact props.

A kit component beats an imported one: no dependency, already themed, already behaves in a narrow
tile.

## 3. A published registry

When the kit has no shape for it, use the shadcn ecosystem.

- Components: <https://ui.shadcn.com/docs/components>
- **344 community registries:** <https://ui.shadcn.com/docs/directory>
- Registry and item JSON format: <https://ui.shadcn.com/docs/registry>

Every item is fetchable as JSON carrying the source:

```bash
curl -s https://ui.shadcn.com/r/styles/new-york/button.json
```

Community registries follow the same shape; the directory names each one's namespace.

**Do not run `npx shadcn add` into the vault.** There is no `components.json`, no `tailwind.config`,
no `src/components/ui` — the CLI writes into the wrong shape. Instead:

1. Fetch the item JSON.
2. Read the source out of it.
3. Adapt: drop `@/lib/utils` and `cn`, keep structure and behaviour, map every colour class onto a
   `--wg-kit-*` token.
4. Declare any runtime dependency — the engine fetches declared dependencies into the vault's module
   space. One the engine cannot fetch is a component you rewrite without it.

## 4. Tailwind, if you want it

A `widget.css` opening with `@import "tailwindcss"` is compiled by the real Tailwind at build time.
The theme is CSS too — `@theme` over `--wg-kit-*`. Such a widget declares `"api": 2`.

**Preflight is never imported.** It restyles Obsidian's own elements, and a sheet asking for it is
refused by name.

## Refused

The `@material/web` runtime, Material's colour roles and its base components. They arrive with their
own tokens and a Shadow DOM.

## The research is already done

[patterns/](patterns/README.md) holds it — a kanban is [board](patterns/board.md), a tracker is
[matrix](patterns/matrix.md), a CRM screen is [list-detail](patterns/list-detail.md), a dashboard is
[dashboard-grid](patterns/dashboard-grid.md). Each page says what lives in each region, the width it
needs and what it costs.

**Never open those products while the person waits.** Read the pattern, take its structure, say in
one line which pattern you took. No pattern covers it — build without one and say so.

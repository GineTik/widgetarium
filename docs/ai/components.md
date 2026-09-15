# Where a component comes from

**You do not draw components. You find them.** Drawing one by hand is the last resort, taken when
nothing exists or when something close exists and you finish it. This page is the order you try
things in.

## 1. A widget that already does the job

`node .widgetarium/bin/widgets.mjs list --search kanban` before anything else. A whole widget beats
a component every time, because it already carries its manifest, its props and its responsive
ladder.

## 2. The kit

`widgetarium/kit` is the plugin's own component set and it is already installed, already themed and
already responsive. It holds `Button`, `IconButton`, `Card`, `Plate`, `List`, `Row`, `Pill`,
`Field`, `CodeArea`, `Segmented`, `Switch`, `Popover`, `PopoverItem`, `PopoverSearch`, `Calendar`,
`Progress`, `MarkdownEditor`, `Sidebar`, `SidebarSheet`, `SidebarRow`, `Icon`, `Count`, and the
`Dialog` family from `widgetarium`. Read `src/kit.js` in the plugin source for the exact props.

A kit component beats an imported one: it needs no dependency, it already answers the theme, and it
already behaves under a narrow tile.

## 3. A published registry

When the kit has no shape for what you need, go to a registry. The shadcn ecosystem is the one to
use.

- The component set: <https://ui.shadcn.com/docs/components>
- **The registry directory — 344 community registries:** <https://ui.shadcn.com/docs/directory>
- How a registry is built, and what an item's JSON holds: <https://ui.shadcn.com/docs/registry>

Every registry item is fetchable as JSON, and the JSON carries the component's source files:

```bash
curl -s https://ui.shadcn.com/r/styles/new-york/button.json
```

A community registry follows the same shape; the directory page names each one and the CLI form
`npx shadcn add @<registry>/<component>` tells you the registry's namespace.

**Do not run `npx shadcn add` into the vault.** A vault is not a Next.js project: there is no
`components.json`, no `tailwind.config`, no `src/components/ui`. The CLI would write into the wrong
shape. What you do instead:

1. Fetch the item JSON.
2. Read the source out of it.
3. Adapt it into your widget: drop the project-specific imports (`@/lib/utils`, `cn`), keep the
   structure and the behaviour, and map every colour class onto a `--wg-kit-*` token.
4. If it needs a runtime dependency, declare it — the engine fetches declared dependencies into the
   vault's module space. A component that drags in a dependency the engine cannot fetch is a
   component you rewrite without it.

## 4. Tailwind, if you want it

A widget's `widget.css` opening with `@import "tailwindcss"` is compiled by the real Tailwind at
build time, in the vault. The theme is CSS too — `@theme` over `--wg-kit-*`, in the widget's sheet
or in a scope file it imports. A widget whose styling needs this declares `"api": 2`.

**Preflight is never imported.** It restyles Obsidian's own elements, and a sheet that asks for it is
refused by name.

## What is refused

The `@material/web` runtime, Material's colour roles and its base components. They arrive with their
own tokens and a Shadow DOM, and this project's colours come from `--wg-kit-*`.

## Research before you assemble

Before you build an interface, find out what that interface actually holds. Open the products people
use and read how they solved it:

- a kanban board → Trello, Linear, GitHub Projects
- a habit tracker → Streaks, Habitica
- a CRM screen → Attio, Pipedrive
- a metrics dashboard → Grafana, Vercel Analytics

Take their structure — what is a column, what is a card, what lives in a header, what the empty state
says — and build that. Never invent a layout for a problem that other people have already settled.
Say in one line which product you took the shape from, so the person can disagree with it.

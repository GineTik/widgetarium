# The kit, as the HTML it replaces

Every piece below comes from `widgetarium/kit`. Each one is the plain HTML you would otherwise write,
already styled from the person's tokens, already following the plate laws. Reach for it whenever
you are about to write that HTML. Not every block needs a plate: a hero, a heading, a row of quick
actions stand on the page itself.

## Structure

| You would write                                                              | Write instead                                                                                                    | What it is                                            |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `<div style="background:#f6f6f6;border-radius:24px;padding:20px">`           | `<Card>…</Card>`                                                                                                 | one grey plate holding one block                      |
| a list of rows with lines between                                            | `<Rows>{rows.map((r) => <LayoutItem key={r.ref}>…</LayoutItem>)}</Rows>`                                         | one plate, a hairline between rows                    |
| `display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))` | `<Grid min={220}>{…<LayoutItem>…}</Grid>`                                                                        | a grid; every cell its own plate                      |
| a row of cards side by side                                                  | `<Layout kind="row">…</Layout>`                                                                                  | one line of plates                                    |
| a bare column with gaps                                                      | `<Layout kind="stack">…</Layout>`                                                                                | no plate, the kit's spacing                           |
| a section heading with an action                                             | `<LayoutHeader title="People">{action}</LayoutHeader>`                                                           | the heading of a `Layout`, outside its plate          |
| `<ul>` of rows with a label and a value                                      | `<List><Row pressable><RowLabel>Oslo</RowLabel><RowValue>09:41</RowValue></Row></List>`                          | a plain list, a row pressable when it opens something |
| a navigation column                                                          | `<Sidebar><SidebarGroup label="Pages"><SidebarRow icon={…} label="Offices" selected /></SidebarGroup></Sidebar>` | the app's navigation, the current page marked         |

`Layout kind` switches between `stack`, `row`, `grid` and `rows` with one word, so the design can
change without rewriting the block.

## Between the pieces: Tailwind

What the kit has no piece for — a card of your own, a row, the space between blocks — is Tailwind
classes on the element, named from the kit's theme. `widget.css` holds only
`@import "tailwindcss";` and `@import "widgetarium/theme.css";`.

| For            | Classes                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------ |
| fills          | `bg-page`, `bg-group`, `bg-group-inset`, `bg-fill`, `bg-raise`                             |
| ink            | `text-ink`, `text-muted`, `text-accent`, `text-success`, `text-warning`, `text-error`      |
| a tinted plate | `bg-accent-wash`, `bg-success-wash`, `bg-warning-wash`, `bg-error-wash`, `bg-info-wash`    |
| hues           | `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink` after `bg-`/`text-`   |
| type           | `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-h1` … `text-h6`, `font-medium`         |
| corners        | `rounded-plate`, `rounded-item`, `rounded-pill`                                            |
| spacing        | `gap-items`, `gap-parts`, `gap-cards`, `p-plate`                                           |
| lines and lift | `border-line`, `border-edge`, `shadow-raise`                                               |
| layout         | Tailwind's own: `flex`, `grid`, `grid-cols-3`, `justify-between`, `items-center`, `w-full` |

Join classes with `cn` from `widgetarium/kit`. A colour from Tailwind's own palette (`bg-violet-500`,
`text-white`) is refused by `check`, and a kit component is never restyled through its `className`.

## Controls

`Button`, `IconButton` (round), `Field`, `TextArea`, `Select`, `Checkbox`, `Switch`, `Segmented`,
`Tabs`, `Badge`. A raw `<button>`, `<input>` or `<select>` is refused by `check`. Tabs need not be
`Segmented`: a widget of tabs or chips from the catalogue is as good.

## Ready-made pieces

| Piece                                                                                                         | Use it for                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `<Hero title eyebrow text photo action corner />`                                                             | the one opening of a page: a photo with the words on a dark fade, or 3D shapes without a photo                                      |
| `<PhotoCard title subtitle meta photo badge shape="tall" onOpen />`                                           | a record led by its photo, a frosted badge, a round open button; a shape stands in without a photo; `shape` is wide, tall or square |
| `<EmptyState title text shape tones action />`                                                                | where nothing is yet: a cluster of 3D shapes, a title, one line, one action                                                         |
| `<CommandMenu>` with `CommandMenuInput`, `CommandMenuSection`, `CommandMenuItem`, inside `CommandMenuOverlay` | search over anything: sections of results, each led by a photo or a shape                                                           |
| `<Shape name seed tones />`                                                                                   | a 3D Material shape on a number, a tile, a record without a picture                                                                 |
| `<PhotoStack photos isRound />`                                                                               | overlapping faces or photos at a card's corner                                                                                      |

These are visual: they take any data you hand them. Draw them from rows with `map`.

## Widgets from the catalogue

Before writing a block, look for a widget that is already that block: `@default/hero`,
`@default/photo-cards`, `@default/empty-state`, `@default/command-menu` and every other one `find`
returns. `find` gives each widget's `picture` when it has one — open it and judge by the picture.
A widget you place keeps its look on every page and every app; a block you redraw drifts.

A widget can hold another widget: a slot (`ISlot.of`) draws one widget per row, mounts
(`IMounts.of`) draw the widgets a person placed. A card list whose card is a catalogue widget is
built that way, never by copying the card's code.

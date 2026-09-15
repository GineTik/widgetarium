# Gallery

A uniform grid of equally-sized items whose identifying content is an image.

## The shape it suits

High cardinality of **strict peers with identical structure** and a dominant visual attribute. Order
matters weakly. The user selects one, or simply browses.

The test against a [feed](feed.md): items are **homogeneous**. That is precisely the case where cards
are wrong and a grid is right.

## Take it when

- Items are told apart by how they look.
- Browsing throughput matters more than metadata.

## Leave it when

- **Items are not visually distinguishable.** A text list is denser and faster.
- **Metadata matters more than appearance.**
- **Comparison requires reading numbers.** That is a [data-table](data-table.md).

## Regions

One grid. The rules are about how it scales.

| Rule | Source |
| --- | --- |
| Columns derive from a **minimum item width**, not a fixed count | Material: `GridCells.Adaptive(minSize = 180.dp)` |
| Uniform size throughout — the grid should be invisible, so the eye reads content | Carbon standard tile layout |
| Build every box from multiples of one base size, with consistent aspect ratios | Carbon fixed-box grid |
| Image grids give "larger tap targets for touch screens" and help "where text labels alone are unfamiliar" | NN/g |

## Width

The strategic choice has a published answer, and it is the cleanest rule in the catalogue for whether
a grid reflows or rescales:

> If a user's goal is to see more items, scale column count by tiling fixed boxes. If a user wants to
> see more content within each item, scale boxes and use fixed column counts.

Narrower: one column at compact width.

## Costs

Spends area on images regardless of whether the image distinguishes anything. Uniformity means no
item can be emphasised without breaking the grid.

## Seen in

Photos apps (personal media) · Netflix and YouTube (streaming) · Unsplash and Dribbble (creative) ·
product listings (commerce) · Figma file browser (design tooling) · icon pickers (design systems).

## Composition

Main region. A two-column mini-gallery can survive in a supporting pane; a full gallery cannot.

## In a board

A gallery widget wants the `keep` region and derives its own column count from the width it is given
— so it is one of the widgets that should **not** declare `maxSize.w`. It grows correctly.

Do not simulate a gallery by placing many small tiles in a row. Tiles are laid out by the board; a
gallery lays itself out from its data, and the difference shows the moment the data changes.

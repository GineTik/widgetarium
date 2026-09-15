# The layout pattern catalogue

A pattern here is named by **the shape of information it suits**, never by a domain. There is no
"finance pattern" and no "mobile pattern". The evidence that a pattern is real is that products with
nothing in common converged on it: a code editor, a chat app and a database client arrived at the
same three regions without consulting each other.

## How to use this

**Before you build a screen**, name the pattern you are building. If you cannot name it, you are
about to stack widgets in a column, which is the failure this catalogue exists to prevent.

**Before you change a screen**, name the pattern it already is. Read that file. A change that breaks
the pattern's own rules is a regression even when each tile is fine on its own.

Read the index, then open the one or two files you need. Do not read all of them.

## Shells — the skeleton of a screen

| Pattern | Take it when | Leave it when |
| --- | --- | --- |
| [sidebar-and-content](sidebar-and-content.md) | More than five destinations, switched often | Three or four destinations — a tab strip is cheaper |
| [nested-sidebars](nested-sidebars.md) | Few kinds × many instances per kind | The outer set is large or the inner set is small |
| [list-detail](list-detail.md) | A collection of peers, each with substance of its own | The detail is a handful of fields — expand the row instead |
| [three-pane](three-pane.md) | Exactly three levels: collection → item → substance | Under 1600px, or the third level is thin |
| [supporting-pane](supporting-pane.md) | Content meaningful **only** in relation to the main content | It is a child of the main content — that is list-detail |
| [view-switcher](view-switcher.md) | One dataset worth seeing several ways | The views show different data — those are tabs |
| [toolbar-and-canvas](toolbar-and-canvas.md) | One spatial artefact being edited | The object has no spatial structure — it is a form |
| [full-bleed](full-bleed.md) | One object consumed continuously | Anything that needs its neighbours visible |
| [command-palette](command-palette.md) | A space too large to enumerate, with names people know | As a substitute for visible navigation |
| [drawer](drawer.md) | A region that cannot hold its place at this width | The user needs it *while* acting on the main content |

## Content — what goes inside

| Pattern | Take it when | Leave it when |
| --- | --- | --- |
| [dashboard-grid](dashboard-grid.md) | 4–12 peers, each answering one question, no scrolling | It scrolls, or one tile outranks the rest |
| [feed](feed.md) | Unbounded, heterogeneous, consumed in order | The user is looking for something specific |
| [data-table](data-table.md) | Many records, identical structure, compared and acted on | A narrow container — this is a published prohibition |
| [board](board.md) | Items moving through a named lifecycle, one bin each | The grouping is multi-valued, or columns are not a progression |
| [calendar](calendar.md) | Events dense enough to collide, where collision is the point | Sparse data — a near-empty grid encodes nothing |
| [matrix](matrix.md) | Entity × time, complete and regular, read as streaks | Per-cell magnitude must be read precisely |
| [metric-tile](metric-tile.md) | One number that carries a decision | The number has no baseline to be judged against |
| [detail-reveal](detail-reveal.md) | Deciding where one record opens: inline, modal, drawer, row | — |
| [wizard](wizard.md) | Ordered steps where later steps depend on earlier ones | The user does this often, or must compare across steps |
| [empty-state](empty-state.md) | Every region, every time. Not optional | — |
| [search-first](search-first.md) | An unbounded corpus, ranked | The corpus is small enough to browse |
| [gallery](gallery.md) | Homogeneous items identified by an image | Metadata matters more than appearance |
| [small-multiples](small-multiples.md) | 10–100 peers carrying the same series shape | Scales differ per member — the comparison would be a lie |

## The laws that bind them together

[composition.md](composition.md) — how patterns nest, how deep, and when a nested layout must stop
being nested and become its own screen. Read it once. It is short and it is the part everyone gets
wrong.

## Reading a pattern file

Each file carries the same sections, in this order:

- **Definition** — one sentence, no domain.
- **The shape it suits** — cardinality, whether items are peers, whether order matters, whether the
  user selects one.
- **Take it when / Leave it when** — the second is as sharp as the first. A pattern you cannot say
  no to is not a pattern.
- **Regions** — what may and may not live in each. This is the section that prevents the usual
  mistakes.
- **Width** — the minimum for the full form, and how it degrades narrower.
- **Costs** — what it takes from you. Every pattern takes something.
- **Seen in** — at least three products from unrelated domains.
- **Composition** — what nests inside it, what may not.
- **In a board** — how it maps onto a Widgetarium layout tree, or why it does not.

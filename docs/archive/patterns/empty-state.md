# Empty state

The designed content that occupies the exact space a populated component would occupy, when that
component has nothing to show.

## The shape it suits

Cardinality zero — but the **kind** of zero decides everything. Carbon separates three:

1. **No data** — first use, nothing added yet. The goal: the user understands what will be here, and
   how to add it themselves.
2. **User action** — no search results, or a completed process. The goal: the user understands how to
   adjust terms or filters.
3. **Error** — permissions, failure, configuration required. Here "a higher level of detail and
   specificity will better support the user".

Treating a filtered-to-zero result as a first-run state is a category error. Offering "create your
first item" to someone whose query just missed teaches them nothing.

## Take it when

Always. Every region, every time. This is not a fallback — it is the highest-leverage teaching
surface in a product, and the only screen guaranteed to be seen by every new user.

## Leave it when

Never. But keep it small: "more content doesn't necessarily mean it's a better solution as there is a
cognitive cost for having more content on the page. This is especially true when users first engage
with your product."

## Regions

| Part   | Rule                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image  | Optional, sized to the space. "If space is limited, use just text"                                                                                |
| Title  | A positive statement — "Start by adding data assets", not "You don't have any data assets"                                                        |
| Body   | What this is for and why it is empty                                                                                                              |
| Action | A button, a link in the copy, or a pointer to the UI element that does it — the pointer "has the benefit of teaching the user where elements are" |

**It replaces the component's chrome, it does not sit inside it.** Carbon: "an empty state for a
table would replace the table and the column headers and footer should not be present" — explicitly
so a screen reader does not read an entire empty table before reaching the message.

When several could show at once, use a **tertiary** button, not multiple primaries. And when many
widgets fail together, drop the illustrations: repeated art becomes noise.

Nielsen Norman's third rule for no-results is simply: **don't mock the user.**

## Width

Left-aligned as a block. One exception: in a small tile, centre the image above the left-aligned text
and action — done deliberately "to prevent the empty state looking too much like content, where it
could be skipped over".

Polaris caps the content at about **400px** with ~40px above the image inside a card or modal.

## Costs

Design work on a screen most users see once, if the product succeeds. Easy to write copy that teaches
nothing.

## Seen in

Shopify admin (commerce) · IBM Cloud (enterprise) · Slack channel first-run (collaboration) · Gmail
"no results" and "you're all caught up" (email) · Figma empty file browser (design tooling).

## Composition

It goes exactly where the absent content would have gone, at that container's size — page, tile,
table body, pane. It must never be a separate screen the user is navigated to.

Every pattern in this catalogue needs one, and **they are not the same one**.

## In a board

Two levels, and both are real.

A widget's own empty state is the widget's job — a habit list with no habits says so, and offers the
add.

A **board's** empty state is the plugin's: a side box with nothing in it still draws as a zone a
tile can be dropped into. That is deliberate — a sidebar that appears only once something is in it
can never receive the first thing.

A screen the agent builds is not finished until every region it created has something to say when the
vault is empty.

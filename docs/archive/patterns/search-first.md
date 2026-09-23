# Search-first

A screen whose main region is the response to a query, with the query control and its refinements as
permanent chrome rather than transient.

## The shape it suits

An unbounded corpus, **ranked rather than ordered**. Items are peers but ranked — position encodes
relevance, and that is what separates this from a [feed](feed.md). The user selects one result, and
often comes back for another.

Refinement is the second-class-citizen interaction that dominates the real session.

## Take it when

- The corpus is too large to enumerate, and users know the vocabulary.
- Intent cannot be expressed by any navigation tree.

## Leave it when

- **The corpus is small enough to browse.** A list with filters beats a query box, because users
  cannot guess vocabulary they have never seen.
- **Users do not know the vocabulary.** Faceted navigation exists because it "provides a structure to
  help users understand the content space" — a bare search box does not.
- **You cannot afford facets.** They are "significantly more expensive to create and maintain" and
  add interaction cost.
- **Zero results is unhandled.** Then the primary screen is a dead end.

## Regions

| Region        | Rule                                                                                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Query control | Persistent, in the shell                                                                                                           |
| Facet rail    | Fixed width. "Follow the standard aside widths that are defined in the grid component properties. Don't create custom aside sizes" |
| Results       | The fluid region. Text capped at the measure: 40–60 characters, 80 ceiling                                                         |

**Layout stability is a hard rule:** "use a consistent layout that doesn't change radically from query
to query. Inconsistency in SERP layout means that users have to work more to process it."

A facet rail is **not** a nav sidebar and must not be merged with one.

## Width

Results take the fluid width but stay capped at the measure — which is why every serious search
engine caps its result column rather than filling the window.

## Costs

Scanning is nonlinear and unpredictable — the "pinball pattern", where "the visual weight of elements
on the page drives people's scanning patterns". Rich features cannibalise the ranked list: the first
position now takes 28% of clicks, down from 51% in 2006. Users decide in **5.7 seconds** on average,
so anything not readable in that window is wasted.

## Seen in

Google and Bing (web search) · ecommerce faceted search (commerce) · documentation search (developer
tools) · Spotify and Netflix (media) · Gmail and Slack search (messaging) · Booking and Airbnb
(travel, where the facets _are_ the product).

## Composition

Results in the main region with a capped measure; facets in a fixed-width leading rail or a top bar.
Never put results inside a supporting pane.

**An infinite-scrolling results page is a documented contradiction** — infinite scroll is explicitly
counter-indicated for "find something specific", which is the definition of this screen.

## In a board

Widgetarium has this in one place already: the widget catalogue's search. A board note rarely needs
it.

Where it does apply: a board over a large vault folder should give its list widget a filter, and that
filter belongs above the list in the same region — not in the opposite sidebar, where the user cannot
see what it is filtering.

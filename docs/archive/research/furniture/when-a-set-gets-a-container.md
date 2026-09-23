# When a set of repeated things gets a container

Prior-art check on the rule derived from the Home screen:

> A container exists to give a set an edge its members do not have. Members that already draw their own edge — a card, a tile, an image — need none; members that are full-width strips or bare marks have no side edges at all, and the container is what draws them.

Sources: Apple (API reference and the archived Table View Programming Guide), Material 3 / M1, IBM Carbon, AWS Cloudscape, Shopify Polaris, GitLab Pajamas, Atlassian, Helios, Fluent 2.

## The verdict

**Nobody publishes this rule, in any wording.** It is unfalsified and unsupported. Every system that publishes a rule at all publishes a *different* one, and the two systems that come closest each publish one half of ours without ever saying when to pick which.

**The half that matches "Projects" — three cards, no container.** Material's archived spec: a card collection is **"coplanar, or a layout of cards on the same plane"** — a flat arrangement with no container around it, stated as a layout fact. And the nearest sentence to our rule anywhere in print: **"Cards are unnecessary in a gallery of images (homogeneous content)"** — an image already reads as a bounded object, so wrapping each one buys nothing. Material argues it one level down, at the member, and gives homogeneity rather than edges as the reason.

**The half that matches "In flight now" — one container, bounded rows inside.** Cloudscape, stating its norm: *"Don't put containers inside containers. If you need to group information inside a container, consider using the header component to create sections within the container, or **an embedded item card** to display individual entities within the grouped content."* One container, with members wearing their own plates inside it, is exactly the sanctioned shape.

**So both of the two shapes on Home are somebody's published norm.** What no one publishes is the rule for choosing between them — which is precisely the rule this project needs.

## The five published bases, none of them ours

| Basis | Who | The rule |
|---|---|---|
| **Depth** | Cloudscape, Carbon, Atlassian | No container inside a container; max three layers; never a sunken surface inside a raised one |
| **Position in the hierarchy** | Apple (archived) | Grouped and inset at the *detail* level; plain at index levels |
| **Heterogeneity and actions** | Material (M1) | Cards for varied content with actions; a scannable list for homogeneous content; no cards in an image gallery |
| **Legibility of bare content** | Polaris | Most content lives in a container; never paragraphs loose on the page background |
| **Structure present or absent** | GitLab | No structured header/body and no logical grouping → unbox |
| **Set size** | Cloudscape | Over roughly ten items a container is the wrong home; use a hub pattern |

**Apple's rule is the strongest competitor** because it was written about the exact case people cite. From the archived Table View Programming Guide: *"A grouped table works especially well for displaying the most detailed information in a data hierarchy. It allows you to separate details into conceptual groups."* That explains Settings-versus-Mail without appealing to edges at all — Mail is an index level, Settings is the detail level. Note what it rests on: **grouping within the set**, marking section boundaries between subsets, not giving the whole set an outer edge.

**And it disagrees with Material exactly where our rule lives.** On a detail screen made of already-bounded members — a detail page of image cards — Apple's hierarchy rule says group them, and Material's gallery rule says do not box them. The two published rules contradict each other, and the case they contradict each other on is the case our rule was invented for. **Our rule is a reasonable adjudication of a conflict nobody has settled in print.**

A second reading worth keeping: every published rule restates as **the container carries a meaning, and that meaning must be true.** Cloudscape — *these items are related*, and explicitly not *this is a region*. Apple — *these details form conceptual groups*. GitLab — *this content has a prescribed structure*. Under that framing ours is a **visual answer to a semantic question**, which is why it reaches cases the published rules do not, and probably why nobody wrote it down.

## Two rules worth taking verbatim

**Atlassian's cheapest-sufficient-device ladder.** *"Raised elevations can create visual noise, so don't use to group content when a border or white space would suffice."* White space, then a border, then elevation — and elevation is reserved for things that **move** ("cards that can be moved, such as Jira and Trello cards"). This is adjacent to our rule: both say do not spend an edge you do not need. Atlassian ranks *how* to draw the boundary and never asks *whether* the set needs one.

**GitLab's smell test, which needs no theory at all.** *"When any CSS overrides are needed to change the card's appearance, such as removing borders, changing backgrounds, or adjusting padding, a card may not be the right component for the use case."* If you are fighting the container's own decoration, the container is wrong.

## A container holding exactly one thing

Only Cloudscape sanctions it, and only for one shape: *"Use a container to group similar items or display a list of attributes for a single item."* One container, one subject, many attributes — which is still a set inside, of edgeless rows.

**Nobody publishes a rule permitting a container around one already-bounded child**, and GitLab forbids the nearest case. The defensible position is therefore ours, reached by elimination and asserted by no one: a single-child container is right when the child is a set of edgeless marks or rows belonging to one subject — the heatmap — and wrong when the child already draws its own plate.

## The white-on-white problem

Real, solved by everyone, named by two.

- **Atlassian names it and picks the border.** `elevation.surface` is the body-content surface, so a card on it is the same colour — hence *"To create flat cards, pair with a border."* It also names the inverse for dark mode: shadows are harder to see there, so dark differentiates by making raised surfaces lighter. **Light theme → border; dark theme → surface colour.** This is `docs/design-system.md` law 1 arrived at independently.
- **Carbon picks a tinted ground**: layers are background tokens, and tiles *"reside on the same plane as the page background layer and do not have elevation"*. Borders appear only on interactive tiles, for affordance.
- **Material publishes all three and refuses to choose**: elevated, filled and outlined provide *"the same legibility and functionality, so the type you use depends on **style alone**."* Its own ranking of separation strength is outlined > elevated > filled.
- **Helios** makes it a state rather than a theme: static cards take no shadow, shadow is reserved for interactive elevation.

Ranked by how many systems actually ship it: **tinted ground ≥ hairline border > shadow.** Shadow is the minority answer and the one most often restricted — which is why this project's kit draws no cast shadow on a plate.

## Negative findings

1. **Nobody states our rule.** The nearest sentence in print is Material's gallery line, and its stated reason is homogeneity, not edges.
2. **Nobody publishes a rule about a container around a grid of cards.** Carbon describes tile grids, Material calls card collections coplanar, Cloudscape has collection views — none says whether the collection itself gets a plate.
3. **The strip-versus-object distinction appears in no system's vocabulary.**
4. **Apple publishes no rationale for its five list styles in any current document.** The API reference is circular — `PlainListStyle` is "the list style that describes the behavior and appearance of a plain list" — and the one real explanation sits in a guide Apple archived.
5. **Nobody ties containers to scrolling or to selection.** Both were checked for specifically.
6. **Only Carbon publishes a maximum depth** — three layers, counted in background tokens. Cloudscape publishes zero nesting. This project's two-plate cap sits between them, nearer Cloudscape.
7. **The two largest enterprise systems publish opposite defaults** — Polaris *"the majority of your app's content should live in a container"* against GitLab *"unboxing the UI is the preferred approach"* — and neither acknowledges the other.

## Verification limits

Apple's current HIG pages render client-side and their body text could not be retrieved; the DocC endpoints 404 on every probed path. Everything attributed to Apple here comes from the API reference JSON or the archived programming guide. `m3.material.io` is likewise client-rendered, so M3 language was read from Google's own component repository, which reproduces the spec text. Polaris has been folded into shopify.dev and the Card page could not be opened; its "do not nest cards" line is reported by search and is **unverified**. A widely-repeated Fluent "two levels" nesting figure is **unverified** and absent from the primary page.

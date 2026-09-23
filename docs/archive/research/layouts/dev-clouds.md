# Layouts in five developer clouds

Supabase Studio, Vercel, AWS Console (Cloudscape), Cloudflare, GitHub (Primer). Three of these publish their design system, which makes this the batch with the most *declared* rules.

## A measure is a property of the content, not of the page

Three of the five encode this explicitly, and GitHub's undocumented split follows the same line.

**Supabase** declares it per page as `PageContainer` size:

| Size | For |
| --- | --- |
| **small** | "settings, forms, and focused configuration" |
| **default** | "lists, tables, and detail pages that stay readable without full viewport width" |
| **full** | "dense horizontal content: logs, code, editors, charts, or tables that need the viewport" |

**AWS Cloudscape** attaches it to five named content types — Dashboard, Form, Table/Cards, Wizard, Default — each carrying a default max width *and* a default nav state: "fixed max-width for most pages", "Full width (100%) for content-heavy patterns like tables, cards, canvas, or task boards". `ContentLayout`: "The content is centered and constrained to the specified maximum width."

**GitHub, measured** by fetching five page types' server HTML on 2026-09-19 and grepping for Primer's container class:

| Page | `container-xl` |
| --- | --- |
| repo overview | **yes** |
| issues index | no |
| issue detail | no |
| PR conversation | no |
| PR Files changed | no |
| blob / code view | no |

Primer's `xlarge` is **1280px**, and the stated reason is prose: pages are capped so "the content region doesn't render paragraphs with too many words per line". **That reason applies to a README and to nothing else on the list.** A diff, a source file, a table of issue rows, a timeline of wide code blocks all lose information when clipped to 1280 and gain nothing.

Interstitials go the other way entirely — **320px**, because one decision should not be scanned.

## Equal cells for scanning peers; declared spans for one arranged screen

**Cloudscape says it outright.** Column layout: "from one to four columns", "evenly distributed", stacking responsively — equal by construction, and you *cannot* make them unequal. The escape hatch is a different component: a 12-column Grid where each element declares a colspan. The guidance names the fork: "If you want a layout of up to four equal-sized columns, we recommend using the column layout component."

**Where cells are unequal, the grid stops being a scan aid and becomes a canvas.** Cloudscape's Board is a 4-column fluid grid with declared spans; CloudWatch widgets declare `x, y, width, height` on a 24-unit grid, up to 500 widgets. And that is precisely why Cloudscape forbids mixing: **"Don't combine static and configurable layout in one dashboard. Mixing static items with configurable items can cause user frustration."**

**Datadog is the sharpest case.** A 12-column grid, maximum widget width 12. High-density mode "basically duplicates the layout into a 2 × 12 column grid, **but not a 24 column grid**. This means that the widget maximum width continues to be 12 column." **A wide screen gets two columns of the same dashboard rather than one dashboard stretched, and nothing is re-authored.**

Datadog also sets floors by **content kind**, independent of importance: "Timeseries widgets should be at least 4 columns wide in order not to appear squashed"; "Stream widgets (like logs) should be at least 6 columns wide (half the dashboard width) for readability."

**Vercel's Observability row is deliberately unequal** — a wide time-series card beside a narrow rate card. **The tile carrying the *shape* gets the width; the tile carrying two numbers does not.**

**Vercel's projects index is deliberately equal** — because the purpose is scanning many peers for one odd status.

**Grafana** is the fullest grid vocabulary found: 24 columns, `gridPos {w, x, h, y}` with h in 30px units, and "negative gravity that moves panels up if there is empty space above a panel" — so **vertical position is relative order, not coordinates.** Its Auto grid inverts the authoring: the person declares a minimum column width, a row height and a maximum column count (up to 10), and panels reflow.

**Neither Grafana nor Datadog publishes a panel-count limit.** The widely repeated "10–15 panels" is third-party. What Grafana does say is that dashboards "should reduce cognitive load, not add to it", and it spends its guidance on *dashboard sprawl* instead.

## The docked detail panel, and the only explicit threshold found anywhere

Cloudscape's split panel docks at the **bottom** or the **side**: side "shifts the page content as it expands", bottom "overlays the content below it"; it auto-moves to the bottom on narrow viewports; it is resizable and remembers its size.

**The position rule is geometric: bottom when the table has more than five columns or details need comparing, side when it has five or fewer and the content is small.** This is the only numeric threshold for panel placement in the whole research.

Its refusals are as useful: "Always use details pages to display full resource details of a single resource. **A split view should never replace details pages**"; "Don't use the split panel for help content. Use the help panel instead."

**Cloudflare deliberately does the opposite** — Security Events expands a row in place rather than docking a panel, because the list re-filters constantly and there is no second pane to keep in sync.

## Nested navigation: three shapes for the same problem

- **Supabase** — two lefts at once. An icon rail (`NavigationBar`: which product area) plus a list column (`ProductMenuBar`: which table, snippet, bucket). The rail switches *which list*; the list switches *which item*.
- **AWS** — **the outer switch is at the top**, not the left. Unified Navigation in the top bar holds Services, Favorites and recently visited. The left region belongs to the chosen service — its own three-level navigation, whose collapsed state *is* an icon rail ("Narrow icon rail with labels as tooltips"). A second rail sits on the **right edge**: the column of icon triggers for help, drawers and the split panel, capped at "three to four panels".
- **Cloudflare** — one sidebar, two populations, swapped by **scope**: account-level products, or zone-level products, with "Accounts" in the sidebar climbing back out.

Cloudscape's hard refusals for the shell: "Don't nest app layouts"; "Only use one type of app layout in a product."

## The band stack that narrows as you descend

Cloudflare's Security Events is the clearest instance: **Events summary** (chart) → **Events by service** → **Top events by source** → **Sampled logs** (rows expanding in place, each field offering Filter / Exclude).

One column that narrows as you go down: volume → which feature acted → which attribute dominates → the individual events. **Because filtering is done by clicking values inside the bands, the investigation never leaves the page.**

Vercel's Observability is the same shape in two bands: charts tell you *that* something changed; the ranked table under them tells you *which route* did it.

AWS's static service dashboard fixes the bands — overview on top, service data in the middle, support resources at the bottom — with "seven as the limit number for data representation".

## Two columns for a record, abandoned rather than squeezed

Jira's pattern recurs here: prose left, fields right, "**or at the bottom in a single-column layout**".

**At narrow width the two-column form is abandoned, not compressed** — a field rail thinner than its labels reads as noise.

## The eight arrangements this batch needs

**rail** (switch the list) · **list beside content** (keep the parent on screen) · **swap** (several peers, one at a time) · **centred measure** (prose, one decision) · **full-bleed** (wide data) · **band stack** (an argument read top-down, narrowing) · **equal grid** (scan peers for an outlier) · **spanned grid** (one arranged screen) — plus **a docked detail panel** whose side is decided by the shape of what it holds.

## Not verified

Vercel's dashboard max width or centring. Cloudflare's max width. Supabase's project-card equality. GitHub Projects' board column widths. Whether the GitHub issue timeline column itself carries a cap.

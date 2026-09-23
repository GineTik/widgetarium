# Where a region's title sits, and whether one widget may earn a panel

Two hypotheses taken from the Home screen and tested against published rules. Sources: Grafana, Datadog, Apple HIG, Material 3, IBM Carbon, AWS Cloudscape, five charting libraries, and GitHub's contribution graph read live.

## Hypothesis A — "the heading sits above the plate, never inside it"

**Dies as a universal law. Survives as a distinction between two different things.**

Four of the five systems that publish anything put a title inside the plate as the normal case. Cloudscape states it outright: the header is a feature *of* the container, and *"The h2 variant of the header component is designed to be used in this component."* Grafana's panel title is a panel property. Datadog's group header belongs to the group. M3 lists Headline inside the card's anatomy. Carbon's tile text "can consist of heading text".

**But every one of them also ships the outside case, and the line they draw is the useful finding:**

| | titled from outside, no plate | header inside its own plate |
|---|---|---|
| Cloudscape | h1 page, **h3 sections and subsections** | h2 container header |
| Material 3 | *"Don't force content into cards when spacing, **headlines**, or dividers would create a simpler visual hierarchy"* | card headline |
| GitHub | the h2 "3,767 contributions in the last year" | — |
| Apple | the chart summary above the forecast | — |
| Grafana / Datadog | — | panel title, group header |

> **A section of a page is titled from outside. A component that is itself a thing carries its header inside its own plate.**

This project's `headingReading()` law covers the first case exactly and correctly — a text node first in a region reads as the section title, so every plate begins after it. What the law must not be stretched to is the second case: a widget's own column-header row, a panel title, a card's headline are all component headers and belong inside.

Measured on GitHub, light theme, 1024px viewport: the h2's bottom edge is at 654px, the bordered box holding the grid starts at 662px, and `box.contains(h2)` is `false`. The heading is outside the frame by 8 pixels of deliberate space.

## Hypothesis B — "a lone widget earns a plate when its drawing needs a ground"

**Unaddressed by published rules, and contradicted in mechanism by observed practice.**

The premise is real: a value that means *absence* must be legible. Every source solves it. **None of them solves it with a plate.**

GitHub's contribution graph, read live at `github.com/torvalds`, light theme:

- the empty cell (`data-level="0"`) is `rgb(239,242,245)` — **a fill, not nothing**
- each cell carries a `0.5px solid rgba(31,35,40,0.05)` hairline
- the box around the graph has a `1px solid rgb(209,217,224)` border and a **transparent** background
- the grid table and every ancestor up to the body compute to `rgba(0,0,0,0)` over a white page

So GitHub answers the vanishing zero three times — fill the mark, hairline the cell, stroke the frame — and the ground stays the page. nivo's calendar defaults say the same: `emptyColor: "#fff"`, `dayBorderColor: "#000"`, `dayBorderWidth: 1`.

The charting libraries run the same way, and none publishes a reason:

| | chart background | plot-area fill | frame |
|---|---|---|---|
| Highcharts | the outer chart area's colour | `plotBackgroundColor` default `null` — *"the plot area will have the background color set to `'none'`"* | — |
| Vega-Lite | `background: "white"` | `view` fill `undefined` | `view` stroke `#ddd` |
| Observable Plot | none | frame mark's *"default **fill** is *none***" | *"draws a rectangle around the plot area"* |
| Chart.js | *"There is no built-in support for this."* | — | — |

**The consistent shape: the chart may carry the page's own colour so an exported image is not transparent; the plot area is left unpainted, and where a boundary is wanted it is a stroke, not a fill.**

### What this means for the Activity heatmap

The drawing is right and my reason for it was wrong. The plate is not there because a single widget needs a ground — prior art says fill the zero mark instead, and the heatmap already does, at `--wg-kit-fill-hover`.

**The plate is right because it holds three related things**: the grid, the month scale beneath it, and the legend. That is relatedness of content, which is the rule every system actually publishes, and it means P1's "peers ≥ 2" is satisfied *inside* the widget rather than violated outside it.

The only published support for a lone widget in a region of its own is Datadog, and its reason is mechanical rather than visual: add a widget to a group *"even if they are the only widget in the group, as that will affect how those widgets are displayed in low and high density modes."*

## What decides a plate at all

Every system that publishes a rule answers with **relatedness of content**, never with *it is a region of the page*:

- **Cloudscape**: a container means "these items are related" — and explicitly not a region: *"Don't use containers simply for page hierarchy or for general page-layout purposes."*
- **Material 3**: a card is for *"content and actions on a single subject"*, and *"Don't force content into cards when spacing, headlines, or dividers would create a simpler visual hierarchy."* M3 treats plate, spacing, headline and divider as four interchangeable ways to say "this is one group" and prefers the cheapest that works.
- **Carbon**: tiles *"reside on the same plane as the page background layer and do not have elevation"*, and *"Do not add a drop shadow to tiles."* Carbon deliberately ships no card pattern at all — *"Tiles are simple and foundational. Cards can be very complex… Carbon does not have a card pattern."* Its dashboard answer to grouping is contrast and white space, not a plate.
- **Datadog**: group related widgets; the header is optional and the ground is optional, including transparent.

**A region that exists only because the layout has a slot there does not earn a plate.** That is the sharpest single sentence this research produced, and it is the same conclusion as the container research reached from the other direction.

One more M3 rule worth taking: *"Filter or sorting options should be placed outside of the card collection."* The control strip sits above the plate, not in it.

## Negative findings

- **Grafana publishes no reason for its transparent-panel toggle.** The docs describe only what it does — *"whether or not the panel has the same background color as the dashboard."* Every "use it for text panels and dividers" claim found came from forums and third-party blogs.
- **No system publishes a rule for when a chart needs a plot-area background.** Carbon, Material and Apple all discuss chart anatomy without mentioning it; the libraries express it only as a default, with no rationale.
- **Carbon's dashboards page is explicitly "a work in progress"** and says nothing about containers, panels or headings.
- **Cloudscape's dashboard pattern says nothing about backgrounds or titles** — it is about static versus configurable layouts.
- **Apple does not state where a grouped-list section header sits** relative to the grouped container, and the HIG widget page names **no title element for a widget at all** — a widget is identified by what it draws, and even the logo is allowed only when the widget draws from several sources.
- **Datadog's dashboard best-practices URL 404s**; the quotes come from its own `effective-dashboards` repository and the Group widget reference.
- **Linear, Height and Airtable were not observed** — their surfaces need an account and Airtable's interface-designer doc 404s. Notion was observed on a page with no plated blocks, so its callout and database surfaces are unverified.
- **Observable Plot's docs rate-limited**; its quotes come from the same text in the repository.

## The one Apple line that bears on widget backgrounds

*"In the accented rendering mode, the system removes the background and replaces it with a tinted color effect."* On iPhone in StandBy the widget *"appears scaled up in size with the background removed."* The background is something the host takes away — which is this project's law that a background belongs to the group and never to the widget, arrived at independently by Apple.

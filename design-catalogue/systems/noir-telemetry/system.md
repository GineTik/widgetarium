---
id: noir-telemetry
title: Noir Telemetry
source: "WEX 100 — traffic management dashboard, Behance case study"
credit: "[AUTHOR — add name and link before anything is published]"
centre: [information, object]
activity: [operate, track, study]
photogenic: [no, user-photos]
session: [long-work, glance]
density: [medium, high]
tone: [serious, calm, technical]
device: [desktop, both]
---

# Noir Telemetry

## Idea

An instrument panel at night. Everything is drawn with thin lines; every value glows bright where it matters and fades to grey where it does not; every plate is frosted glass over a dark picture. Colour is never decoration, only a signal.

The full-screen map of the source is **its product's structure, not this system** (see `design-catalogue/patterns/live-map-panels.md`). A product without a map keeps everything below.

The source presents itself in its own system — panels, strokes, outlines and split numbers carry a whole presentation — so the system works for marketing pages as well as for the product.

## Visual language

Five motifs. A screen that shows fewer than four of them is not this system.

1. **Stroke.** Everything that is not a plate is a thin line: charts, ticks, map streets, routes, object outlines, dividers, dashed guide lines across the page, dashed halo rings around markers, leader lines from a marker to its card. Filled shapes are only plates, dots and pills.
2. **Fade.** Lines, values and pictures go from full white to grey to transparent: a chart line greys out away from the focus, a trail fades behind a moving marker, a picture dissolves into the ground. Nothing ends on a hard edge.
3. **Split emphasis.** Inside one value or one sentence, the important part is bright and the rest is grey.
4. **Frost.** Plates are frosted glass with a strong blur, over a dark picture that stays visible under them.
5. **Signal.** Status colours appear as small dots, short line segments, values and soft glows, never as surfaces.

## Colour algorithm

| Step           | Job                                                      | Dark                                                                                   | Light                                                          |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| ground         | page                                                     | L 0.11–0.15, chroma ≤ 0.01                                                             | L 0.95–0.97, chroma ≤ 0.01                                     |
| picture        | the dark picture under the plates                        | grayscale, darkened toward ground; at most one natural hue left, muted (chroma ≤ 0.05) | the same picture lifted to light grayscale, muted the same way |
| plate          | frosted glass                                            | ground +0.05–0.08 L at 55–70% opacity, blur 24–40px                                    | white at 55–70% opacity, the same blur                         |
| plate-lifted   | a selected tab, a pressed control, a cell inside a plate | plate +0.04 L                                                                          | plate −0.03 L                                                  |
| text-primary   | the key part                                             | L 0.96                                                                                 | L 0.16                                                         |
| text-secondary | the rest                                                 | L 0.55–0.62                                                                            | L 0.50–0.58                                                    |
| line           | strokes, guides, ticks                                   | text-primary at 12–25%                                                                 | text-primary at 15–25%                                         |
| line-strong    | the line in focus                                        | text-primary at 80–100%                                                                | text-primary at 80–100%                                        |
| glow           | the accented card                                        | soft warm-white radial light                                                           | soft cool-grey radial shade                                    |

- **The tint is free**: the source is neutral; a product may push every neutral step toward one hue (navy, violet, forest) with chroma ≤ 0.02.
- **Status colours are fixed in meaning, mandatory, and always small:**

  | Status      | Source hex   | Use                                                               |
  | ----------- | ------------ | ----------------------------------------------------------------- |
  | critical    | `#FF4747`    | the few things that need action now; its line and marker may glow |
  | attention   | `#F39444`    | deviations, warnings, chart segments that left the norm           |
  | operational | `#5EC557`    | online, on schedule, ready                                        |
  | content     | text-primary | normal objects                                                    |

  Helper colours (GPS, LTE) are allowed when soft.

## Type

- Helvetica Neue Light, Regular, Medium. For Cyrillic, a close grotesque beside it.
- Scale: hero headline 96–128 Light; screen title 48–72 Light; key value 40–72 Light; card title 14–16 Regular; label and meta 11–13 Regular in text-secondary.
- Numbers are always Light and large; units sit small and grey beside them (`27.4 km/h`, `142,580 today`).
- A two-line heading: the first line Light grey, the second white ("Predictive Volume / Analytics").
- **Letter badge:** a small pill whose first part is a circle with one letter (`L 45623`, `R Regular`, `L Localization`).

## Imagery

- **Role:** atmosphere and evidence. Pictures are dark, grayscale and quiet, so frosted plates have something to frost and white lines read on them.
- **Kinds:** a dark grayscale aerial or terrain photo; a near-black product photo lit from one side; a grayscale 3D or camera scene where one object glows in its status colour; line art of an object, white strokes, no fill.
- **For another domain**, the same kinds of the new domain's subject: a dark aerial of its place, a dark photo of its object, its object as line art.
- **Sources:** CC0 / public-domain photos graded by the colour algorithm; ready vector line art (Wikimedia Commons SVG, public-domain technical drawings) used as it is. Never drawn or traced by an agent (`design-catalogue/README.md`).
- A user photo is graded to grayscale and fades into its plate.

## Surfaces

- **Every plate is frosted** — cards, panels, buttons, pills — and has **no border**: blur and fill alone separate it.
- **Blur needs a picture under it.** On a page with a picture, the picture stays visible under every plate; fog only darkens it to 40–60%. On a page without a picture, plates take a solid lifted fill instead of pretending to be glass.
- **Card anatomy:** a header with the title left and an icon-only action right (no background); an optional grey description; one headline value summarising the card; then the content.
- **Padding is flexible:** text is padded; a picture inside a card bleeds to the card's edges, its controls floating on it.
- **Grouping:** many small facts are grouped in one large plate holding smaller plates; a large self-sufficient card stands alone.
- **The accented card** carries the glow; it is a state, not a colour.
- **Stat card:** a huge light number, a split-emphasis sentence, a stroke chart bleeding off both edges, a frosted label pill in a corner.
- **Media card:** a dark picture edge to edge, a frosted label pill in a corner.

## Controls

- Buttons: frosted pills or circles; icon-only where space is short.
- Tabs, two kinds: **card tabs**, each option a small plate with a count and a label, the selected one lifted; **text tabs** with an underline.
- Sliders and scrubbers: a row of hairline ticks with a marker riding on it.
- Selector: a pill with an icon, a label and a chevron.
- Status pill: a frosted pill with a status dot.
- A side panel or a group folds to one line.

## Data display

- Charts are strokes: a grey noisy line; the segment in focus white, a segment out of the norm in attention orange; a dashed target line; a light grey band over the zone in focus; small dots at crossings; a black value pill on hover.
- Tables are lines: each value beside a short column of ticks; deviations take a clock icon and orange.
- Markers: a frosted circle with an icon or a dot, inside a dashed halo ring; a leader line runs from a marker to its card.
- Timeline: a strip of ticks; milestones as frosted circles; dashed drop lines to cards below; "now" as a glowing pill.

## Layout principles

Principles only; which screens exist and what they hold come from the new product's tasks.

- A page breathes: few plates, large gaps, the headline value large; a plate groups, it does not fill.
- Dashed guide lines may cross the page and tie elements together.
- Navigation is a frosted bar of links; controls (search, notifications, theme, profile) stand apart from it.
- Plates are inset from the window edges, never touching them.
- On a phone, plates stack; navigation becomes a frosted bar of round icons at the bottom.

## Behaviour

- A picked object opens its frosted card beside it, joined by a leader line; its line turns line-strong.
- Card tabs switch the content of the plate they head.
- Groups expand and collapse; a panel folds to one line.
- Values and charts update live; a changing value fades from white to grey as it ages.

## Motion

- Everything arrives and leaves through opacity, never by sliding hard edges in.

## Fit

- Suits: monitoring and operations, live tracking, analytics, technical products that should feel premium, and their marketing pages.
- Weak for: playful consumer apps, colourful content feeds, products whose objects need colour photos.

## Do / don't

- Do draw with strokes; fill only plates, dots and pills.
- Do split every key value into bright and grey.
- Do keep colour for status, small.
- Don't put a border on any plate, card, panel or button.
- Don't frost a plate over flat colour.
- Don't use bold for numbers.
- Don't draw pictures; source them.

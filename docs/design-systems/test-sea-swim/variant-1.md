# Variant 1 — Rising tide

## Idea

Every screen is filled from the bottom by a block of water in one sea hue, and the height of its hard waterline is the screen's main reading: the tide now, minutes swum, the season goal.

## Traits

| Category    | Trait taken                                                                          | Why                                                                       |
| ----------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Idea        | K-I2 the picture carries a meaning: here, water level                                | The water block is not decoration; its height is data.                    |
| Idea        | G-I2 one page, one task, one focus                                                   | One level per screen, or the waterline means nothing.                     |
| Colour      | V-C1 one hue family, sea teal (h 215)                                                | Water and UI are one body; a second hue would break the level.            |
| Colour      | V-C2 tonal steps with jobs                                                           | Depth reads as tone: air above is light steps, water below is deep steps. |
| Colour      | V-C3 no pure grey; text carries the hue                                              | Air above the line is still sea air.                                      |
| Imagery     | K-M1 the picture forms the design                                                    | The water block is on every screen.                                       |
| Imagery     | K-M3 one kind of picture, abstract water, no subject                                 | A level needs a surface, not a scene.                                     |
| Imagery     | V-M2 every picture graded into the hue (duotone)                                     | Picture and steps must be the same water.                                 |
| Imagery     | V-M5 user photos get the deep-step duotone                                           | Any phone photo becomes a slice of the same sea.                          |
| Layout      | V-L1 accent block full bleed, adapted: 25–75% of the view, its height is the reading | The idea itself.                                                          |
| Layout      | G-L2 header: small round button, centred title, small round button                   | Keeps the air above the line quiet.                                       |
| Surfaces    | K-S1 two plates only: one light sheet for a list, one owned object                   | Plates would hide the level.                                              |
| Surfaces    | G-S2 no ground behind a status; facts are outline chips                              | Readings stand on air or on water, never on a box.                        |
| Controls    | G-K2 text or icon, rarely both                                                       | Small controls leave room for the level.                                  |
| Controls    | K-K1 quiet by default: translucent, blurred on water                                 | Controls float on the surface.                                            |
| Controls    | K-K3 one full-width pill (deep step) only where an action completes                  | "Log swim" is the only primary act.                                       |
| Functional  | V-F1 instruments from simple marks: ticks, stripes                                   | Ticks are depth marks on a gauge.                                         |
| Functional  | K-F1 hairline charts, one solid value in a pill                                      | Tide curve drawn as a hairline over the water.                            |
| Functional  | G-F1 physical picker: lens over a hairline ruler                                     | Minutes and temperature are dialled, like a depth gauge.                  |
| Type        | G-T1 neo-grotesk, titles and numbers in one medium weight                            | A gauge needs firm figures.                                               |
| Density     | G-D1 low density, big gaps                                                           | The level needs empty air above it.                                       |
| Transitions | V-X1 hard edges                                                                      | The waterline must be exact to be read.                                   |

Source counts: Verdant 8, Gallery 7, Cloud 7 (22 traits; max 36%).

Rejected on conflict: K-X1 smooth melt (a soft waterline cannot be read), V-S1 cards everywhere (vs K-S1), V-K3 many primaries (vs K-K3), K-C1 neutral UI (vs V-C1).

## Colour

Hue: sea teal, OKLCH h 215 (signal h 200). L ranges from Verdant kept; chroma is the in-gamut maximum at each L.

| Step      | Hex       | Job                                        |
| --------- | --------- | ------------------------------------------ |
| deep      | `#02515f` | water block under the line, primary pill   |
| shadow    | `#02343e` | bottom of the water block, duotone shadows |
| strong    | `#026c7f` | current tab, solid chart value             |
| signal    | `#3fe3ec` | the waterline itself, one per screen       |
| soft      | `#b3e1ec` | control on air, outline chips on water     |
| pastel    | `#d6edf2` | air: page ground above the line            |
| light     | `#ebf6f8` | the one list sheet                         |
| ink       | `#01272e` | text on air                                |
| ink-quiet | `#4d737c` | secondary text on air                      |

## Imagery

- Role: forms the design (the water block). User photos are domain content placed inside the water.
- Type: abstract water surface, ripples and underwater light, no people, no horizon. Graded to a deep-to-soft teal duotone.
- User photos: same duotone (shadow → strong → `#c4f0f5`); they sit below the line only.
- Queries: "water surface", "sea surface ripples", "underwater light" (Openverse, cc0/pdm).

## Signature components

1. **Tide level** — Today's water block rises to the tide height now; hairline tide curve on it, high/low ticks at the edge.
2. **Go / no-go line** — the signal line drawn at the safe-limit level; conditions above it stand on air, any reading that crosses it drops into the water.
3. **Depth dial** — log a swim: a lens slides on a vertical tick ruler for minutes and water temperature.
4. **Season level** — 100-swim goal as water filling a column; ticks every 10 swims, coldest swim marked.
5. **Spot sounding** — a spot's notes as depth marks along a hairline: "rocks on the left at low tide" at its tide height.

## The design book must

- Open on a full-width water block at the tide's height with nothing but the reading above it.
- Show every section's main value as the height of water, never as a card.
- Keep one hard signal waterline per section, no fades.
- Show a raw phone photo next to its duotone, both below a waterline.

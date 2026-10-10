# Verdant — traits

A design system is a set of traits, one sentence each, grouped in ten categories shared by every system so they can be merged trait by trait. The source app (food ordering) is **not** part of the system: only the traits are.

Previous prose version: `archive/v1/verdant.md`.

## Fit

| Parameter         | Value                                        |
| ----------------- | -------------------------------------------- |
| Centre of gravity | object (products, places, items with a look) |
| Photogenic domain | yes                                          |
| Session           | browse, glance                               |
| Density           | high                                         |
| Tone              | energetic                                    |
| Device            | phone first                                  |

Conditional traits (all others are portable to any product):

| Trait                  | Needs                                                           |
| ---------------------- | --------------------------------------------------------------- |
| V-I2, V-L1, V-L2, V-L3 | centre = object, photogenic = yes, or a map that is the subject |
| V-M1, V-M2, V-M3       | photogenic = yes                                                |
| V-S1                   | items with a picture or rich facts                              |
| V-F2                   | a map or picture the person acts on                             |
| V-D1                   | density = high                                                  |

## 1. Idea

- **V-I1** Saturated and alive: energy comes from one hue at full strength, used in many tones.
- **V-I2** Every screen has one accent that takes over a large part of it; content follows on a calmer ground.

## 2. Colour logic

- **V-C1** One hue family for the whole UI; never two hues side by side. The hue is free (green in the source; red, blue, ochre work the same way).
- **V-C2** Colours are tonal steps of that hue, each with one job:

  | Step      | Job                                    | Lightness (OKLCH L) | Chroma        |
  | --------- | -------------------------------------- | ------------------- | ------------- |
  | deep      | accent-block ground, dark gradient end | 0.38–0.45           | high          |
  | strong    | primary button, current tab            | 0.45–0.52           | high          |
  | signal    | one highlight per screen               | 0.82–0.88           | highest       |
  | soft      | control on a light ground              | 0.86–0.90           | low-mid       |
  | pastel    | page                                   | 0.92–0.94           | low           |
  | light     | card                                   | 0.95–0.97           | very low      |
  | ink       | text                                   | 0.22–0.28           | low, same hue |
  | ink-quiet | secondary text                         | 0.50–0.56           | low, same hue |

- **V-C3** No pure grey anywhere: even text and quiet surfaces carry the hue.
- **V-C4** Gradients are only transparent fades of the deep step over a photo, dark at the bottom so text reads.

## 3. Imagery

- **V-M1** Images **form the design**: they are the accent and carry the palette.
- **V-M2** Every image is in the UI hue: the photo's dominant colour matches the hue family.
- **V-M3** Image type: close-up, realistic, tactile subjects of the domain; filled frame, no empty sky.
- **V-M4** Text on an image sits at the bottom on a deep-step fade, white, often italic.
- **V-M5** User-supplied photos (unmatched colour) go into cards with the deep fade, which tints them toward the hue.

## 4. Layout

- **V-L1** The accent block takes 40–60% of the first view, full bleed: no side padding, under the status bar and the header.
- **V-L2** The header lies on the accent block.
- **V-L3** A light sheet with large top corners slides over the bottom of the accent; content lives on it.
- **V-L4** Small side padding for content.

## 5. Surfaces and depth

- **V-S1** Cards are the rule: every item gets its own card (image, title, description, price, controls).
- **V-S2** Cards are light or white with no strict hierarchy; depth comes from tone on tone, never shadow.
- **V-S3** Plain description text is the one exception and stands without a card.

## 6. Controls (kit)

- **V-K1** Two control families by ground: **pill** on a light ground; **rounded square (r 16–20) of translucent white with backdrop blur** on an image or accent block.
- **V-K2** Search fields and their buttons use the rounded square even on a light ground.
- **V-K3** Many saturated primary actions: one per card is fine.
- **V-K4** Navigation is separate circles inside one pill; the current one filled with the deep step.

## 7. Functional blocks

- **V-F1** A function gets an unusual instrument built from simple marks: ticks for points, diagonal stripes for progress, a signal band tucked behind a card for status.
- **V-F2** A map or a picture can be the control surface itself (search and actions float on it).

## 8. Typography

- **V-T1** Geometric sans; display lines light, titles medium, body regular in ink-quiet.
- **V-T2** Large numbers are light, never bold.

## 9. Space and density

- **V-D1** Dense and rich: many cards, big type, big round blocks.

## 10. Transitions

- **V-X1** Edges between layers are hard: the sheet overlaps the accent with a clear corner.

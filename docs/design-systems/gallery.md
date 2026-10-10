# Gallery — traits

Same ten categories as every system. The source app (property rental) is **not** part of the system.

Previous prose version: `archive/v1/gallery.md`.

## Fit

| Parameter         | Value                 |
| ----------------- | --------------------- |
| Centre of gravity | object, one at a time |
| Photogenic domain | user photos           |
| Session           | browse                |
| Density           | low                   |
| Tone              | calm, premium         |
| Device            | both                  |

Conditional traits (all others are portable to any product):

| Trait                  | Needs                                           |
| ---------------------- | ----------------------------------------------- |
| G-M1, G-M3, G-M4, G-S1 | photogenic = yes or user photos                 |
| G-M2                   | designer photos exist (empty states, marketing) |
| G-L3                   | a home screen that greets                       |
| G-D1, G-I2             | density = low or medium                         |

## 1. Idea

- **G-I1** Calm through grey and fog: nothing shouts, space is the luxury.
- **G-I2** One page, one task, one focus.

## 2. Colour logic

- **G-C1** The UI is neutral: a grey with a faint tint (chroma ≤ 0.01; the source leans slightly cool). The tint hue is free.
- **G-C2** Steps and jobs:

  | Step       | Job                                          | Lightness (OKLCH L) |
  | ---------- | -------------------------------------------- | ------------------- |
  | ground     | page                                         | 0.92–0.94           |
  | raised     | segment, tile, light button                  | 0.95–0.97           |
  | white      | small chip, button that must pop on the grey | 1.0                 |
  | ink        | primary action, selected, titles             | 0.12–0.20           |
  | text-quiet | addresses, descriptions (used a lot)         | 0.50–0.58           |
  | text-soft  | greeting, decimals                           | 0.68–0.74           |
  | hairline   | outline chips                                | 0.85–0.88           |

- **G-C3** Black is the only strong UI colour; white buttons on grey look modern and clean.
- **G-C4** One spot colour, used **only on one small icon** to pull the eye to a detail (the rating star). Never on a button, a dot or a ground.
- **G-C5** Much of the text is grey, not black: calm comes partly from the type colour.

## 3. Imagery

- **G-M1** Images are **domain content**, not design: people upload them. They obey the design but do not form it.
- **G-M2** Designer-chosen images: light, airy, daylight, desaturated, in the ground's tone; one subject per frame, no dark or loud photos.
- **G-M3** Every image dissolves into the page grey at the bottom (fog); text stands on the fade.
- **G-M4** The fog is what makes **any** user photo fit, even a loud one.

## 4. Layout

- **G-L1** Strict layout: an image keeps the page padding and never reaches the edge or goes under the header.
- **G-L2** Header: small round button left, small round button right, a centred title or selector.
- **G-L3** A greeting block opens the home screen and adds air (light grey first line, ink second).
- **G-L4** Screen-level actions are big pills fixed at the bottom: a light one and a wider black one.
- **G-L5** The bottom of the screen fades into fog too; content rises out of it while scrolling.

## 5. Surfaces and depth

- **G-S1** Almost no plates: the photo is the card.
- **G-S2** No ground behind a rating, a status or plain text; property facts are outline chips with no fill.
- **G-S3** A plate appears only to mark the chosen object (a summary row) — an exception, not a rule.

## 6. Controls (kit)

- **G-K1** Small pills; selected is black, others raised grey; no ground around a group.
- **G-K2** A button is text **or** icon, rarely both.
- **G-K3** On a key photo: round translucent blurred buttons. On a photo among many: a plain white circle and a black circle arrow.
- **G-K4** Big buttons only for screen-level actions; everything else small.

## 7. Functional blocks

- **G-F1** A picker is physical: a lens slides over a hairline ruler; a calendar is soft tiles with the chosen one black.

## 8. Typography

- **G-T1** Neo-grotesk; titles and prices in the same medium weight; body regular in text-quiet.

## 9. Space and density

- **G-D1** Low density: few elements, big gaps.

## 10. Transitions

- **G-X1** Soft: image to ground, content to the screen bottom, always through a fade.

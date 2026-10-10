# Verdant

Source: one board of 9 phone screens, a green food-ordering app (restaurants, menu, bag, order tracking, rewards, gift cards).

## Idea

**Saturated and alive.** One green palette fills the whole screen at different tones, the way Material 3 Expressive uses tonal palettes: a light green for a card, a pastel green for a page, a deep saturated green for a button. Almost every screen gives 40–60% of its height to one **accent block** (a map, a photo, an unusual component) that is part of the page itself, not a picture inside it. White content then slides up over it like a sheet.

## Palette

Tonal steps of one green hue, never grey.

| Role                                                   | Tone                    | Approx.               |
| ------------------------------------------------------ | ----------------------- | --------------------- |
| Accent block ground (map, hero)                        | deep forest             | `#2F5D16`             |
| Primary button, active tab                             | forest, saturated       | `#3A6B1C`             |
| Signal (one per screen: opening hours band, highlight) | lime                    | `#9BE15D`             |
| Page under content                                     | pastel green            | `#E3ECD8`             |
| Card                                                   | light green or white    | `#EEF4E7` / `#FFFFFF` |
| Control on light ground                                | soft green, translucent | `#CFE0BC` at 70%      |
| Text                                                   | green-black             | `#1C2914`             |
| Secondary text                                         | green-grey              | `#5A6850`             |

- Every photo is chosen to match the palette: greens, fresh food, restaurant interiors in green and wood. A photo that breaks the palette breaks the system.
- Gradients are allowed and used well: transparent green over a photo, dark at the bottom so text reads.

## Layout

- **Accent block first.** Map, hero photo or a hero component takes the top 40–60% of the screen, edge to edge, **no side padding, under the status bar and the header**. The header (back, tabs, settings) lies on the accent block.
- **White sheet over it.** Content starts on a light sheet with large top corners that overlaps the bottom of the accent block.
- Side padding of content is small (12–16 px on phone).
- Nearly every screen has an accent; plain list screens (the bag) are the exception.

## Controls: two families

| Where                       | Shape                              | Fill                                     |
| --------------------------- | ---------------------------------- | ---------------------------------------- |
| On white / light ground     | **pill** (fully round)             | saturated forest, or pastel green        |
| On an image or accent block | **rounded square** (radius ~16–20) | translucent white with **backdrop blur** |

- Search fields and their submit buttons use the rounded-square family, even on light ground.
- Counters, icon buttons, the AI sparkle button on a photo: blurred glass squares.
- Bottom navigation: a pill holding round icon buttons; the current one filled deep forest.

## Cards

Cards are the rule: every item gets its own card (image, icon, title, description, price, controls). Cards may be white or light green; there is no strict hierarchy between the two. Exception: a product description page is plain text on white, no cards.

## Imagery

- Rounded corners on every image (~20–24).
- An image card carries its text at the bottom on a dark green gradient, white type, often italic.
- Hero images run full bleed with the header on them.

## Type

Geometric sans (Urbanist-like). Light/regular for big display lines ("Eat Fresh / Live Healthy"), medium for titles, regular grey-green for descriptions. Big numbers are light, not bold.

## Signature components

Components you do not see elsewhere, each built from the system's own idea:

- **Map header** with the road lines on deep green, a glass search square and a glass sparkle square.
- **Opening-hours band**: a lime strip tucked behind the top of a white card.
- **Points meter**: a row of thin vertical ticks filling left to right under a light "3500 PTS".
- **Striped progress**: order tracking where the done part is diagonal forest stripes.
- **Round-pill nav**: separate circles inside one pill.

## Density

Dense and rich: many cards, many accents, big type, big round blocks. Energy, not calm.

## The design book must

Open with a full-bleed accent block (map or green photo) carrying the header in glass controls, and a white sheet sliding over it. Every section is a card or sits on a tonal green ground. All photos green.

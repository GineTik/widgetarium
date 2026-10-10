# Merged A — Green Mist

| Axis                 | Source                               |
| -------------------- | ------------------------------------ |
| Idea / mood          | Verdant                              |
| Palette              | Verdant                              |
| Ground and depth     | Verdant                              |
| Accent layout        | Verdant                              |
| Card policy          | Verdant                              |
| Control families     | Verdant                              |
| Imagery              | Gallery (fog fade, recoloured green) |
| Type                 | Cloud (light amounts, grey decimals) |
| Density              | Verdant                              |
| Signature components | new                                  |

## Idea

**A green world where every photo dissolves into green mist.** Verdant's saturated tonal green fills the screen, the accent block takes the top of the page, and a white sheet of cards slides over it. Gallery's fog is borrowed only for imagery: a photo never ends on a hard edge, it fades into the green tone it stands on.

## Palette

Tonal steps of one green; no grey anywhere, the fog is green too.

| Role                        | Hex                            |
| --------------------------- | ------------------------------ |
| Accent block, dark gradient | deep forest `#2F5D16`          |
| Primary pill, current tab   | forest `#3A6B1C`               |
| Signal, one per screen      | lime `#9BE15D`                 |
| Page, fog colour            | pastel green `#E3ECD8`         |
| Card                        | light green `#EEF4E7` or white |
| Control on light ground     | soft green `#CFE0BC`           |
| Text                        | green-black `#1C2914`          |
| Secondary text, decimals    | green-grey `#5A6850`           |

- A gradient is only ever a fade of a photo into `#E3ECD8`, `#EEF4E7` or `#2F5D16`.
- Every photo is green: leaves, greens, bowls on white or wood.

## Layout

- Accent block first: a photo or a hero component, edge to edge, 50–60% of the first viewport, under the header.
- Its bottom dissolves into the pastel page; a white sheet with 40 px top corners overlaps the fog.
- On desktop the sheet is a centred column (max 1200) and the accent block still runs full width.

## Controls

| Where               | Shape                     | Fill                                           |
| ------------------- | ------------------------- | ---------------------------------------------- |
| Light ground        | pill                      | forest (primary, one per screen) or soft green |
| Photo, accent block | rounded square, radius 18 | white 22% with backdrop blur                   |

- Search fields and their submit buttons are rounded squares, even on light ground.
- Navigation is a pill holding separate round buttons; current one filled forest.

## Cards

Every item is a card, white or light green. A card with an image is a **mist card**: the image fades into the card's own tone and the title stands on the fade.

## Imagery

- Radius 24 on every image inside a card; hero photos full bleed.
- Bottom 40% of an image is a fade into the tone under it. No dark text panel, no hard edge.
- Text on a dark photo area uses a forest fade, white italic.

## Type

Urbanist. Display lines light (300), titles medium, body regular green-grey. Amounts light, decimals in green-grey (`$12.75` with `.75` grey). No bold numbers.

## Signature components

- **Mist card** — photo dissolving into the card's tone, italic title on the fade, glass square counter on the photo.
- **Harvest meter** — a row of thin ticks under a light number; filled ticks forest, the next goal tick lime.
- **Lime index band** — a lime strip tucked behind the top edge of a white card, carrying one fact (hours, a status).
- **Ripening track** — progress where the done part is diagonal forest stripes and the knob is a glass square.
- **Round-pill dock** — separate circles inside one soft-green pill; current one forest.

## Density

Dense and rich: many cards, big photos, big light type.

## The design book must

Open on a full-bleed green photo with the header in glass squares, dissolving into pastel green under a white sheet. Every section is a card or stands on a green tone. All photos green and faded into green.

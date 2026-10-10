# Merged C — Sky Takeover

| Axis                 | Source                                                          |
| -------------------- | --------------------------------------------------------------- |
| Idea / mood          | Cloud                                                           |
| Palette              | Cloud                                                           |
| Ground and depth     | Gallery (the sky fogs into mist down the page)                  |
| Accent layout        | Verdant (the sky block takes over full bleed, under the header) |
| Card policy          | Cloud (only the owned object and a drawer)                      |
| Control families     | Verdant (pill on mist, glass square on sky)                     |
| Imagery              | Gallery (fade, radius 28)                                       |
| Type                 | Gallery (neo-grotesk, medium titles)                            |
| Density              | Cloud                                                           |
| Signature components | new                                                             |

## Idea

**The sky takes over the top of the screen and fogs into mist below; numbers float on it, and only what you own or must read gets a plate.** Cloud gives the sky and the no-plates rule, Verdant makes the sky a full-bleed block that owns the header, Gallery decides how it ends: in fog, not on an edge.

## Palette

| Role                     | Hex                                     |
| ------------------------ | --------------------------------------- |
| Sky block                | cloud photo, pale blue `#C9DCE6` → mist |
| Mist, the ground below   | `#DCE8EE` → `#F3F6F7`                   |
| Drawer                   | white `#FFFFFF`                         |
| Text                     | near-black `#0B0B0C`                    |
| Secondary text, decimals | grey `#8A9297`                          |
| Bloom                    | peach-pink, from a sunset cloud photo   |
| Value tag, one primary   | black `#0B0B0C`                         |
| Delta up / down          | `#1F7A4D` / `#B4232C`, small text only  |

- Colour comes from the photo. A gradient is only sky fading into mist, or mist into a lower sky.

## Layout

- Sky block first: full bleed, 60–70% of the first viewport, the header on it.
- It fogs into mist; further sky panels may surface again lower down and fog back.
- Content stands on the sky or the mist directly, centred column max 1200.

## Controls

| Where | Shape                     | Fill                              |
| ----- | ------------------------- | --------------------------------- |
| Mist  | pill                      | black (one per flow) or white 70% |
| Sky   | rounded square, radius 16 | white 30% with backdrop blur      |

- Quiet actions are text with an arrow ("Send ↗").
- Round white icon buttons with a label under them for object actions.

## Cards

Two plates only: the owned object (a glass card with a peach bloom) and a list in a drawer (white sheet, handle, rising out of mist). Never one card per row.

## Imagery

Radius 28; the bottom of a photo fades into mist. Sky photos are pale and low contrast; nothing saturated.

## Type

Hanken Grotesk. Titles medium, amounts light with grey decimals, labels regular grey.

## Signature components

- **Horizon gauge** — a goal drawn as hairline ticks along a horizon line on the sky; reached ticks black, the target a black pill.
- **Glass object stack** — the owned card in glass with a peach bloom over ghost copies of the others.
- **Altitude scrubber** — a vertical tick ruler on the sky with a glass lens over the chosen value.
- **Dial chips** — period chips drawn as small dials; the hand shows how much of the period has passed.
- **Mist drawer** — the one list, a white sheet with a handle rising out of the mist.

## Density

Low; the space is there to show the sky.

## The design book must

Open on a full-bleed sky with the header in glass squares, and stand on sky or mist to the end. Text, palette, type and charts sit without plates; only the owned card and a drawer are plates.

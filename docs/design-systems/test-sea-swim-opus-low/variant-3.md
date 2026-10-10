# Variant 3 — Postcards in the fog

Fit profile and dropped traits: see `variant-1.md`.

## Idea

Each swim becomes a postcard that dissolves into sea fog; the swimmer's own photos are the only colour, and the UI is the cool grey mist they fade into.

| Category    | Trait                                           | Why                                        |
| ----------- | ----------------------------------------------- | ------------------------------------------ |
| Imagery     | G-M1 photos are user content                    | the swimmer's photo is the hero            |
| Imagery     | G-M4 fog makes any user photo fit               | a loud sunset and a grey dawn sit together |
| Colour      | G-C4 one spot colour on one small icon          | the water thermometer, nothing else        |
| Layout      | G-L4 big pills at the bottom for screen actions | "Log swim" / "I'm going"                   |
| Surfaces    | V-S1 each swim its own card (photo + facts)     | postcard per swim                          |
| Type        | V-T1 geometric sans, light display              | airy postcard captions                     |
| Controls    | V-K4 navigation as circles in one pill          | five pages, one compact pill               |
| Functional  | V-F1 instruments from ticks and stripes         | conditions and goal as mark-built gauges   |
| Colour      | K-C1 UI neutral; colour comes from the picture  | here the picture is the user's photo       |
| Transitions | K-X1 smooth, everything melts into mist         | reinforces G-M4                            |
| Controls    | K-K2 round white buttons with label under       | safety checks: buoy, told someone          |
| Controls    | K-K1 quiet by default                           | everything but the bottom pill stays quiet |

Sources: Gallery 4 · Verdant 4 · Cloud 4 (12). Conflict avoided: G-S1 "photo is the card" left out in favour of V-S1.

## Colour

Logic K-C3 neutral steps over pictures, cool tint (H ≈ 235); one spot colour after G-C4.

| Step     | Hex     | Job                            |
| -------- | ------- | ------------------------------ |
| mist     | #eef1f4 | page, fog fade end             |
| raised   | #f7f8fa | card body                      |
| white    | #ffffff | round buttons                  |
| ink      | #12171c | titles, primary pill, selected |
| grey     | #6c757e | secondary text                 |
| soft     | #a7afb7 | decimals, greeting first line  |
| hairline | #d9dee3 | ticks, outlines                |
| spot     | #ff6a4d | the thermometer icon only      |

## Imagery

Role: user photos are content and the only colour; design photo only for the empty state (sea fog). Kept in line by a fog fade to mist on the lower half of every card. Queries: `sea fog`, `misty sea morning`, `calm sea horizon`.

## Signature components

- **Postcard** — user photo fading into mist, light caption, facts on the fade.
- **Go / no-go** — round white check buttons with labels; verdict as a big bottom pill.
- **Season ruler** — hairline ruler with a lens on swim 64 of 100.
- **Spot card** — design fog photo, note in light italic.

## The design book must

Open on a wall of user postcards dissolving into grey; the only saturated colour on the page is in photos and one thermometer.

# Variant 3 — The horizon is the instrument

## Idea

A pale seascape is the ground of every screen and its horizon is the baseline of every chart: tide, wind and the season are hairlines drawn along the sea's own edge, and the picture itself changes with the day's conditions.

## Traits

| Category    | Trait taken                                                                               | Why                                                             |
| ----------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Idea        | K-I2 the picture carries a meaning: today's sea                                           | Calm sea on a go day, chop on a no-go day.                      |
| Idea        | G-I2 one page, one task, one focus                                                        | One horizon per screen holds one reading.                       |
| Colour      | K-C1 the picture sets the colour; UI stays neutral                                        | Ink hairlines must read on any sky.                             |
| Colour      | K-C2 picture pastel and cool, here a lilac-blue (h 250)                                   | Dawn sea light, cool by rule.                                   |
| Colour      | K-C3 steps: picture, mist, white, ink, grey, warm bloom, up/down                          | Cloud's jobs, re-hued.                                          |
| Imagery     | K-M1 the picture forms the design                                                         | The horizon must be on every screen.                            |
| Imagery     | K-M3 one kind of picture: open sea with a horizon, no people                              | Every picture must carry a baseline.                            |
| Imagery     | G-M1 user photos are domain content                                                       | Users add swim photos; they never become the ground.            |
| Imagery     | G-M4 fog makes any user photo fit                                                         | User photos fade into mist like the ground does.                |
| Layout      | V-I2 one accent takes a large part of the screen                                          | The seascape takes the top two thirds.                          |
| Layout      | V-L2 the header lies on the picture                                                       | The sky is the header's ground.                                 |
| Surfaces    | G-S2 no ground behind a status; facts are outline chips                                   | Charts and chips stand on the sea.                              |
| Controls    | V-K1 two families by ground: blurred rounded squares (r 16) on the picture, pills on mist | Controls in the sky are glass; below the fade they are pills.   |
| Controls    | G-K2 text or icon, rarely both                                                            | Keeps the horizon clean.                                        |
| Controls    | G-L4 screen-level actions: a light pill and a wider black pill at the bottom              | Log swim and plan are the screen's two acts.                    |
| Functional  | V-F2 the picture is the control surface                                                   | The horizon is the chart baseline; scrubbing it moves the time. |
| Functional  | V-F1 instruments from simple marks                                                        | Wind as tick arrows on the horizon, waves as stripes.           |
| Functional  | K-F1 hairline charts; one solid value with its number in a black pill                     | Tide curve over the sea with "now" in a pill.                   |
| Type        | K-T1 geometric, light; large amounts light with grey decimals                             | Air-light figures on a pale sky.                                |
| Type        | V-T2 large numbers light                                                                  | Same, kept for the big go/no-go figure.                         |
| Transitions | G-X1 soft: image to ground through a fade                                                 | The sea melts into mist below the charts.                       |

Source counts: Cloud 8, Gallery 7, Verdant 6 (21 traits; max 38%).

Rejected on conflict: K-K3 one black pill only (vs G-L4, which keeps a light partner for "Plan"), V-C1 one hue UI (vs K-C1), V-X1 hard edges (vs G-X1).

## Colour

Picture hue: lilac-blue, OKLCH h 250, pastel. UI neutral.

| Step         | Hex                   | Job                                           |
| ------------ | --------------------- | --------------------------------------------- |
| picture high | `#d0e0f2`             | sky and calm sea                              |
| picture low  | `#90a7c0`             | deepest tone allowed in a picture; storm days |
| mist         | `#e9f1fa`             | where the picture fades out                   |
| white        | `#ffffff`             | sheet under a list, readability only          |
| ink          | `#0f1215`             | hairlines, text, value pill, primary pill     |
| grey         | `#70757a`             | secondary text, decimals                      |
| warm bloom   | `#f4a988`             | blurred spot behind the season goal only      |
| up / down    | `#317a45` / `#b54a46` | delta text only ("+1.2°")                     |

## Imagery

- Role: forms the design. One kind: open sea with a horizon line at 40–60% of the frame.
- Grading: duotone `#6e85a2` → `#b6c8de` → `#f1f5fb`; storm days `#4d5d73` → `#e6edf6`.
- User photos: the same duotone (hue fade), then a fog fade into mist; shown below the horizon only.
- Queries: "sea horizon", "calm sea", "foggy sea", "stormy sea horizon" (Openverse, cc0/pdm).

## Signature components

1. **Horizon tide** — tide curve drawn on the horizon, now in a black pill, swim window shaded between two hairlines.
2. **Conditions ticks** — wind, wave and air along the horizon as tick marks and stripes, numbers above in light type.
3. **Go / no-go sky** — the day's verdict as one large light word; the picture switches between a calm and a storm grade.
4. **Season horizon** — 100 swims as ticks along the horizon line, warm bloom behind the next goal.
5. **Spot on the horizon** — a spot's notes pinned as hairline drops from the horizon.

## The design book must

- Open on a full-width seascape with the tide drawn on its horizon.
- Draw every chart on a horizon, never in a box.
- Show calm and storm grades side by side.
- Fade every picture into mist; no hard image edges.

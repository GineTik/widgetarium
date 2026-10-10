# Variant 2 — Your last swim

## Idea

The ground of every screen is the person's own last swim photo, cooled and fogged into grey, so the journal looks like their sea and the only strong colour left is the orange of the tow float on one small icon.

## Traits

| Category    | Trait taken                                                           | Why                                                               |
| ----------- | --------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Idea        | G-I1 calm through grey and fog                                        | A journal kept for oneself, read on a grey morning.               |
| Idea        | K-I3 a title, an icon, a number, then on to the next screen           | The photo needs space; no screen explains itself in cards.        |
| Colour      | G-C1 neutral UI, faint cool tint (h 240, C ≤ 0.008)                   | The photo is the only colour source.                              |
| Colour      | G-C2 grey steps with jobs                                             | Calm comes from steps, not hues.                                  |
| Colour      | G-C3 black is the only strong UI colour                               | Primary act and selection read on any photo.                      |
| Colour      | G-C4 one spot colour on one small icon                                | Tow-float orange on the safety icon: the one thing never to miss. |
| Colour      | K-C1 the picture sets the colour direction; UI stays neutral          | The user's photo leads, the UI never takes its hue.               |
| Colour      | K-C2 the picture is pastel and cool                                   | Any user photo is graded cool and pale (hue fade).                |
| Imagery     | G-M1 images are domain content people upload                          | The photos are the swims.                                         |
| Imagery     | G-M4 fog makes any user photo fit                                     | Warm sunset or grey lake, all melt into the same grey.            |
| Imagery     | V-I2 one accent takes a large part of every screen                    | The last swim photo is that accent.                               |
| Layout      | K-L1 the picture is the full ground of every screen                   | Here the picture is the user's, not the designer's: the new idea. |
| Layout      | K-L2 titles and numbers stand directly on it                          | Readings stand on the swim they describe.                         |
| Surfaces    | K-S2 one white drawer with a handle holds the list                    | The journal list rises over the photo.                            |
| Surfaces    | V-S3 plain text (the swim note) stands without a plate                | Notes read like a diary line.                                     |
| Controls    | K-K2 object actions: round white buttons, label under                 | Safety checks and photo actions.                                  |
| Controls    | V-K4 navigation: circles inside one pill, current filled black        | Nav floats on the photo as one object.                            |
| Functional  | G-F1 physical picker: lens over a hairline ruler                      | Logging minutes and temperature.                                  |
| Functional  | V-F1 instruments from simple marks                                    | 100 ticks for the season, a stripe for streaks.                   |
| Type        | V-T1 geometric sans: display light, titles medium, body in quiet grey | Light type on a fogged photo.                                     |
| Type        | V-T2 large numbers light                                              | Big readings stay quiet.                                          |
| Transitions | K-X1 smooth: the picture melts into mist                              | The fog is the system.                                            |

Source counts: Gallery 8, Cloud 8, Verdant 6 (22 traits; max 36%).

Rejected on conflict: K-M2 the picture is never the user's (dropped; replacing it with the user's photo is the idea), G-L1 image keeps page padding (vs K-L1 full ground), V-C1 one hue (vs G-C1), V-X1 hard edges (vs K-X1).

## Colour

Tint hue 240 (cool), chroma ≤ 0.008. Spot: tow-float orange.

| Step       | Hex       | Job                                    |
| ---------- | --------- | -------------------------------------- |
| ground     | `#e4e8eb` | fog, where the photo dissolves         |
| raised     | `#eff2f5` | segment, light button                  |
| white      | `#ffffff` | drawer, round object buttons           |
| ink        | `#0d1012` | titles, the one primary pill, selected |
| text-quiet | `#6b6f73` | descriptions, notes                    |
| text-soft  | `#9da2a6` | greeting, decimals                     |
| hairline   | `#cfd3d6` | outline chips, ruler                   |
| spot       | `#f9601f` | the tow-float icon only                |

## Imagery

- Role: domain content. The user's last swim photo is the ground; designer photos only for empty states and spots, treated the same.
- Type: phone snapshots of swims, sea and lake, any light.
- Keeping in line: hue fade (saturation to 22%, cool multiply, 28% toward ground) then a fog fade to `#e4e8eb` at the bottom and behind text.
- Queries: "woman swimming sea", "swimmer sea", "lake swimming", "sea surface ripples" (Openverse, cc0/pdm).

## Signature components

1. **Last-swim ground** — the photo behind Today and Journal, with date, place and minutes standing on its fog.
2. **Safety check** — round white buttons "Told someone", "Float", "Exit point"; the float icon is the only orange on screen.
3. **Temperature lens** — a lens slides along a hairline ruler, °C in light figures.
4. **Hundred ticks** — 100 short ticks; swum ones in ink, the coldest one taller.
5. **Journal drawer** — one white drawer, rows as photo thumbnails fogged at their bottom edge.

## The design book must

- Open on a full-width user photo, cooled and fogged, with only date, place and one number on it.
- Show the same raw photo beside its graded version.
- Use no plate except the white drawer and round buttons.
- Show orange once per section, on one small icon.

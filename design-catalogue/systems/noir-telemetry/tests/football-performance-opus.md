# Test: noir-telemetry × football-performance (opus)

Canvas: https://claude.ai/artifact/Xu95jHLgBUmbvt4eDxbDNE ("noir-telemetry — football-performance — opus").
Brief: `design-catalogue/briefs/football-performance.md`. Club, players and numbers are invented.

## TL;DR

Six screens for "Kestrel Vale AFC": sign in, live session, player week review, plan and trend (desktop, fluid at 1440), and live session and player on a 390×844 phone. Both themes on every artboard, toggled by a button in its header. The structure comes from the coach's tasks, not from the reference screens; the system supplies the look.

## Structure, from the tasks

| Task                                         | Screen                | What stands in the centre                                                                                           |
| -------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| During a session, see who is at risk and act | Live session          | "Needs you now": one group plate, critical item open with facts and two actions, attention items folded to one line |
| Same, at the pitch side                      | Phone · in session    | The critical player's card with full-width actions, then the folded alerts, then the squad list                     |
| After a session, review a player's week      | Player · week review  | ACWR stat card and the 7-day load columns against plan; check-in table; tomorrow's load set right there             |
| Before a session, plan load per player       | Plan · load and trend | One row per player: ACWR now, a tick scrubber for planned load, projected ACWR on Friday                            |
| Review the squad's trend                     | Plan · load and trend | Squad weekly load stat card, ACWR distribution counts                                                               |
| Sign in                                      | Sign in               | Frosted form over a dark training photo                                                                             |

- Live session order is time first (session timeline with drills as milestones and a glowing "now" pill), then place (pitch with live positions of the current drill), then action (alerts), then the full squad table sortable by risk, position or number. The alerts sit beside the pitch so the coach reads "who" and "where" in one look.
- The pitch plate is the system's "object" view: a ready pitch line drawing with markers in dashed halo rings, a fading trail behind the critical player and a leader line to his card. That replaces the source's map without copying its layout.
- Plan and trend share one screen: planning a day only makes sense against the squad's trend, and the brief allows "a planning or trend view".
- Player view puts the next action (tomorrow's load, with the projected ACWR changing as the scrubber moves) on the same page as the review, because a review that ends in nothing to do is a report.

## Copy check against the references

- `1-screen.webp` is a left column of stacked cards, a full-bleed map on the right, title over the map, panels along the bottom. None of the six screens has that arrangement: the live session reads top to bottom (title, timeline, pitch beside alerts, table), and no screen is a map.
- Card anatomy (title, ↗ action, headline value), the alert group with a vertical hairline joining sub-facts (`3-alerts-group.png`), the stat card with a stroke chart bleeding off both edges and a dashed line (`4-stat-cards.png`), and halo markers with leader lines (`5-markers-status.png`) are reused as system parts, filled with football content.

## The system applied

- Motifs on every screen: stroke (charts, ticks, scrubbers, pitch, dividers), fade (pictures dissolve into the ground through a mask; timeline ticks past "now" fade; ACWR line grey then orange then red), split emphasis (`1.58` with grey `58`, two-line headings with a grey first line, sentences bright then grey), frost (every plate over a picture), signal (status only as dots, short segments, values and one glow).
- Tint: neutrals pushed toward cool blue, hue 250, chroma ≤ 0.01. A green tint was rejected because it would muddy the operational green on a football product where grass is everywhere.
- Dark: ground L 0.135, plate L 0.215 at 60% with 32px blur, lift L 0.27, text 0.96 / 0.64, lines at 15%, 38% and 92%.
- Light: ground L 0.962, plate white at 60%, lift L 0.925, text 0.17 / 0.50; pictures lifted to light grayscale at 55% opacity; glow becomes a cool grey shade.
- Status colours keep the source hexes for dots, lines and glows in both themes. In light the status **text** uses darker steps of the same hues (oklch L 0.50–0.57), because #F39444 and #5EC557 as text on L 0.96 fail 4.5:1. Meaning is unchanged.
- The Plan screen has no picture, so its plates are solid lifted fills, as the system requires ("don't frost a plate over flat colour").
- Type: Helvetica Neue Light/Regular/Medium with Hanken Grotesk loaded as the cross-platform fallback; numbers always Light, units small and grey. Letter badge: a circle with the position letter (G, D, M, F) and the shirt number.
- No border on any plate; the only edges are hairlines inside plates and dashed guides.
- Theme toggle: a round frosted button in every header; it swaps a class on the root, the `theme` tweak sets the starting theme.

## Pictures

Downloaded into a new empty folder, uploaded to the canvas as assets, graded in CSS (grayscale, darkened for dark, lifted for light), never drawn.

| Use                                                               | File                                                                         | Licence                       |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| Live session backgrounds (desktop and phone)                      | Campo Juventus (Turin, Italy), aerial                                        | Public domain, unknown author |
| Sign in background                                                | Netherlands women's national football team training in 2018 III, Emma Coolen | CC0                           |
| Player media card and phone player header (cropped to one player) | Netherlands women's national football team training in 2018, Emma Coolen     | CC0                           |
| Pitch on the live session                                         | Soccer Field Transparant.svg, Inkwina                                        | CC BY-SA 4.0                  |

- The pitch drawing has a green fill; it is shown in grayscale (inverted in light) so the system's "colour is only signal" holds. That is grading an image, not redrawing it. Credits are on a sticky note on the canvas.
- Rejected after viewing: `Campo_da_calcio.svg` (green, Italian dimension labels), `Outline-body-aura.svg` (rainbow aura), a CC0 photo of a schoolboy match (children, wrong subject).
- No body-map drawing: nothing found fit the line-art rule, and the screens did not need one.

## What was checked

- Every artboard's script runs: a Node script built each `Component` with a stub `DCLogic`, called `renderVals()`, and confirmed that every `{{hole}}` in the markup resolves and that tags balance. Result: no missing holes and no unclosed tags in all six.
- Chart series printed and read: the ACWR series leaves 1.3 on day 23 and 1.5 on day 25 of 28; the HSR peak under drill 4 is 149–179 m/min against a 120 plan, matching the copy.
- Numbers agree across screens (Okafor 1.58, 131%, 612 m, 5.9 h sleep; plan total 4,080 AU for the 12 rows shown).

## What was not checked

- The canvas was not opened or rendered: the Design type's instructions forbid verifying unless the person asks. Light theme contrast, blur over the pictures, the rotated pitch image and the phone scroll are unseen.
- Phone-width behaviour of the desktop pages (they use wrapping flex and `overflow-x` table boxes) is unseen.

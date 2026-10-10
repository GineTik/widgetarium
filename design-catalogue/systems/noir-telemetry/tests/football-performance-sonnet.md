# noir-telemetry x football-performance (sonnet)

Canvas: https://claude.ai/artifact/C5FS3tfS9LaAVKorNPGxFy

## Product structure (decided before the look)

Club: Northmere Athletic (invented). Six artboards, one per task.

| Task           | Screen                            | Centre                                                                                                                  | Why                                                                                                                                                   |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in        | `SignIn`                          | night pitch picture, two-line headline, sign-in plate                                                                   | the only screen with no data; the picture carries the atmosphere                                                                                      |
| During session | `Main` (desktop), `PhoneSession`  | **load ladder**: every player's session load against plan, ordered by injury risk                                       | the decision is "who do I act on", so a ranked list with ticks beats a map; the pitch photo is a side card that shows where the flagged players stand |
| After session  | `Player` (desktop), `PhonePlayer` | the ACWR (acute to chronic ratio) number and its 28-day line, a 7-day card-tab strip                                    | one number answers "is he safe"; the week strip answers "how did we get here"                                                                         |
| Before session | `Planning`                        | per-player plan control (marker with plus/minus) with the projected ratio recomputed live; squad 8-week trend beside it | planning is "what happens to his ratio if I cut Thursday to 70%", so the control sits next to its consequence                                         |

Copy check against the references: the source is a left card column plus a full-screen map. Here no screen has a map; the in-session centre is a table-with-ticks and the pitch photo is a 16:9 card on the right. Region order and panels differ. Passed on structure.

## System applied

- Ground, plate, text, line steps from the colour algorithm, both themes, toggle on every artboard (state, default via `theme` tweak). Status colours kept small: dots, tick runs, values, one glow on the critical marker and the accented "Recommended" card. Light theme uses darker status variants for 4.5:1 text; meaning unchanged.
- Motifs: stroke (charts, ticks, dashed guides and halos, leader line), fade (chart left edge masked, picture dissolves into ground), split emphasis (every sentence, `1.78 ACWR`, `91 %`), frost (all plates, no borders), signal (dots, ticks, orange chart segment).
- Safe band 0.8 to 1.3 drawn as the light band with dashed edges; out-of-norm segment orange; end point red.
- Numbers Light/ExtraLight and large, units small grey. Font: Helvetica Neue first, Hanken Grotesk as the loaded fallback.
- Heading size is the screen title; the sign-in headline uses the 96 to 128 hero range.

## Pictures

Found, not drawn. Downloaded to `/private/tmp/claude-501/-Users-denissevcuk-Projects-Obsidian-Plugins-widgetarium/22f130da-0f48-4b13-a98f-7ad9a01d6412/scratchpad/noir-telemetry-football-performance-sonnet/` and uploaded as canvas assets:

- `training-unsplash.jpg`: "Training (Unsplash)", Wikimedia Commons, CC0. Floodlit pitch at night under a mountain. Page background on four screens; graded to grayscale and darkened by CSS filter (lifted for light), fogged into the ground.
- `pitch-aerial.jpg`: "Campo Juventus (Turin, Italy)", Wikimedia Commons, public domain. Vintage aerial of a pitch. Graded grayscale; markers in dashed halo rings sit on it (code draws only markers and the leader line).
- `stadium-night.jpg` (CC0) was downloaded and looked at but not used: a recognisable person sits in the foreground.

The player portrait is a labelled placeholder (`[player photo: club upload]`) in a dashed ring; no real face stands in for an invented player. The shirt number is a type treatment (outline numeral), not an illustration.

## Invented data

22 on pitch, 13 listed. ACWR bands: above 1.5 critical, 1.3 to 1.5 or below 0.8 attention, else in range. Moreau 1.78, Rehak 1.52 critical; Kessel 1.41, Sall 1.34, Iyer 0.71 attention. Plan caps (70/75/85%) feed a projection formula in `Planning`.

## Behaviour that works on the canvas

Theme toggle everywhere; ladder row and tabs select a player and move the leader line, callout, ACWR card and chart (`Main`); day tabs (`Player`, `PhonePlayer`); day tabs and plus/minus plan control with live projection and cap count (`Planning`).

## Not checked

Nothing was rendered or screenshotted: the design type says not to verify unless asked. Unverified: that `noir.css` loads as a relative support file; that the grayscale and light-theme filter values look right on the pictures; text overflow and artboard heights (page heights are estimates, set generously); that dc runtime accepts `style="{{...}}"` whole-attribute holes and `onClick` on sc-for items as authored. In `Planning` the projection formula is the same for Friday and Saturday tabs, only the defaults differ.

# noir-telemetry × football-performance-full · opus-high

Canvas: https://claude.ai/artifact/RYjefAaTzWPeZLuLKBxvmQ · "noir-telemetry — football-performance-full — opus-high"

## TL;DR

A ten-screen coaching product for an invented semi-pro club (Kestrel Vale FC), each screen built once as a fluid page and shown on the canvas four ways: desktop dark, desktop light, phone dark, phone light. Empty, loading and error states for every screen sit on one sheet, desktop and phone. Every picture is a CC0 Commons photo graded by the system's rule; nothing is drawn.

## Structure, from the tasks

| Task in the brief                                   | Screen                                         | What stands in the centre                                                                                |
| --------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Sign in, recover a password                         | Sign in (+ recover, link sent, wrong password) | the form plate over a floodlit-pitch photo                                                               |
| During a session: who is overloaded, act on it      | Live                                           | squad load table (each row a stroke against a dashed plan) and an "Act now" group with actions           |
| Before a session: drills and load per player        | Plan                                           | drill sequence with a proportional strip; per-player targets against their 4-week average                |
| After a session: planned against what happened      | Review                                         | three stat cards, drill-by-drill and per-player deviation tables, a note that carries into the next plan |
| One player: week, history, injuries, return to play | Player                                         | a return-to-play timeline (6 stages, "now" pill, exit criteria)                                          |
| Squad trend over the season                         | Season                                         | squad ACWR across 15 weeks against the 0.8–1.3 band                                                      |
| Physio notes                                        | Medical                                        | cases list beside a note composer and a threaded history                                                 |
| Squad, vests, staff notifications and settings      | Club: Squad · GPS vests · Staff and alerts     | table + add form · vest grid + faulty-vest card · alert rules + staff + my notifications                 |

Navigation: a frosted bar of links on desktop (Live, Plan, Review, Players, Medical, Season, Club); on phone a frosted bar of six round icons at the bottom, with Season and Club behind "More". Links between artboards work in Play.

## Decisions and why

- **One file per screen, wrappers for the other three views.** `LiveLight`, `PLive`, `PLiveLight` each `<dc-import>` `Live` with a `theme` prop at a different frame width. The phone layout is the same page answering a container query on `.nt` (≤720px): top nav hides, the tab bar appears, plates stack, the "Act now" group moves above the table. One source of truth per screen instead of four drifting copies; the phone is a real responsive layout, not a redraw.
- **Theme toggle on every screen** (sun/moon button, state in the component) plus a `theme` tweak. Both themes come from one token set in `noir.css`, written per the colour algorithm: ground L 0.135 / 0.962, plate ground+0.08 at 60% with 32px blur, lifted +0.06 / −0.03, text-primary 0.96 / 0.17, text-secondary 0.64 / 0.50, lines at 14–36% / 88–92%.
- **Tint: navy, hue 255, chroma ≤ 0.012.** Training happens at night under floodlights; a green tint would have competed with `operational` green, which must stay a signal.
- **Status mapping.** critical = needs action now (HR ≥ 95% max sustained, load ≥ 120% of plan, injured, receiver lost); attention = deviation (HSR over target after injury, slow HR recovery, ACWR outside the band, vest without signal); operational = fit, on plan, online. The source hexes are kept for dots, lines and glows; in light theme status _text_ uses darker inks (#D32F2F, #B25E17, #2D8429) because #F39444 on white is about 2.3:1.
- **Metrics are the ones a semi-pro staff actually reads**: session load in AU (RPE × minutes calibrated to vests), high-speed running, top speed, HR % max, ACWR. Numbers cross-check between screens (Tuesday: 412 AU at minute 47 on Live → 712 of 655 AU in Review; Ryan Cole 128% live → +28% in review → capped at 60% in Thursday's plan).
- **The accented card (glow) is a state**: the critical alert, the selected treatment case, the faulty vest, the current RTP stage, the hot drill.
- **Pictures under every page.** Four of the ten pages were first built flat (solid plates, no picture). A flat page loses Frost and Fade and drops below the system's four-of-five-motifs floor, so all pages now carry a graded photo under heavy fog.
- **No body diagram, no pitch drawing.** The only PD/CC0 pitch SVGs on Commons are green and labelled in Italian/Czech; the only CC0 body outlines are a rainbow aura and a labelled diagram. None works "as it is", and tracing is forbidden, so injuries are stated in words and the player photo is a labelled placeholder (`[player photo · graded to grayscale, fading into the plate]`).
- **States as one sheet** (`States`, rendered at 1440 and at 390): a row per screen, Empty · Loading · Error, each written for the situation (no session running / 14 of 18 vests found / receiver lost, vests buffer). Loading is breathing ticks and a progress meter, never a sliding shimmer, per the motion rule.

## Copy check against the references

- `1-screen`: the source is a left column of object cards beside a full-screen map with a bottom table. No screen here has a map, a left card column or a bottom table; Live is header → drill timeline → load table + alert group.
- `3-alerts-group`: its grouping grammar (count dots, hairline thread, fold to one line) is reused in "Act now", Injuries and the V14 card — as a component, not a screen layout.
- `4-stat-cards`: the stat-card anatomy (huge light number, split sentence, bleeding stroke chart, corner pill) appears in Live, Plan, Review and Season with this product's numbers.
- `2-object-cards`, `5-markers-status`: line-art objects and map markers are not used; halo rings appear only as status markers (V14, sent-link confirmation, RTP stages).

## Pictures

Downloaded to the scratchpad folder `noir-telemetry-football-performance-full-opus-high/` with `credits.json`; graded copies (grayscale, 18% of the original saturation kept, navy-tinted, dark and light versions) uploaded as canvas assets.

| File                                                   | Used on                    | Credit              |
| ------------------------------------------------------ | -------------------------- | ------------------- |
| Drone aerial view of the soccer stadium (Unsplash).jpg | Live, Review, Squad, Vests | Liane Metzler, CC0  |
| Soccer at night (Unsplash).jpg                         | Sign in, Season, Staff     | Abigail Keenan, CC0 |
| Training (Unsplash).jpg                                | Plan, Player, Medical      | Mahkeo, CC0         |
| Small soccer goal on a foggy field (Unsplash).jpg      | States                     | Glen Carrie, CC0    |

Downloaded and rejected: three pitch SVGs (green fill, foreign-language labels), two body SVGs (aura colours, label leaders), a crowded stadium photo (reads as a top-flight club, not semi-pro).

## Checked

- Every artboard's logic class runs in Node for both themes, every `{{hole}}` outside a loop has a value, `data-props` parses as JSON, tags balance (`check_boards.mjs` in the scratchpad). The checker was broken on purpose three ways (removed a closing tag, dropped a returned value, corrupted the JSON) and flagged all three.
- Cross-screen numbers, vest assignments, staff names and squad size were read against each other and four contradictions fixed.

## Not checked

- **Nothing was seen rendered.** Claude in Chrome was not connected and the built-in browser has no claude.ai sign-in, so the canvas, the `<dc-import>` wrappers, the container-query phone layout, `backdrop-filter` over the photos and contrast on the frosted plates are unverified.
- The riskiest assumption is that `<dc-import>` passes `theme`/`view` and that the child renders inside the wrapper's frame so the container query sees 390px. If it does not, the 37 wrapper boards show the dark desktop page or nothing; the 11 source boards are unaffected.
- Contrast was reasoned from the token lightness values, not measured.

# Squad performance v2 — Noir Telemetry test

Canvas: https://claude.ai/artifact/Emc8J2jccsG19njGXCNwtP ("Noir Telemetry — squad performance v2")

## Product

Harrow Vale FC (fictional, semi-professional, sixth tier) — a performance centre for the coaching staff: head coach Tom Reilly, sports scientist Priya Nair. GPS vests feed live load per player during training. Desktop in the office and on the bench laptop, phone at the pitch side.

## Tasks → screens

| Task                                     | Screen                         | What it must answer in one look                                             |
| ---------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| Sign in                                  | Sign in (+ error state)        | which club, who, why it failed                                              |
| During a session: who is overloaded, act | Live session (desktop + phone) | where we are in the session, who passed their planned load, what to do now  |
| After: review a player's week            | Player week (desktop + phone)  | is this player's week safe, what drove it                                   |
| Before: plan load per player             | Plan (desktop)                 | next five sessions × squad, who is planned above their ceiling, squad trend |

## Structure and why (decided before the look)

- **Live session is centred on the session clock, not on a map or a list.** A coach's question during training is "how far into the plan are we, and who has already used their dose". So the top region is the whole session as a timeline of drills with "now" in it; time is the spine. The pitch photo is the ground (the system's rule), markers show where the flagged players stand, because a coach shouts at a position, not a row. The right column is a **load ladder**: every player sorted by % of planned load, so the overloaded rise to the top by themselves. The **decision dock** at bottom-left holds only actionable items, each with its action buttons (sub out, move to recovery drill, change the drill) — acting is the task, so actions are not hidden behind ↗.
- **Player week is a page without a picture**: a sparse grid. The week's load chart is the largest plate because "is the week safe" is the first question; the acute:chronic ratio is the headline; wellness and the drill breakdown explain it. The body outline is a labelled placeholder.
- **Plan is a matrix**: players × next five sessions. The planning act is per-cell, so the matrix is the main plate; a squad trend stat card above gives context.
- **Phone**: pitch keeps the top, the now-strip of the timeline sits on it, flagged players with their actions stack under, round-icon frosted nav at the bottom.

## Look by the algorithm

- Tint: navy, hue 250, chroma 0.010–0.014 on every neutral step.
- Dark: ground oklch(0.15 0.012 250); panel oklch(0.24 0.012 250 / 0.62) + blur 28px; text-primary L 0.97; text-secondary L 0.60; hairline text-primary at 15%; glow a warm-white radial.
- Light: ground oklch(0.97 0.008 250); panel white at 70% + the same blur; text-primary L 0.17; text-secondary L 0.53; hairline at 16%; glow a cool-grey radial shade. Pitch picture inverted to light grayscale (separate grade, not a CSS invert of the page).
- Status colours fixed (#FF4747, #F39444, #5EC557), only as dots, ticks, chart segments and values.
- No border on any plate.

## Pictures

| Spot                                      | Source                                                                                                            | Licence                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Pitch ground (all screens with a picture) | "Drone aerial view soccer stadium", rawpixel via Openverse (Wikimedia origin), `noir-squad-stock-2/p3.jpg`        | marked CC0/PDM by Openverse                                                              |
| Grading                                   | PIL: colour ×0.12, contrast 1.1, brightness 0.42 (dark); grayscale invert, contrast 0.55, brightness 1.35 (light) | —                                                                                        |
| Body outline on player week               | placeholder `[outline drawing: athlete, front view — hamstring region tinted]`                                    | Wikimedia "Muscles front and back.svg" fits but is CC BY-SA 4.0, not CC0/PD, so not used |
| Coach / player portraits                  | none, initials only                                                                                               | —                                                                                        |

Code draws only data and interface geometry: load charts, tick bars, timeline ticks, player markers and a selection ring on the photo.

## Copy check

See the result section at the end, written after the screens were rendered.

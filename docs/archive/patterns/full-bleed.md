# Full-bleed

One object given the entire window, with chrome hidden until summoned.

## The shape it suits

A single object under **continuous consumption or manipulation**, where every pixel of chrome is a
pixel of loss.

Material enumerates the cases: "playing a game; watching a movie; video calls; creative
applications". Apple: "consider offering a full-screen mode if your experience lets people play a
game; view media like videos or photo slideshows; or perform an in-depth task that benefits from a
distraction-free environment."

## Take it when

- Attention belongs to one object for a stretch of time.
- Neighbouring content would only compete.

## Leave it when

- **Anything needs its neighbours visible.** Comparison, navigation, context — all die here.
- **The object is not consumed continuously.** A form is not read like a film.

## Regions

| Region            | May hold                                                                                                                                               | May not hold                                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Content           | The single object, edge to edge                                                                                                                        | Navigation to peer objects — leaving is the exit                                                                                                                                                       |
| Summonable chrome | Essential controls revealable by a familiar gesture — "tapping, swiping down, or moving the cursor to the top of the screen"; an always-reachable exit | Controls that are essential but hidden — "keep controls visible when they're essential for navigation or performing tasks"; media playback controls must be "persistently available or easy to reveal" |
| HUD               | Inspector info over visual content, dark and translucent, small — "don't let a HUD obscure the content it adjusts"                                     | Standard controls — "most system-provided controls don't match a HUD's appearance"; a HUD with no reason to be there                                                                                   |

## Width

None. It is the only pattern with no minimum, and the canonical fallback for every other pattern at
compact width.

## Costs

Total loss of orientation — the user cannot see where they are or what is adjacent. Re-entry needs
handling: "after people switch away from your full-screen experience, help them resume where they
left off when they return."

## Seen in

Kindle (reading) · YouTube theater and full screen (media) · Keynote presentation mode (authoring) ·
Zoom meetings (conferencing).

## Composition

Holds **nothing** structural — a summonable toolbar and a HUD are its limit. Nests inside any
pattern's main region as a temporary state.

Its ceiling is Apple's modality rule: "take care to avoid creating a modal experience that feels like
an app within your app."

## In a board

This is a board note with `widgetarium: { kind: screen }` and `mode: expanded` — the board takes the
whole page, and Obsidian's own chrome is the only thing above it.

Inside a board, a single tile filling the `keep` column with both sides folded is the same idea at
one level down.

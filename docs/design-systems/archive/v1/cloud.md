# Cloud

Source: three phone screens of a finance app (home with balance, analytics, cards).

## Idea

**Calm through a pastel sky.** Every screen stands on an abstract photo of soft clouds. That picture sets the colour of the whole app: pale blue, mist, a touch of warm pink. Numbers, charts and text sit **directly on the sky**, with no plates. Minimalism here exists so the sky stays visible. A screen gives a title, an icon, a number, and leads the person on to the next screen rather than explaining everything in cards.

## Palette

| Role                              | Approx.                                             |
| --------------------------------- | --------------------------------------------------- |
| Ground                            | cloud photo, pale blue → mist `#DCE8EE` → `#F3F6F7` |
| Sheet (lists only)                | white `#FFFFFF`                                     |
| Text                              | near-black `#0B0B0C`                                |
| Secondary text, decimals          | grey `#8A9297`                                      |
| Owned-object bloom                | blurred peach-pink, from the photo                  |
| Value tag in charts               | black pill `#0B0B0C`, white text                    |
| Primary action — one per app flow | black pill                                          |
| Delta up / down                   | green `#1F7A4D` / red `#B4232C`, small text only    |

- Calm comes from pastel tones of the photo, not from grey.

## Layout

- The sky photo is the background of the whole screen, always visible.
- Titles, balances, charts, period selectors stand on it with **no card**.
- **The only plates:**
  1. the owned object (the bank card), which carries its own image and bloom;
  2. a list that must be read, which comes as a **drawer**: a white sheet with a grab handle rising over the sky, expandable to full screen.
- One sheet for a whole list, never one card per row.

## Controls

- Almost no accent buttons. Most actions are quiet: semi-transparent, sometimes blurred, small text with an arrow ("Send ↗", "Received ↙").
- Round white action buttons with an icon and a label under them (Show PIN, Card Details, Freeze Card).
- **One** black full-width pill only where a real action completes (Add to Wallet). A screen with no such action has no primary button.
- Bottom tabs: plain icons with labels on white, current one dark, no pill behind.

## Charts

- Hairline grey bars or thin crossing lines straight on the sky.
- One highlighted value: a solid black bar or a dot, with its value in a black pill.

## Type

Geometric sans, light. Big amounts in light weight; decimals grey (`$40,500.80` with `.80` grey). Small labels regular grey.

## Signature components

- **Sky ground** fading to mist.
- **Glass bank card** with a peach-pink bloom, stacked over ghost copies of the other cards.
- **Hairline bar chart** with one black bar and a black value pill.
- **Transactions drawer** with a handle.

## Density

Low, but not empty: the space is there to show the sky.

## The design book must

Stand on the cloud photo from top to bottom. Text, palette, type scale and charts sit on the sky without plates. Plates appear only for the owned object (card) and for a list in a drawer. No grid of white cards — that breaks this system.

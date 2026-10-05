# Design system

This file is yours. The plugin wrote it once and never writes it again.

**How it works.** Every rule is one line starting with its id in bold, like `- **B1 · Primary is
black.** …`. Before showing a design, the agent runs `widgets.mjs rules <app>`, answers every rule
yes or no against the picture of its canvas, and redraws until all are yes. So:

- **Change a rule** by editing its line; **drop one** by deleting it.
- **Add your own** under "Your rules" with a new id, `- **Y1 · …**`.
- **One app may differ**: write `.widgetarium/apps/<app>/design-system.md` in the same form. A rule
  there with the same id replaces this one; a new id adds to it.

Tables and text without an id are reference, read but not checked.

## The style in one line

**Quiet and strict**: white page, grey plates, black type and black primary buttons; imagery carries
the colour; one accent, purple, only where progress or a key value needs it.

## Pages

- **P1 · One job per page, named by it.** A summary page shows a few rows of another page and links
  onward ("See all ›"); it never manages them.
- **P2 · A list and the record it opens are two pages**, reached by a press and left by Back. A side
  panel holds a record only when reading beside the list is the job (mail, a reader).
- **P3 · At most one hero and three sections on a page.** A fourth means the page is two pages.
- **P4 · One navigation for the whole app**, the same on every page, showing where the person is.

## Width

- **W1 · A list page is a centred column of about 820px**: transactions, an inbox, a feed.
- **W2 · A summary with its parts is two columns** on a wide screen: the summary left (number,
  chart, primary action), the parts right as a 2-column grid.
- **W3 · Nothing stretches to the window edge.** A dashboard is at most about 1280px, centred.

## Something to look at

- **F1 · The home page and an opened record each have one focal point**, taken from the menu below.
- **F2 · A working list has no hero**; its rows carry a logo, a face or a tinted icon at their start
  and are grouped by day or kind.
- **F3 · Data as art is drawn with the kit's charts**: a soft area under a line, a dotted pace line,
  a few bars. No hand-made coloured strips.
- **F4 · Progress bars are black, red when over**; a category shows its colour only in its icon or
  dot, the same colour everywhere.
- **F5 · A page atmosphere is a page setting**, never painted by a widget.

| The page shows                                               | Its focal point                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| records that have pictures (places, books, people, products) | **their photos**: a hero, photo cards, thumbnails                       |
| one thing the person owns or tends (an account, a habit)     | **that thing as an object**: a card with art, a tile with its own blend |
| numbers over time or by kind                                 | **the data as a chart**: a soft area under a line, a heatmap            |
| rows about shops, services or people                         | **their logos or faces** at the start of every row                      |
| a plan, a review, a life area                                | **a calm photo** as the hero                                            |

## Shapes

The kit's 3D shapes (`Shape`, the 35 Material 3 Expressive forms) are the signature of this system:
quiet plates and black type, with small glossy objects that carry the colour.

- **A1 · Every page has at least one shape**, where it means something: on a key number, an area's
  tile, a record without a picture, an empty state.
- **A2 · Each kind of thing owns one tone** and wears it on every shape, dot and chart line.
- **A3 · An empty state is one large shape with two or three small ones around it**, its title and
  one action under it.
- **A4 · Art is drawn with the kit's `Shape`**, never hand-made gradients in a widget's sheet.

## Imagery

- **I1 · One kind of imagery per app**, chosen from the table by what the app is about.
- **I2 · Text on a photo or art stands on a dark fade** at its bottom edge.

| The app is about                | Imagery                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| places, things, people, media   | real photos, one per record                                   |
| a life area or a plan           | calm photos: landscapes, interiors, texture                   |
| routines and progress           | abstract art: soft colour fields, one blend per item          |
| money, numbers, work            | no imagery: big numbers, charts, a card-shaped object at most |
| play, kids, music, a loud brand | bright abstract colour                                        |

## Buttons and badges

- **B1 · Primary is black** with white text, one per page, where the eye ends; white on a photo.
- **B2 · No purple buttons** unless the person asked for colour; purple marks progress or one key value.
- **B3 · A card's one action is a round icon button on its corner**, top or bottom right.
- **B4 · Quick actions are round buttons with a label under each**, three to five.
- **B5 · Secondary actions are grey pills or text links** ("See all ›").
- **B6 · Badges are grey**, frosted on a photo; colour only when the person must act; one per row.

## Forms

- **C1 · Show the choices instead of hiding them.** Up to about eight options are chips or a radio
  list on the page; a dropdown only for a long list (countries, time zones).
- **C2 · The value the form is about is drawn large**: an amount as a big number, a date as a
  calendar, a colour as swatches — never a plain one-line field.
- **C3 · Several choices from a set are chips**, picked ones filled grey with black text.

## Details

- **D1 · A badge can be an icon and plain text** with no fill (a green arrow and "+3.01"), not
  always a pill.
- **D2 · Show how things connect**: a thin line from a value to what it describes, a dot on the
  thing it marks, a line between steps of a timeline.
- **D3 · A state changes the icon**: a spinner for loading, a check when done, a dot while waiting —
  the same place, a different mark.
- **D4 · Things may overlap inside one widget**: a card over a photo's edge, a button half outside a
  card, avatars over each other.

## Type

- **T1 · One display element per page** (the hero title or the page's one number), 3–3.6× body.
- **T2 · Values black, labels grey and small**; counts sit beside headings in grey.

| Step    | Use                                     | Size                              |
| ------- | --------------------------------------- | --------------------------------- |
| Display | the hero title or the page's one number | 3–3.6× body, tight tracking, bold |
| Title   | a page or an opened record              | 2× body                           |
| Section | a region's heading                      | 1.4× body                         |
| Body    | rows, text                              | the host's size                   |
| Label   | meta, captions, counts                  | small, grey                       |

## Plates and placement

- **L1 · A plate is a choice**: rows that belong together share one grey plate; a hero, a photo card,
  a heading or quick actions stand on the page.
- **L2 · Adding is always possible** where a list can grow: a black "Add …" at the top right, or a
  round "+" in the quick actions.
- **L3 · Every list has its empty state**: what will appear and the one action that fills it.
- **L4 · Nothing is a dead end**: Next, Skip, Cancel or Done is always offered.
- **L5 · Every dialog is drawn.** Each press that opens something — add, edit, delete, a
  confirmation, a warning, a picker — has its own frame on the canvas, named `<Page> · <Dialog>`,
  drawn over its page. Nothing a person can open is left undrawn.
- **L6 · Every list that can grow can be added to from its page**, and the add dialog is drawn (L5).
- **L7 · Prefer an object to a bare value.** A key number stands on an object that means it — an
  account on a card, a goal in a ring, a person beside a face — not alone on the page.

## Text

- **X1 · Sentence case; a button says the verb** (`Add habit`, never `OK`).
- **X2 · Numbers carry their unit**, and their trend when they have a history.

## Your rules

Add your own here, each with a new id: `- **Y1 · …**`.

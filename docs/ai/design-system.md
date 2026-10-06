# Design system

This file is yours. The plugin wrote it once and never writes it again.

**How it works.** Every rule is one line starting with its id in bold, like `- **B1 · Primary is
the kit's primary.** …`, and may carry a `check:` line saying how it is held:

- `check: kit` — the kit's component makes the wrong thing impossible; nobody is asked.
- `check: measured` — `widgets.mjs rules <app>` measures the drawn canvas and names every frame that
  fails.
- no `check:` line — judged: the agent answers it yes or no against the picture of its canvas.

Before showing a design the agent runs `rules <app>` and redraws until every measured rule passes
and every judged answer is yes. So:

- **Change a rule** by editing its line; **drop one** by deleting it.
- **Add your own** under "Your rules" with a new id, `- **Y1 · …**`.
- **One app may differ**: write `.widgetarium/apps/<app>/design-system.md` in the same form. A rule
  there with the same id replaces this one; a new id adds to it.

Tables and text without an id are reference, read but not checked.

## The style in one line

**Quiet and strict**: white page, grey plates, the theme's type and the kit's primary button; imagery
carries the colour; one accent, purple, only where progress or a key value needs it.

## Page archetypes

Every page is one of five, and the archetype decides its width, its header and its hero. The page
widget draws `<Page kind="…">` from the kit, which lays all three; it never sets a width of its own.

| Archetype   | Width                                       | Hero                                                                          | Body                                                                           |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `home`      | 1040                                        | required: a greeting with the next action, a key number on an object, a photo | 3–5 overview sections, ≤5 rows each, then "See all ›"; an optional side column |
| `index`     | 800 for rows; `wide` 1280 for a table, grid | none                                                                          | search and filters in one row, then one collection                             |
| `record`    | 1040: main and a 320 side column            | its identity: face or picture, name, the key fact merged into a line          | main: timeline, notes; side: status, key fact, metadata                        |
| `dashboard` | 1280                                        | a row of key numbers                                                          | a grid of cards and charts                                                     |
| `form`      | 640                                         | none                                                                          | one column of fields, the action at the end                                    |

## Pages

- **P1 · One job per page, named by it.** A summary page shows a few rows of another page and links
  onward ("See all ›"); it never manages them.
- **P2 · A list and the record it opens are two pages**, reached by a press and left by Back. A side
  panel holds a record only when reading beside the list is the job (mail, a reader).
- **P4 · One navigation for the whole app**, the same on every page, showing where the person is.
- **PG1 · Every page names its archetype** with `<Page kind="home | index | record | dashboard | form">`.
  check: kit
- **PG2 · The width comes from the archetype**; a page widget writes no `max-w-*` or `mx-auto`.
  check: kit
- **PG3 · The header holds a title naming the job on the left and at most one primary action on the
  right.**
  check: kit
- **PG4 · Home has a hero; an index and a form never do.**
  check: kit
- **PG5 · At most five sections on a page**; a sixth means the page is two pages.
  check: measured

## Sections

- **S1 · A section owns its title, its count and its actions** (`<Section title count action>`); the
  widget inside it draws no title and starts at its first row.
  check: kit
- **S2 · An add stands in its section's header, on the trailing side**, never below the list.
  check: measured
- **S3 · At most two actions in a header**; the rest go in a `⋯` menu.
  check: kit
- **S4 · An overview section on Home shows at most five rows**, then "See all ›".
  check: measured
- **S5 · Space is laid by the page**: 40px between sections, 12px from a title to its content, 8px
  between rows. A page widget writes no gap between sections.
  check: kit

## Rows

- **R1 · A row is leading · title · one grey supporting line · trailing value** (`Row`, `RowText`,
  `RowSupporting`, `RowValue`); never a third line.
- **R2 · One fact, one place**: a state a summary already shows is not repeated as a badge in the list.
- **R3 · A badge is for the exception**: the same badge on more than a third of the rows is dropped,
  and the list is sorted by it instead.
  check: measured
- **R4 · Label and value are one phrase**: "48 days late", never "Last: 78 days · Rhythm: 30".
- **R5 · A row's icon stands level with its first line**, not with the middle of the row.
  check: kit

## Composition

- **C1 · No page is lists alone**: at least one thing that is not a list — a hero, a key number on an
  object, a chart, a grid of cards, photos.
  check: measured
- **C2 · At most two lists stacked in one column**; a third goes beside them, or into tabs.
  check: measured
- **C3 · Before drawing a list, say which of these shows it better: a chart, a timeline, a calendar,
  cards, faces, a map.** It is a list only when none does, and your message says why.
- **C4 · One focal point**: at most two big elements on a page.
  check: measured
- **C5 · A line of text holds at most 75 characters.**
  check: measured
- **C6 · An empty page shows one empty state**, never one per section.
  check: measured

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

- **B1 · Primary is the kit's primary button** (`variant="primary"`), one per page, where the eye ends; never a hand-painted black, which disappears in dark mode.
- **B2 · No purple buttons** unless the person asked for colour; purple marks progress or one key value.
- **B3 · A card's one action is a round icon button on its corner**, top or bottom right.
- **B4 · Quick actions are round buttons with a label under each**, three to five.
- **B5 · Secondary actions are grey pills or text links** ("See all ›").
- **B6 · Badges are grey**, frosted on a photo; colour only when the person must act; one per row.

## Forms

- **FM1 · Show the choices instead of hiding them.** Up to about eight options are chips or a radio
  list on the page; a dropdown only for a long list (countries, time zones).
- **FM2 · The value the form is about is drawn large**: an amount as a big number, a date as a
  calendar, a colour as swatches — never a plain one-line field.
- **FM3 · Several choices from a set are chips**, picked ones filled grey with black text.

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
- **L3 · Every page has its empty state**: what will appear and the one action that fills it (C6).
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

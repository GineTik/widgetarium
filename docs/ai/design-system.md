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

## App shell

The shell is what stands around every page: where the navigation lives and how the window is cut. It
is chosen once per app, **before any page is drawn**, from this table — the set Material 3's
canonical layouts, Apple's sidebar and split view and shadcn's sidebar blocks agree on — and written
in the app's own `design-system.md`.

| Shell                 | When                                                         | Drawn as                                                                                   |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `sidebar`             | 5 or more pages, at most two levels                          | the kit's `Sidebar` on the left, 240–280 wide, the current page marked; the page beside it |
| `rail + list`         | a collection opened one item at a time: mail, notes, records | an icon rail, a list pane beside it, the open item filling the rest                        |
| `tabs`                | 2–4 flat pages and nothing deeper                            | one row of page tabs over the page                                                         |
| `sidebar + inspector` | an editor or a canvas with the selected thing's properties   | `sidebar` with a pane on the right that follows the selection                              |
| `none`                | one tool, one page                                           | no navigation; the page is the app                                                         |

- **SH1 · The shell follows the table**, by the number of pages and how deep they go; `tabs` for
  five pages or more is the defect, never the default.
  check: judged
- **SH2 · The shell is one widget of the app's own** (`@<app>/shell`), with the pages' bodies in its
  slot; every page stands in it, so navigation is drawn once and is the same everywhere (P4). The
  canvas shows the shell holding each page, one screen per state; a page widget is never placed as a
  screen of its own, or every page is drawn twice.
  check: judged
- **SH4 · The shell is 1440 wide at most and its navigation is flush**: `Container width={1440}`,
  `<Sidebar surface="edge">` running its whole height at the shell's edge, a hairline on its inner side, never a card
  floating far from the window's edge and top. The body stands `gap-sections` from the hairline, the same space as between two sections, never touching it.
  check: judged
- **SH3 · A collapsed shell is still there**: a sidebar folds to an icon rail, never to nothing, and
  a narrow window turns it into a drawer opened from the page's own header.
  check: judged

## Page archetypes

Six archetypes are starting points, never templates. A page's body either draws `<Page kind="…">`
from the kit, which lays its width, header and hero, or builds its own structure inside the kit's
`Container` (width 640, 800, 1040, 1280, 1440 or `full`); it never sets a width of its own. The
shell stands outside the body in a `Container` of 1440 (SH4); the body fills the space beside the
navigation, in a `Container` of its archetype's width, or `full` for a `workspace`. Two pages of one app look alike only when they do the same job, and an app never
looks like another app because it was copied from it.

| Archetype   | Width                                       | Hero                                                                          | Body                                                                                         |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `home`      | 1040                                        | optional: a greeting with the next action, a key number on an object, a photo | 3–5 overview sections, ≤5 rows each, then "See all ›"; an optional side column               |
| `index`     | 800 for rows; `wide` 1280 for a table, grid | none                                                                          | search and filters in one row, then one collection                                           |
| `record`    | 1040: main and a 320 side column            | its identity: face or picture, name, the key fact merged into a line          | main: timeline, notes; side: status, key fact, metadata                                      |
| `dashboard` | 1280                                        | a row of key numbers                                                          | a grid of cards and charts                                                                   |
| `form`      | 640                                         | none                                                                          | one column of fields, the action at the end                                                  |
| `workspace` | `full`                                      | none: a toolbar over the surface                                              | one surface filling the body — a board, a calendar, a map, a table — that scrolls on its own |

## Pages

- **P1 · One job per page, named by it.** A summary page shows a few rows of another page and links
  onward ("See all ›"); it never manages them.
- **P2 · A list and the record it opens are two pages**, reached by a press and left by Back. A side
  panel holds a record only when reading beside the list is the job (mail, a reader).
- **P4 · One navigation for the whole app**, the same on every page, showing where the person is: the shell (SH2).
- **PG1 · Every page is drawn in the kit's `Container` or `Page`**; the structure inside is the
  design's own.
  check: kit
- **PG2 · The width comes from `Container` or the archetype**; a page widget writes no `max-w-*` or
  `mx-auto`.
  check: kit
- **PG3 · The header holds a title naming the job on the left and at most one primary action on the
  right.**
  check: kit
- **PG6 · A header is one block**: its title, the line under it, its filters and its action stand
  `gap-parts` apart; `gap-sections` is only between sections, and a page opens at its title, with no
  empty band above it. A status beside the title (a ring, a count) stands on the title's line.
  check: judged
- **PG4 · A hero is a choice, never a default**: one when a single thing should greet the person (a
  photo, a number, the next action); an index and a form never have one.
  check: judged
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

## Finish

What separates a product from a picture of one. Each is measured on the drawn canvas.

- **FN1 · Whatever looks pressable answers a press.** A button, a dashed drop zone, a day in a
  calendar, a card that looks draggable: it works, or it stops looking like it does.
  check: measured
- **FN2 · No holes.** No gap of more than 120px between stacked blocks, and none across more than a
  third of a row: a cover at one edge and its button at the other is a row with nothing in it.
  check: measured
- **FN3 · A highlight reaches its plate's edge.** A selected or hovered row in a plate lights up edge
  to edge, never inset by the plate's padding while the rows around it run full width.
  check: measured
- **FN4 · Stacked blocks share their edge.** A subtitle 4px off its title reads as a mistake, never as
  a choice.
  check: measured
- **FN5 · Corners are concentric**: a plate inside a plate has the outer radius minus the padding
  between them, never more; a 24px corner holding a 24px corner at 12px inset is the defect.
  check: judged
- **FN6 · Nothing overlaps by accident.** Two blocks cross only where the design meant it (D4) — a
  card over a photo's edge — never a search field under its filters or a label under a dot.
  check: judged
- **FN7 · Content wider than its place scrolls, it is never cut.** A row of columns, a strip of
  cards or a wide table scrolls sideways in its own plate; a cover is shown whole or cropped by its
  frame, never squeezed.
  check: judged
- **FN8 · A press leads somewhere that exists.** A link, a chevron or a "See all ›" opens a page,
  dialog or state that is drawn; an arrow pointing at a page the spec does not have is removed.
  check: judged

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

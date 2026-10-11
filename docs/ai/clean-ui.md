# Clean UI: lines, plates, padding, icons

These rules hold under every design system. A system may change the look; it never brings back a
mistake named here. Open this page before you draw a screen or a widget, and walk its last section
against what you drew before you call it done.

## A line divides; it never outlines

A line separates two contents. It is a divider, never a frame.

- **Where a line stands:** between a sidebar and the content, between two sections, between the two
  halves of a card split into two offers, between the items of an `ItemGroup`, between the rows or the
  columns of a `DataTable`. A node does it with `surface: apart`; inside a widget, `Separator` or
  `ItemSeparator`.
- **Where a line never stands:** around a card, a cell, a picture or a group; under a card's header;
  above a card's footer. A header and its content are one thing, and a line between them splits what
  the card exists to join.
- **The only outline is a control's:** an input, a select, an outlined secondary button.
- **One line per boundary.** Two lines that meet, or run side by side within 8px, are one too many;
  it is the mark of an outlined block inside another outlined block.
- **A line inside a plate runs to the plate's edges,** ignoring its padding, so it cuts the plate
  rather than floating in it. A table or a list that fills a plate bleeds the same way: its lines reach
  both edges, its text keeps the plate's inset.

## A plate groups

A plate (`surface: group`, or a `Card` inside a widget) says "these belong together, and it is one
thing". It is never the default wrapper.

- **Spacing groups first, a plate second.** Things that stand close already read as one group; add a
  plate only when space cannot say it (a group among other groups, a thing you can press or open).
- **A picture does a plate's job.** A picture with its title and text under it is already a group: no
  plate around it.
- **One nesting at most, and only of two different fills:** white on grey or grey on white, like a
  calendar plate holding white event cards. Grey on grey, and a third level, are the defect.
- **Few items are rows, never a grid of two or three plates.**
- **No plate around a single figure.** A strip of figures is one plate split by lines.

## Padding: three gaps in one order

```
gap between the parts inside a plate  <  the plate's padding  ≤  gap between plates
```

- **Inside < padding:** if two lines of text inside stand further apart than the text stands from the
  plate's edge, the text looks pushed against the edge.
- **Padding ≤ between (internal ≤ external):** a plate's padding never exceeds the space around it,
  or neighbouring plates read as one block.
- **The padding follows what the plate holds:**

| The plate holds                                        | Its padding                                             |
| ------------------------------------------------------ | ------------------------------------------------------- |
| text, figures, a form                                  | the full plate padding                                  |
| other plates (cards in a column, events in a calendar) | the gap between those plates, so they sit evenly inside |
| a table, a list or a picture that fills it             | none on the sides it fills; its text keeps the inset    |

- Never write a gap or a radius by hand. Inside a widget the steps arrive as `--wg-gap-items` (the
  parts of one thing), `--wg-gap-parts` and `--wg-gap-cards` (between plates); the kit lays the
  padding and the concentric corners (inner radius = outer radius − padding).

## Icons, emoji, pictures

- **An icon names a kind the eye scans for:** a task type, a file type, a status, a navigation item,
  an action with no room for a word. A list of mixed kinds leads each row with one.
- **Both extremes are defects:** no icon on a list of kinds (a wall of text), and an icon on every
  element (an icon repeating the word beside it).
- **Emoji are content, never decoration:** only for a feeling (a mood scale, a rating of the day), in
  text the person typed, or as a reaction. Everywhere else, an icon.
- **Where the product has people, places or objects, a screen shows at least one of them:** an
  avatar, a mark, a cover, a photo. Pictures are found, never drawn.
- **Colour means something or is absent:** the accent and the status tones, nothing else.

## Uppercase is a quiet label, never a voice

Capitals look right only as a small label that the eye skips past on its way to what it names. Every
condition below must hold; break one and the caps start shouting.

- **Short:** one to three words. Caps erase the shape of a word, and a sentence in caps reads slower.
- **Small and quiet:** the smallest text size, medium weight, the muted text colour.
- **Tracked:** letter-spacing 0.05–0.1em. Capitals set without it look cramped; this is what makes
  most uppercase look cheap.
- **A label for something louder:** an eyebrow above a heading or a figure, a table's column headers,
  a category tag. Never a heading, a button, a name, a navigation item, a table cell or body text.
- **Rare:** at most one uppercase label per block, and never on every block of a screen; a label
  repeated everywhere is no longer a label.
- **Written in sentence case and drawn with `text-transform: uppercase`**, never typed in capitals, so
  a screen reader reads words and not letters.

## The mistakes to look for before you finish

Walk the screen and fix each one you find.

1. A border around a card, a cell, a picture or a group.
2. A line under a card's header or above its footer.
3. Two or more lines stacked at one boundary.
4. A plate inside a plate inside a plate, or grey on grey.
5. A plate around one figure, or a grid of two or three plates.
6. A plate's padding larger than the gap between plates, or smaller than the gap between its own
   lines.
7. A table, list or picture that fills a plate but stops short of its edges.
8. More colours than the accent and the status tones.
9. No icons on a list of kinds, or an icon on every element.
10. An emoji used as an icon or a decoration.
11. Uppercase on a heading, a button or a sentence; uppercase with no letter-spacing; an uppercase
    label on every block.

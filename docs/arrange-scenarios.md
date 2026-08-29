# How a tile finds its place

`SPEC` · 2026-08-28

## TL;DR

One owner decides where every tile goes: `arrange`. It answers a collision by moving the
*other* tile sideways, shrinking it if there is no room, and letting it take a lower row only
when neither is possible. Mainstream grid libraries do none of this — react-grid-layout and
gridstack resolve collisions vertically only — so the rules are written here rather than
borrowed, and every one of them is a scenario below.

---

## The board

A tile is a rectangle on a grid of whole cells: `x` (column), `y` (row), `w`, `h`.
Two tiles **collide** when their rectangles overlap by at least one cell.

The board is `columns` wide. It has no bottom — rows go on forever.

## The three answers, in order

When two tiles want the same cell, the answer is the first of these that works:

1. **Step aside** — the other tile moves left or right until it is clear.
2. **Give a column** — if there is no room to step into, it narrows instead.
3. **Take a lower row** — only when it can neither move nor narrow.

The tile a person is holding is never the one that yields. Everything else may.

---

## Scenario 1 — widening into a neighbour, with room

```
before   columns 12
         ┌────────┬────────┬──────────────┐
row 0    │ A  0-3 │ B  3-6 │ C  6-9       │        3 free at the right
         └────────┴────────┴──────────────┘

step 1   the person drags A's right edge from 3 to 5
         A is now 0-5 and overlaps B by 2 columns

step 2   A is held, so B yields. B's centre is right of A's, and there is room
         to the right, so B steps right: B 5-8

step 3   B now overlaps C by 2. The push CASCADES: C steps right too, C 8-11

step 4   nothing is off the board and nothing overlaps — done

after    ┌────────────┬────────┬────────┐
row 0    │ A  0-5     │ B  5-8 │ C  8-11│        board is 12, one cell spare
         └────────────┴────────┴────────┘
```

**Rule:** the push travels away from the held tile and does not stop at the first neighbour.

---

## Scenario 2 — widening into a full row

```
before   columns 12, the row uses every column
row 0    │ A 0-3 │ B 3-6 │ C 6-9 │ D 9-12 │

step 1   the person drags A to 0-4; A overlaps B by 1

step 2   B tries to step right: B would be 4-7, which pushes C to 7-10 and D to 10-13.
         D would leave the board — so stepping aside FAILS for the row

step 3   the row gives a column instead. It is taken from the widest tile that is not
         held: B, C and D are all 3, so the first of them gives. B becomes 2

step 4   the row is laid out again from the held tile: A 0-4, B 4-6, C 6-9, D 9-12

after    │ A 0-4   │ B 4-6 │ C 6-9 │ D 9-12 │      still exactly 12
```

**Rule:** a row that cannot make space by moving makes it by narrowing, and the narrowing is
shared — taken from whoever is widest, one column at a time, never from the held tile.

---

## Scenario 3 — widening the last tile pushes LEFT

```
before   columns 12
row 0    │ A 0-3 │ B 3-6 │ C 6-9 │ D 9-12 │

step 1   the person drags D's LEFT edge from 9 to 7; D is now 7-12 and overlaps C

step 2   C's centre is left of D's, and there is room to the left, so C steps LEFT: C 4-7

step 3   C now overlaps B; B steps left: B 1-4. B overlaps A; A steps left: A 0-3 —
         already there, and A's left edge is the board's, so the cascade stops

step 4   A and B now overlap by 2 with nowhere to go: the row narrows (scenario 2)

after    │ A 0-2 │ B 2-4 │ C 4-7 │ D 7-12 │
```

**Rule:** the direction of the push is away from the held tile, on whichever side the yielding
tile already lies. Both directions behave the same.

---

## Scenario 4 — a tall tile beside short ones

```
before   columns 12
row 0    │ S 0-2 │ T 2-12                │
row 1    │ S     │ U 2-12                │
row 2    │ S     │ V 2-12                │
         S is 0-2 and eleven rows tall; T, U and V are one row each

step 1   the person drags S from 0-2 to 0-4

step 2   S collides with T, U and V — all three, because S spans all their rows.
         Every one of them yields, each on its own row: T 4-12, U 4-12, V 4-12

after    every row starts where S now ends. No row is treated as more important
         than another, and none of them drops.
```

**Rule:** a collision is between two RECTANGLES, not between two tiles "on the same row". A
tall tile collides with everything it spans and displaces all of it.

*This is the scenario that was broken: rows were grouped by their top edge, so a tall tile
belonged to one group and the rows below it were left out — they overlapped, and the only
answer left was to drop them.*

---

## Scenario 5 — nowhere to go at all

```
before   columns 4
row 0    │ A 0-2 │ B 2-4 │

step 1   the person drags A to 0-4 — the whole board

step 2   B cannot step right (no board), cannot step left (A is held and fills it),
         and cannot narrow below one column

step 3   B drops to row 1, keeping the width it had

after    row 0  │ A 0-4        │
         row 1  │   B 2-4 │
```

**Rule:** dropping a row is the last answer, not the first — and when it happens, it is
because there is genuinely nowhere else.

**And nothing is narrowed on the way out.** If a row cannot fit even with every other tile at
a single column, somebody is going to drop whatever happens, so nobody is shrunk first:
shrinking a tile that is about to be dropped anyway is loss for nothing.

---

## Scenario 6 — reading a layout back

```
step 1   the note is opened; the file says A 0-3, B 3-6, C 6-9
step 2   nothing has changed, so nothing moves — the arrangement comes back exactly
step 3   reading it a second time gives the same answer again
```

**Rule:** reading is not a change. Only a real overlap the file should not have contained is
resolved. An arrangement a person made is theirs.

---

## Scenario 7a — an empty row is left empty

```
before   columns 12
row 0    │ A 0-4 │
row 6    │ B 0-4 │        five empty rows between them

step 1   the person drags A wider, or the note is simply re-read
step 2   nothing collides, so nothing moves — B is still on row 6

after    the hole is exactly where it was
```

**Rule:** empty space is not a defect to be corrected. Where a person put a tile is where it
stays, and closing the gaps is a button somebody presses.

---

## Scenario 7b — Auto-fit

```
before   columns 12
row 0    │ A 0-4 │        │ B 8-12 │      4 free columns in the middle
row 1    │ A     │        │ B      │
row 2    (empty)

step 1   the person presses Auto-fit
step 2   every tile, in reading order, grows RIGHT while the cell beside it is free,
         then LEFT, then DOWN — never past the board, never into another tile
step 3   A takes 0-8 (it was reached first); B has nothing left to the left,
         so it keeps 8-12

after    │ A 0-8         │ B 8-12 │       no free cell in the row
```

**Rule:** growing into free space is one deliberate act with a button, not a rule running in
the background. Order decides who gets a contested cell, and reading order is the order a
person sees.

---

## Scenario 8 — the screen changes width

```
before   20 columns   │ S 0-4 │ T 4-20 │
step 1   the window narrows to 10 columns
step 2   every tile's x and w scale by 10/20 — S 0-2, T 2-10
step 3   the result is then resolved exactly as a drag would be: overlaps step aside,
         a row that no longer fits narrows, and only then does anything drop
after    10 columns   │ S 0-2 │ T 2-10 │
```

**Rule:** deriving a width is a change like any other. It ends in the same resolver, so it
cannot disagree with what a drag would have done.

---

## What the resolver does, exactly

```
resolve(places, columns, heldId)

  1  NARROW.  for every row of cells that is wider than the board:
               take one column at a time from the widest tile in it,
               never from the held tile,
               until the row fits or nobody can give
               — unless the row cannot fit even at one column each, in which
                 case nobody is narrowed: somebody is going to move down anyway

  2  LAY OUT. for every row of cells, from the held tile OUTWARD:
               rightwards — each tile starts no earlier than the one before it ends
               leftwards  — each tile ends no later than the one after it starts
               a tile is positioned once, on the first row it appears in
               the order tiles were in is the order they stay in

  3  FLOOR.   every tile is clamped onto the board, and anything still
               overlapping takes the NEXT row down — its own row otherwise
```

An earlier version walked outward from the held tile nudging each collider aside one at a
time. It was longer, it could swap two tiles round, and it could not tell that a row was
over-wide until it had already given up. Narrowing first and laying out second is shorter and
right.

Step 3 is the floor. Whatever the earlier steps decide, a tile ends up on the board,
and two tiles never share a cell.

A tile used to be offered row 0 and take the first row that fit, so it floated upward the
moment anything above it moved — a board rearranging itself under somebody who had only meant
to widen one thing. A row is now left only because the tile is standing on another one, and
then it takes the next row down and no further.

---

## What is deliberately NOT done

- **No vertical push, and no vertical pull.** A tile is never moved to make room vertically,
  and never rises to close a gap above it. The one vertical rule is that a tile standing on
  another takes the next row down. There is no gravity in either direction.
- **No reordering.** Tiles keep their left-to-right order; the push never swaps two tiles.
- **No memory.** Narrowing a tile to make room does not remember its old width. Widening the
  board back does not restore it — that is a separate feature and is not pretended here.

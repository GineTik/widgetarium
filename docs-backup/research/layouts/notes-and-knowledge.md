# Layouts in five notes and knowledge apps

Obsidian, Notion, Craft, Bear, Apple Notes. The most directly relevant batch, since this plugin lives inside Obsidian.

## The reading measure — the one hard number, and the rule it supports

**Obsidian is 700px**, verified from the shipped stylesheet:

```
curl -s https://publish.obsidian.md/app.css | grep -- "--file-line-width"
→ --file-line-width: 700px
```

Obsidian's docs define it as "Width of a line when readable line width is turned on". The toggle is a single boolean; off, the line fills the pane.

The others:

| Product | What is exposed | Number |
| --- | --- | --- |
| Obsidian | `--file-line-width`, one boolean | **700px** |
| Notion | "Full width" toggle, framed as **margins**, not width | not published |
| Craft | "Regular or Wide page width", macOS app only | not published |
| Bear | **line width, in `em`**, beside font, size, line height, paragraph spacing | not published |
| Apple Notes | nothing | — |

**Notion frames it as margins, not as a width.** Official wording: "You can shrink the margins on any page and widen your content area… by toggling on `Full width`." Full width *removes margin*; it does not stretch a column. Community replicas use 708–720px; treat "≈700px" for Notion as folklore.

**Bear is the most honest placement.** Measure sits in the Typography panel, in `em` — so it tracks the font size instead of fighting it. In a plugin whose host font size can change under you, `em` is the right unit.

### The rule all five follow, though only two name it

1. **A column whose job is prose read linearly gets a fixed maximum measure.** The cost avoided is the return sweep — at the end of a long line the eye has to find the start of the next, and error rate rises with length. Obsidian's variable is literally `--file-line-width`, gated on a setting called *Readable* line length.
2. **A region whose job is comparing many peers gets no measure.** Notion's database views, Apple Notes' gallery, Craft's card grids — none centre at a reading width, because the perception problem is scanning across items and a constraint only reduces how many are visible.

**So turning full width on is not "more text per line" — it is a change of job.** The pages people turn it on for hold wide tables, boards and column layouts.

**The rule worth carrying:** the measure belongs to the **content kind**, applied at the innermost region that owns prose, and is **released — never inherited** — by any region whose content is a set of peers. One toggle per screen, not per widget, never global.

## Obsidian's two sidebars hold different kinds of thing

- **Left** — *what you could open*: file explorer, search, bookmarks. **Vault-scoped and note-invariant.** Its content does not change when you switch notes, which is what lets it stay open while you read.
- **Right** — *what is true about the note in front of you*: backlinks, outgoing links, outline, tags, properties. **Note-scoped and note-derived**; every panel re-renders when the active note changes.

That is the same left/right law Figma states and games state rotated to top/bottom: **navigation is identity, properties are state.**

A **tab is a time arrangement** (one at a time); a **split is a space arrangement** (both at once). Splitting is the user converting a memory problem into a perception problem.

**Stacked tabs** are the third answer: tabs slide over one another as vertical title spines, one open at a time — the set stays countable and titled at near-zero width per member.

## Notion's page is one column of blocks, and a column block subdivides it

**The page column is *the* measure. A column block is a partition of whatever that measure currently is.** So columns and the default narrow measure fight each other — which is the practical reason people pair columns with Full width.

**Notion states no nesting limit and I could not verify one.** Community answer: no column block directly inside a column block; deeper is faked with a toggle or callout wrapper. The readability ceiling is arithmetic, not a product rule — each split divides an already-bounded measure.

**The cleanest collapse statement any of these products makes:** "Columns are available on tablet but not mobile. On your phone, you'll see the content in any right-hand column simply placed under the content in the left column." **Below a width, a row becomes a stack, in reading order.**

### The six database views — same records, six arrangements

| View | Makes perceivable, uniquely | Refuses |
| --- | --- | --- |
| **Table** | **value alignment across many properties.** The only view where the same property occupies the same x in every record — which is what makes a column scannable for outliers | no grouping, no duration, no image |
| **Board** | **the distribution of one categorical property, as area.** A pile-up in a stage is visible before reading a card. Drag between columns makes the *edit* a spatial act | cross-property comparison; only the grouped property has a position |
| **Gallery** | **the image as the identifier.** Recognition replaces reading | precision — "requires short titles" |
| **List** | **the title, at full measure, unelided.** Highest density per vertical pixel of the card-style views | comparison of more than a couple of properties |
| **Calendar** | **a date's position in the week and month, and what shares it.** The empty cell is the information | duration across long spans; anything undated |
| **Timeline** | **length and overlap.** Bar width *is* duration, vertical adjacency *is* concurrency | undated records and fine detail — hence the optional table sidebar bolted to its left, the timeline admitting what it cannot show |

Notion pairs each arrangement with a matching **opening geometry**: table, board, list, timeline → side peek; gallery, calendar → center peek.

## What earns a block its plate — Notion answers it outright

Notion's plated block is the **callout**: "boxed text for tips, warnings, disclaimers, etc. With emoji!" — useful "for highlighting specific text or breaking it out from the rest of a document." It has a mandatory icon and accepts nested blocks.

**So the plate marks a change of speaker, not importance.** The block is not part of the argument's flow; it is an aside addressed to the reader. **The icon is the giveaway — an aside needs a labelled kind.**

Beside it: **toggle** earns not a plate but *a line*, buying page length; **quote** is a plate made of type size and a rule rather than a filled box — the same job, one step quieter.

## Craft's card carries a compressed rendering of what is inside

"Cards are simply pages with extra visual styling", in five formats "that change how prominently they appear in the document", with five preview styles: Standard (title plus a content snippet), Emoji, Book, Sticky note, Gallery (a collage of up to three images).

**A card is Craft's answer to "this block is a *place*, not a sentence."** The preview style is the interesting move: the plate carries a compressed view of its contents, so the reader judges whether to enter without entering. That is a different job from Notion's callout, which shows all of itself.

Craft also publishes the **only hard nesting number** in this batch: indent depth is capped at **5 levels**. And containment is not a separate object — it is a *style applied to the block already there*.

Craft's **backdrop** has a contrast checker that warns on low contrast — the product conceding that a ground competes with the text standing on it.

## Master–detail–detail, and one constraint worth stealing

Bear and Apple Notes both run three columns: **set selector → members of the set → one member.** Each column narrows the previous by exactly one step, so the user's position is readable from the layout itself without breadcrumbs.

Apple Notes' middle pane carries a **preview line**, which makes it a weak content view — a note can often be identified without opening it.

**Apple Notes names a constraint worth generalising:** "You can't group by date if you've chosen to sort notes by title." **A list has one organising axis, and choosing a sort forfeits the grouping.**

Apple Notes' gallery is refused by **storage backend** — it requires iCloud or local notes; IMAP accounts get list only. A product accepting that a view is a capability of the data source, not of the screen.

## Gallery versus list, decided the same way by both products that offer both

| | list wins | gallery wins |
| --- | --- | --- |
| what identifies a record | its title, written by a person | its image or visual shape |
| title length tolerated | full measure, unelided | short only |
| cost per record | one line | 2-D area |
| set size it survives | long | short, or scrolled |
| gated by | nothing | **having an image at all** |

**Gallery is affordable only when an image exists per record and the title is a poor handle.** When neither holds, gallery spends area to show nothing.

Apple Notes is the sharp case: its title is auto-derived from the first line and therefore unreliable, and a thumbnail shows the note's *shape* — a scan, a sketch, a checklist, a photo. Since Notes mixes media types in one folder, the kind of thing is a better handle than the title.

## Not verified

Notion's default content width in px, and its nesting depth limit. Obsidian's exact in-app setting string. Bear's line-width values. Craft's card column counts. Whether Apple Notes applies any internal max width.

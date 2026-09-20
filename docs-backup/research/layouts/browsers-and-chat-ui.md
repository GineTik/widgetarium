# Layouts in browsers and AI interfaces

Arc, Safari, Chrome, ChatGPT, Claude, LM Studio, Ollama. Widths are labelled by source; none was measured live.

## Strip versus column is a question about *n* and about which dimension carries identity

Microsoft publishes both sides, which makes this the one genuinely sourced comparison.

- **A column preserves the title.** Vertical tabs "can display more of the page title, making it easier to identify tabs at a glance," and "can handle a larger number of tabs without shrinking to the point of being unrecognizable."
- **A strip preserves width and position.** Horizontal tabs "take advantage of the screen's width, which is often more abundant than the height," and "can be compact, showing only the favicon or a truncated version of the page title."
- **The cost, named by Microsoft:** vertical tabs "take up more horizontal space, which can be a drawback on smaller screens or when working with side-by-side windows."

**A strip divides a fixed width by n. A column divides a fixed height by n but gives every row the full width.** Titles are horizontal, so the column preserves the identifying dimension and spends the scarce one.

At n = 50 the strip has shrunk to favicons and then scrolls, so even *position* stops being stable. Chrome shipped vertical tabs in March 2026 with the same reasoning — "Sidebar tabs feature full page titles and make it simple to organize tab groups" — which settles that this is a real fork and not fashion.

**LM Studio is the inverse case:** primary navigation position is a *setting*, "top" or "left". At n = 4 with fixed known labels neither geometry degrades, so the choice is free and can be handed to preference. The tab question is really a question about n and about whether the labels are known in advance.

Arc's own perceptual reasoning for the column: **not verified.** Their published framing is organisational (Spaces, auto-archive), not perceptual.

## Vertical position is a legitimate carrier of lifetime

Arc's sidebar is banded: **Favorites** (forever, across every Space, drawn as an icon grid), **Pinned** (until unpinned, scoped to the Space, rows), **Today** (auto-archived after 12 hours idle, rows).

One list would flatten three different lifetimes into one visual rank. The bands encode permanence as vertical position — **not a badge**.

Note the level-3 change inside the level-2 band: Favorites are refused the row form and drawn as icons, because at that tier the site is recognised by mark, not read by title.

ChatGPT does the same in its conversation sidebar: Pinned, then Today, Yesterday, Previous 7 Days, Previous 30 Days, then by month.

## A band that carries two kinds of object loses both their states

Safari 15's "Compact" merged the tab strip into the URL/toolbar row — one band doing two jobs, buying back a row of vertical space.

It was reverted in 15.1. The complaint was specific and perceptual: you could not tell which tab was active, worst with two tabs from the same site, because merging the bands removed the only cue distinguishing a tab from a button. Gruber: "They don't look like tabs."

**A level-2 division cannot also be level 3.**

## Cap and centre exactly where widening hurts; anchor everything else

This is the clearest statement of the centring rule found anywhere in the research.

- **Prose is read along.** The dominant cost is the return sweep: too long and the eye cannot find the next line's start. So the layout's job is to fix a measure. Once the measure is capped and shorter than the window, the leftover width is dead space, and the only symmetric — therefore invisible — place to put it is split on both sides. **Centring is the consequence of capping, not a separate decision.**
- **A list is scanned across.** Its cost is finding the row, which depends on a stable left edge and on comparing rows by name, size, date. Capping wastes the width the columns need; centring moves the alignment edge on every resize.

**The test that separates them: does widening the window help?** For a list, yes — more columns visible. For prose, no — it actively hurts past ~75 characters. Cap and centre exactly the things where widening hurts.

Numbers, all third-party:

- **ChatGPT** sets `--thread-content-max-width`; the shipping class in the widely-used override is `[--thread-content-max-width:40rem]` inside `@container (min-width: 768px)` — **40rem ≈ 640px**.
- **Claude** carries `.max-w-3xl` (48rem = 768px) and `.max-w-[75ch]`. The `75ch` is the interesting one: the typographic measure expressed in the unit the research uses. Baymard puts the comfortable range at **50–75 characters**; Bringhurst's classical range is 45–75. Claude sits on the top edge of the researched band.

## Plate the cheap content, leave the structured content bare

The chat turn inverts the intuitive assignment, and the reason is nesting.

**The user's turn is plated and inset. The assistant's turn is bare and takes the full measure.** Not a left/right mirror, not bubble-versus-bubble.

The assistant's body is a structured document — headings, lists, tables, code blocks with their own chrome. A plate around it nests a container inside a container and forces every code block to sit inside two borders; right-alignment would fight the reading direction of the prose inside it. The user's turn is short and unstructured and needs only to be told apart, which a tint and an inset do at zero structural cost.

The three distinguishing mechanisms, ranked by cost:

| Mechanism | Cost | Fails when |
| --- | --- | --- |
| Alignment (iMessage) | free | destroys the measure — a right-aligned block has a ragged left edge, unreadable past a couple of lines |
| Colour / tint | free | invisible to anyone who cannot see the hue difference; unreliable across themes |
| A plate | horizontal inset, and double framing if the content plates itself | — |

**Both products spend the expensive mechanism on the cheap content and leave the expensive content bare.** Vendor confirmation: not verified; the pattern is documented in design writing and shipped as a named variant in shadcn/ui's Bubble.

## A reader is a level-1 substitution that discards position as a carrier of meaning

A page's layout encodes the *publisher's* priorities as position. Reader discards position and keeps only sequence, because for prose, sequence is the whole structure.

Apple's removal list: "without navigation or other distractions" — ads, navigation menus, sidebars, headers, comments, related links. **Retained: the article's own images.**

Chrome's Reading mode strips more — "Reduce distractions from images and videos on screen." Two products, same intent, disagreeing about whether a picture is part of the article.

Safari refuses Reader on pages that fail the article test: it needs a wrapper element other than `<body>`, enough paragraphs, and paragraphs long enough (~100+ characters). **A page with no single dominant content block has nothing to promote.**

## When space runs out, the inspector goes first — as an overlay, not a deletion

LM Studio's Chat tab is conversation list | chat | Advanced Configuration sidebar. The three hold three kinds of fact, each changed on a different rhythm: which conversation (occasionally), its content (constantly), the parameters governing the next generation (before a run, then compared against its output).

The narrow-window rule: "On narrow window size show right hand sidebar as an ephemeral overlay." **The list–detail pair survives; the inspector is the first thing dropped.** A clear statement of rank.

Chrome makes the same call from the other direction: Reading mode was moved *out* of the side panel to a full-page view, because a reading measure inside a narrow panel is worse than the page it replaced.

## Not verified

Arc's own perceptual reasoning. ChatGPT's narrow/wide variants. Vendor confirmation of the chat-turn plating asymmetry. Ollama's desktop layout — its blog names features but publishes no layout description.

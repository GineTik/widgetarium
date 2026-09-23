# Layouts in five chat products

Slack, Telegram, Discord, Apple Messages, WhatsApp. Products document features, not geometry, so several structural facts are marked unverified.

## Three navigation levels, and why not two

| Level | Slack | Discord | Selecting an item changes |
| --- | --- | --- | --- |
| Rail | navigation bar: Home, DMs, Activity, Later | server list | **what the list column is a list of** |
| List | sidebar: channels and DMs, in sections | channel list, in categories | **what the conversation column shows** |
| Conversation | message pane | chat area | nothing — it is the leaf |

**The rail's population is small and fixed; the list's population is unbounded and personal.** A rail can be icon-only because its items are few enough to learn by shape, and because it never scrolls its items keep stable screen positions and become muscle memory.

Fold the two together and you get one list containing two kinds of row, which scrolls — so nothing has a stable position and the small fixed set becomes as hard to hit as the thousandth channel.

**Telegram proves it from the other side.** Its chat list collapses to "a column of profile pictures" — the same region, minus the words. **A list pane and a rail are one region at two widths, and what gets dropped is the label, not the avatar.**

Neither product puts a fourth navigation level on the left. Grouping below the list — Discord's categories, Slack's sections — stays *inside* the list column as a level-2 device.

## The conversation column is anchored at the bottom, and that reverses three things

Every other scrolling list is anchored at the top: the first item sits at a fixed position, new items extend the bottom, and "where you were" is measured from the start. A conversation inverts all three.

- **The newest message is the one you are answering**, so it must be adjacent to the composer that answers it. A top-anchored chat would put the message you are replying to at maximum distance from the field you reply in.
- **Arrival must not move what you are reading.** Appending below the viewport leaves the read region still; prepending at the top would shift everything under the eye on every arrival.
- Reading older messages is therefore an explicit departure from the anchor, and products give it an explicit return control.

CSS names the mechanism (`overflow-anchor`, the `column-reverse` technique), so it is a real layout property, not a scripting habit. **No product help page states it** — the behaviour is observed but undocumented.

## Centring in a conversation — one first-party statement exists

Telegram's changelog: **"Conversation history is centered in wide windows"** (0.9.20, 2016), with "Adaptive layout for wide screens switch added to Settings" the same month. The threshold width is not given.

The structural split that *is* evidenced: **Slack and Discord draw full-width rows with a left avatar gutter; WhatsApp, Telegram and Apple Messages draw bubbles aligned by sender.** A bubble layout implies a bounded measure, because a bubble spanning a wide window stops reading as a bubble.

## The composer is an edge strip because its position must never be searched for

Anything inside a scroll region has a position that depends on how far you scrolled, so finding it is a task. An edge strip has a position that depends on nothing.

It is also what makes the bottom anchor legible: **newest message immediately above, input immediately below — the reading end and the writing end are the same place.** It grows upward as you type, the only direction that does not move it.

## What belongs in a right pane — three tests, all three required

| Surface | Product's own words |
| --- | --- |
| Slack threads | discuss a topic "without adding clutter to a channel" |
| Slack split view | "see information from different parts of Slack **side-by-side**" |
| Discord member list | a roster of the channel, not of any message |
| Discord threads | "their own dedicated space **temporarily** without having to commit to a new channel" |

1. **About the main pane** — rules out anything that would replace it. Its content changes when the main selection changes. Fail this and it is a sibling.
2. **Consulted, not committed to** — rules out a modal. A modal asserts nothing else matters until dismissed, which is false: you open a thread precisely because you intend to keep reading the channel. Apple states the preference as a rule: "To display supplementary information, prefer a split view instead of a new window. A split view gives people convenient access to more information without leaving the current context."
3. **Must not disturb the main pane's flow** — rules out inline expansion. An inline thread would insert a variable-height block into a bottom-anchored scroll, moving everything around it every time a reply lands. Fail this and it can be inline.

**Ratio, named by Material:** supporting pane takes 30% at expanded width, 50% at medium.

**The escape hatch, named by Slack:** when the supporting pane stops being supporting — when you want the thread *and* an unrelated channel — it detaches into a window.

**What goes there, generally: the same record, re-sorted.** Apple's Details lists a conversation's photos and links; Discord's channel details carries media, files, links and threads; Slack's header tabs offer files and canvas beside messages. Same data, ordered by kind instead of by time.

## Run grouping — the level-3 rule, stated generally

**Consecutive items sharing an attribute form one run; attributes constant within the run are drawn once at its head; the spacing between runs is larger than the spacing within one.**

That it is a first-class layout unit and not decoration is shown by the controls products ship for it:

- Discord has a setting literally called **"Message Group Spacing"** — "Increase the space between chat messages to make conversations easier to read." The gap *between runs* is tunable, which only makes sense if runs are objects.
- Discord's Compact "forgoes avatars, decreases the amount of spacing between messages, and even starts someone's message on the same line as their display name" — **Compact dissolves the run's head, not the run.**
- Slack's two themes differ in exactly this element: Clean "displays member profile photos beside their messages"; Compact "uses less white space between messages and hides member profile photos."
- Discord keeps them separate on purpose: "UI density doesn't affect message density."

**What it buys, three things at once:**

1. Removes repetition carrying no information — the same avatar five times says nothing the first did not.
2. Converts a flat list of N items into a list of **runs**, so the eye counts *turns* in the conversation rather than messages, which is what a reader wants to know.
3. **Makes the gap itself informative.** Because within-run spacing is smaller, an ordinary gap now *means* "the speaker changed" — a boundary perceived without a line, a colour or a label being spent on it.

**Generalised:** a level-3 arrangement may declare a **run key** (the attribute making peers consecutive-equal) and a **head** (fields drawn once per run rather than per item). Spacing between runs must exceed spacing within, and the difference does the work. **The documented degrade is "drop the head, keep the run"** — never drop the grouping.

## Mobile: panes become screens, and the collapse order is fixed

**Supporting pane → list → main.** The main pane is the one that is never a different thing at a different width.

- **Slack** — the rail becomes a bottom tab bar; the sidebar becomes the Home tab's screen; the conversation becomes a full screen. Notably DMs were *promoted* out of the sidebar into their own tab, because there they had been reachable only by "a lesser-known swipe gesture" — **when panes collapse, the list's internal sections get re-weighted rather than preserved.**
- **Discord** — keeps rail *and* list on one screen (the server rail survives as a strip inside the Home tab) and pushes only the conversation. The member list becomes a details page reached by tapping the channel name.
- **Telegram** — the folder rail becomes swipeable tabs above the chat list.

Material states the same priority as a resize rule: when an expanded window narrows, "the detail pane remains visible and the list pane is hidden."

Apple gives the reason: "Prefer using a split view in a regular — not a compact — environment… In a compact environment, such as iPhone in portrait orientation, it's difficult to display multiple panes without wrapping or truncating the content."

## Not verified

Slack's "flexpane" as an official term; Slack's grouping time window; Telegram's third column and its centring threshold; Slack and Discord column width at large widths; all WhatsApp pane claims (its docs render no body text to fetchers).

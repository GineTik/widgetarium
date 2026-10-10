---
id: player-queue
title: Player + queue
centre: [object]
object_kind: [video, audio, image, article]
activity: [browse]
items_at_once: few
session: [browse, glance]
device: [both]
---

# Player + queue

## Job

The person consumes one item now and is always one press from the next.

## Picked when

- "Watch a video and see what to watch next."
- "Listen to an episode with the rest of the season beside it."
- "Read a recipe with similar recipes under it."

## Not for

Working on the item (`stage-inspector`), comparing many at once (a grid or a table).

## Regions

| Region                     | Holds                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **Player**                 | the item at a fixed, comfortable size; it never fills the window by default           |
| **About**                  | title, author, counts, the item's actions (like, save, share), the description folded |
| **Queue**                  | what comes next: related or playlist, beside the player on desktop, under it on phone |
| **Responses** _(optional)_ | comments or notes, under the about block                                              |

## Behaviour

- The layout is a plain page; nothing is built around or over the player.
- The player may go full screen on demand, and that is a mode, not the layout.
- Picking from the queue replaces the item and keeps the page.
- Phone: player on top, then about, queue, responses, all scrolling in one column.

## Examples

Video and podcast platforms' watch pages, recipe pages with "more like this".

## Pairs with

- Stronger: cards for queue items, quiet controls under the player.
- Fights: a picture as the page ground (competes with the player), heavy glass over the item.

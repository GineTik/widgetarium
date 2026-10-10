---
id: stage-inspector
title: Stage + inspector
centre: [object]
object_kind: [video, image, map, document, model-3d]
activity: [edit, study]
items_at_once: one
session: [long-work, browse]
device: [desktop, both]
---

# Stage + inspector

## Job

One object is the whole work; everything else on the screen tunes it or explains it.

## Picked when

The person opens a single visual thing and works on it or studies it.

- "Open a video, trim it, see its stats on the right."
- "An image editor."
- "A map where a picked place shows its details beside it."

## Not for

Many equal items (a list, a kanban board, a feed), a reading flow, a form. **Watching** the same video is not this pattern: a person who consumes and moves on to the next one needs `player-queue`.

## Regions

| Region                 | Holds                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| **Stage**              | the object, as large as the window allows                                                           |
| **Inspector**          | settings, stats and metadata for the object or the current selection, in tabs (Edit · Stats · Info) |
| **Strip** _(optional)_ | a timeline for video, a filmstrip for images, layers for a document                                 |
| **Toolbar**            | the few tools that act on the stage                                                                 |

## Behaviour

- The stage zooms and pans; video also scrubs.
- A selection on the stage (a frame, a region, a pin) decides what the inspector shows.
- Desktop: the inspector is a right panel the person can resize or fold. Phone: it becomes a bottom sheet over the stage, half-open by default.
- The inspector never covers the selected part of the object.

## Examples

Video studios, photo editors, design tools, map apps with a place panel.

## Pairs with

- Stronger: dark or neutral ground (the object carries the colour), quiet controls, glass controls on the stage.
- Fights: a picture as the page ground (two images compete), cards everywhere.

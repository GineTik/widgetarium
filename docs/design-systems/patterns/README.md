# Product patterns

A product pattern is the **structure** of a product: what stands in the centre, which regions serve it, and how they behave. It says nothing about colour or style; a design system paints it. An app picks one pattern and one system.

**The activity decides, not the object.** The same video is `stage-inspector` for someone who edits or studies it, and `player-queue` for someone who watches it and moves on. A filter must match `activity`, never `object_kind` alone.

## Format

Front matter: filterable parameters. Body: sections an agent reads after the filter.

```yaml
id: stage-inspector
title: Stage + inspector
centre: [object] # object · function · information · journey · atmosphere
object_kind: [video, image, map, document, model-3d]
activity: [edit, study] # browse · edit · study · track · create · play
items_at_once: one # one · few · many
session: [long-work, browse]
device: [desktop, both]
```

| Section     | Holds                                                              |
| ----------- | ------------------------------------------------------------------ |
| Job         | one sentence: what the structure is for                            |
| Picked when | the situation in words, with two or three example requests         |
| Not for     | where it is wrong                                                  |
| Regions     | each region and what it holds                                      |
| Behaviour   | how regions react: selection, zoom, collapse, phone form           |
| Examples    | real products that use it _(names for the reader, never copied)_   |
| Pairs with  | design-system traits that make it stronger, and ones that fight it |

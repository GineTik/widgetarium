# Design catalogue

Design systems taken from references a person liked, written so an agent can build a **new** product in the same spirit. A system is never the source product: its domain, data and screens stay behind.

## Layout

```
design-catalogue/
  systems/<id>/
    system.md        the system: front matter to filter by, sections to read
    references/      the pictures it was written from, numbered; credit in system.md
  patterns/<id>.md   product structures (what stands in the centre, which regions serve it)
```

A source's screen structure goes to `patterns/`, never into its system.

One Markdown file per system: an agent reads it whole and judges the idea, which a split into JSON fragments would lose. Only the front matter is for filtering.

## How a system is written

From the person's description of the references and the pictures themselves. Every section answers _why_, not only _what_.

| Section                | Holds                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Front matter           | `id`, `title`, `source`, `credit`, and fit parameters as arrays: `centre` (object · function · information · journey · atmosphere), `activity` (browse · edit · study · track · create · play · operate), `photogenic` (yes · user-photos · no), `session` (glance · browse · long-work), `density` (low · medium · high), `tone`, `device` |
| Idea                   | one or two sentences a person would say about it                                                                                                                                                                                                                                                                                            |
| Colour algorithm       | how the colours are **derived**, never only the hex values: the steps, the job of each, their lightness and chroma ranges, what is free (hue) and what is fixed (semantic status colours). Written for **both light and dark themes**; the source's theme is one instance                                                                   |
| Type                   | families, weights, the scale, and the patterns of emphasis                                                                                                                                                                                                                                                                                  |
| Imagery                | the role (forms the design · domain content · decoration), the kind of picture, how a picture is brought in line, and where to get such pictures for another domain                                                                                                                                                                         |
| Surfaces               | which plates exist, what they group, their anatomy, padding rules                                                                                                                                                                                                                                                                           |
| Controls               | each kit control's own style in this system                                                                                                                                                                                                                                                                                                 |
| Data display           | charts, tables, numbers                                                                                                                                                                                                                                                                                                                     |
| Layout per screen kind | each screen kind the source shows, with its structure                                                                                                                                                                                                                                                                                       |
| Behaviour              | what the main object and the panels do when pressed, dragged, scrolled, collapsed; live updates                                                                                                                                                                                                                                             |
| Motion and transitions | fades, edges, speed                                                                                                                                                                                                                                                                                                                         |
| Fit                    | what products it suits and which it does not                                                                                                                                                                                                                                                                                                |
| Do / don't             | the rules a copy most often breaks                                                                                                                                                                                                                                                                                                          |

Three layers stay apart: the **look** (this file), the **structure** of a product (which screen kinds exist), and **behaviour**. The source's own business features are not written down.

## Using a system for a new product

1. Pick the system by fit.
2. **Design the product's structure first, from its own tasks**: which screens, which regions, what each holds. Only then apply the system. The source's screens are never a starting layout.
3. Choose the product's own hue and imagery **by the system's algorithm**, not by copying values.
4. Find pictures of the new domain in the system's imagery kind.
5. Build both themes.
6. **Copy check:** set every screen beside the reference pictures. If one reads as the same screen with the nouns changed — same regions, same panels in the same places, same order of cards — it is a copy: rebuild its structure.

## Pictures are found, never drawn

An agent never draws pictures: no illustrations, no object or body drawings, no maps or territory, no decorative SVG, no tracing or edge-detecting a photo into line art. Every picture is a real file from a source:

- photos and aerials from CC0 / public-domain sources, graded by the system's imagery rule;
- ready vector line art (Wikimedia Commons SVG, public-domain technical drawings, open icon sets) used as it is;
- the kit's icons;
- when nothing fits, a labelled placeholder: `[outline drawing: athlete, side view]`.

Code may draw only data and interface geometry: charts, ticks, dividers, a selection ring, markers on a real map or photo.

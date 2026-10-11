# Canvas

One surface fills the window: a map, a board, a document, a design. Navigation shrinks to a menu; tools float over the surface.

```
┌──────────────────────────────────────────────┐
│ ≡ name ▾                       share  ●      │
│   ┌────┐                          ┌───────┐  │
│   │tool│        surface           │ panel │  │
│   │tool│                          │ for   │  │
│   └────┘                          │ the   │  │
│               ┌──────────┐        │ pick  │  │
│               │ zoom − + │        └───────┘  │
└──────────────────────────────────────────────┘
```

| Part     | Holds                                                                    | Size                                   |
| -------- | ------------------------------------------------------------------------ | -------------------------------------- |
| top line | a menu with the app's sections, the open item's name, share, the account | 44–52px, floating or flush             |
| tools    | the actions on the surface, grouped                                      | floating, docked to an edge            |
| panel    | the properties of what is picked on the surface                          | 280–320px, floating, appears on a pick |
| surface  | the one thing being worked on                                            | the whole window                       |

- The surface never shrinks for chrome; chrome floats over it and hides when not needed.
- The panel appears only while something is picked.

**Folding:** tools collapse into one button; the panel becomes a bottom `sheet`.

**Fits:** editors, maps, whiteboards, kanban boards worked as one surface, design tools. **Not for:** apps of many pages.

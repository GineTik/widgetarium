# @widgetarium/kit

The component kit every widget and every screen is drawn with. Change a component here and it changes everywhere it stands. It imports nothing but React.

## What is in it

| Entry                      | What it gives                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@widgetarium/kit`         | `Card`, `Layout`, `Rows`, `Grid`, `Button`, `IconButton`, `Badge`, `Heading`, `Field`, `Segmented`, `Tabs`, `Popover`, `Calendar`, `ProgressBar`, `Switch`, `Icon` and the rest |
| `@widgetarium/kit/surface` | The plate context: how many plates stand above a component and which one it may wear                                                                                            |
| `@widgetarium/kit/plates`  | The plate laws: which surface may stand inside which, and how deep                                                                                                              |
| `@widgetarium/kit/icons`   | The Lucide icon table the kit's `Icon` draws behind its own glyphs                                                                                                              |
| `@widgetarium/kit/emojis`  | The Microsoft Fluent faces as drawings, on their own entry so nobody pays for them unasked                                                                                      |
| `@widgetarium/kit/shapes`  | The store of which shape each path wears                                                                                                                                        |

Inside a widget the same kit arrives as `widgetarium/kit`:

```tsx
import { Card, Rows, Icon } from "widgetarium/kit";
```

## Layout

```
src/
  components/   one component per file: button.tsx, card.tsx, layout.tsx, popover.tsx, …
  icons/        icon.tsx, the kit's own glyphs, the generated Lucide table
  emojis/       emoji.tsx and the generated Fluent table
  hooks/        one hook per file
  constants/    shared words and numbers: surfaces, tones, marks, layout, progress, popover
  utils/        shared helpers: cx, class names, plate laws, popover motion, progress geometry
  types.ts      LooseProps, until each component types its own props
  index.ts      the public surface
  plates.ts     the plate words and laws, for @widgetarium/kit/plates
```

Everything is TSX with the classic `h` factory, so every file that draws imports `createElement as h` from React. A constant or helper used by one component lives in that component's file; one used by several lives in `constants/` or `utils/`.

## Rules it keeps

- **Colours are tokens.** Every colour is a `--wg-kit-*` custom property; nothing is written by hand.
- **A plate is earned.** `Card` asks the plate laws whether it may stand where it is; a refused plate paints nothing and warns.
- **Icons and emojis are drawings**, not font glyphs, so they look the same in every host.

Glyph tables are generated: `node tools/fetch-icons.mjs`, `node tools/fetch-emojis.mjs` and `node tools/fetch-shapes.mjs` rewrite them. Their own licences sit in [`assets/`](assets).

## Licence

[MIT](LICENSE).

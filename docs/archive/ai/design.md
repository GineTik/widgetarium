# How a screen is judged

Two references: Google's Material 3 Expressive and Apple's current system. Neither is copied as a
look — a Material component dropped into an Obsidian plugin fights the host's theme. What is taken is
the practice, the same on both sides: **maximalist, physical, answering.**

## Colour

Every colour comes from a `--wg-kit-*` token. No hex, no `rgb()`, no named CSS colours. The tokens
follow the person's Obsidian theme, so a hardcoded colour goes unreadable when they switch to dark.

| Token                                                                                                                                                                  | Role                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `--wg-kit-fill`, `--wg-kit-fill-hover`                                                                                                                                 | The surface a control sits on      |
| `--wg-kit-card-fill`, `--wg-kit-card-edge`, `--wg-kit-card-corner`, `--wg-kit-card-pad`                                                                                | The card                           |
| `--wg-kit-plate`, `--wg-kit-plate-pad`                                                                                                                                 | The grey well a list stands in     |
| `--wg-kit-accent`, `--wg-kit-accent-wash`                                                                                                                              | The one thing being asked for      |
| `--wg-kit-success`, `--wg-kit-warning`, `--wg-kit-error`, `--wg-kit-info`, `--wg-kit-note`, `--wg-kit-standout`, `--wg-kit-highlight` and their `-wash` / `-ink` pairs | Status and tags                    |
| `--wg-kit-lift`, `--wg-kit-lift-blur`, `--wg-kit-lift-drop`, `--wg-kit-raise`, `--wg-kit-shadow`                                                                       | Elevation                          |
| `--wg-kit-glass`, `--wg-kit-glass-blur`, `--wg-kit-glass-tint`, `--wg-kit-glass-edge`                                                                                  | The floating layer                 |
| `--wg-kit-row-hairline`                                                                                                                                                | The only line allowed between rows |

```bash
node ~/.claude/scripts/audit-colors.mjs --app <widget-folder> --globals styles.css
```

The kit's controls paint fill and corner on a `::before`; the element itself is `border-radius: 0` by
design. Do not "fix" that.

## Shape

An element earns attention by having a form the ones around it do not. The 35 outlines in
`assets/shapes/` are the vocabulary. **One unusual form per widget**, on the thing the eye seeks.

**A corner is never where the text goes.** Under a large radius the corner belongs to an icon or a
shape; text stays inside the safe box.

## Size

Big. Large controls, large corners, generous spacing. One grid cell is one medium control (42px) plus
one gutter — a 1×1 tile is a button, and may never fall under the finger.

## Motion

Motion answers a press. Springy, interruptible, immediate. Nothing animates because a screen
appeared.

## Emoji

A typed emoji renders as whatever font the host has. Use the drawing:

```tsx
import { Emoji } from "widgetarium/kit/emojis";
<Emoji name="smiling-face-with-halo" />;
```

129 Microsoft Fluent faces — Unicode "Smileys & Emotion" up to the monkeys. They cost 300kb and hang
off their own specifier, so a widget pays only if it asks.

## Icons

```tsx
import { Icon } from "widgetarium/kit";
<Icon name="anchor" size={22} />;
```

The kit's own 35 glyphs answer first — `chevron`, `menu`, `search`, `gear`, `close` and the rest —
with 1848 Lucide names behind them. A name the kit holds is drawn by the kit even when Lucide holds
it too. A name neither holds draws nothing rather than a box.

A prop a person picks an icon for declares `control: "icon"`.

## Width

A widget lives in a tile, not a viewport, so a media query is the wrong tool — measure. The manifest's
`collapseBelowPx` and `stackBelowPx` are the widths at which the widget gives up detail and turns its
row into a column; `tallestPx` is the height it must never exceed.

Below `MAIN_FLOOR_PX` a sidebar becomes a drawer over the whole window. That is the board's business,
but it is why a widget must survive being narrow.

## Empty and broken

An empty collection gets a sentence, not a blank. A failed read gets the reason, not an endless
spinner. A refused verb gets the tile saying so. A widget that goes blank is worse than one that says
it has nothing.

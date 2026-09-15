# How a screen is judged

Two references, one job each: Google's Material 3 Expressive and Apple's current system. Neither is
copied as a look — a Material component dropped into an Obsidian plugin fights the host's theme and
loses. What is taken is the practice, and on both sides the practice is the same: **maximalist,
physical, answering.**

## Colour

Every colour comes from a `--wg-kit-*` token. There are no hex values, no `rgb()`, no named CSS
colours in a widget. The tokens follow the person's Obsidian theme, so a hardcoded colour is not a
style choice — it is a widget that goes unreadable when they switch to dark.

The roles, from `styles.css`:

| Token | Role |
| --- | --- |
| `--wg-kit-fill`, `--wg-kit-fill-hover` | The surface a control sits on |
| `--wg-kit-card-fill`, `--wg-kit-card-edge`, `--wg-kit-card-corner`, `--wg-kit-card-pad` | The card |
| `--wg-kit-plate`, `--wg-kit-plate-pad` | The grey well a list stands in |
| `--wg-kit-accent`, `--wg-kit-accent-wash` | The one thing being asked for |
| `--wg-kit-success`, `--wg-kit-warning`, `--wg-kit-error`, `--wg-kit-info`, `--wg-kit-note`, `--wg-kit-standout` and their `-wash` / `-ink` pairs | Status and tags |
| `--wg-kit-lift`, `--wg-kit-lift-blur`, `--wg-kit-lift-drop`, `--wg-kit-raise`, `--wg-kit-shadow` | Elevation |
| `--wg-kit-glass`, `--wg-kit-glass-blur`, `--wg-kit-glass-tint`, `--wg-kit-glass-edge` | The floating layer |
| `--wg-kit-row-hairline` | The only line allowed between rows |

A build gate checks this. Run it after any UI change:

```bash
node ~/.claude/scripts/audit-colors.mjs --app <widget-folder> --globals styles.css
```

The kit's controls paint their fill and corner on a `::before`; the element itself is
`border-radius: 0` by design. Do not "fix" that.

## Shape

An element earns attention by having a form the ones around it do not. The 35 outlines in
`assets/shapes/` are the vocabulary. **One unusual form per widget**, on the thing the eye is looking
for — not on everything.

**A corner is never where the text goes.** Under a large radius the corner belongs to an icon or a
shape; text stays inside the safe box. A radius that eats a word is the radius, not the word.

## Size

Big. Large controls, large corners, generous spacing. A dense grid of small buttons is the design
this project is deliberately not. One grid cell is one medium control (42px) plus one gutter — a
1×1 tile is a button, and it may never fall under the finger.

## Motion

Motion is the answer to a press, not decoration on load. Springy, interruptible, immediate; a control
that moves under the finger. Both references spend their budget here, and so do we. Nothing animates
because a screen appeared.

## Emoji

A typed emoji renders as whatever font the host has. Use the drawing:

```tsx
import { Emoji } from "widgetarium/kit/emojis";
<Emoji name="smiling-face-with-halo" />
```

129 Microsoft Fluent faces — the Unicode group "Smileys & Emotion" up to the monkeys, and nothing
else. They cost 300kb, so they hang off their own specifier and a widget pays only if it asks.

## Width

A widget lives in a tile, not in a viewport. The window's width says nothing about the tile's, so a
media query is the wrong tool — measure. The manifest's `collapseBelowPx` and `stackBelowPx` are the
widths at which the widget gives up detail and turns its row into a column, and `tallestPx` is the
height it must never exceed.

Below `MAIN_FLOOR_PX` a sidebar stops being a column and becomes a drawer over the whole Obsidian
window. That is the board's business, not a widget's, but it is why a widget must survive being
narrow rather than assuming it will be given room.

## Empty and broken

An empty collection gets a sentence, not a blank. A read that failed gets the reason, not a spinner
that never stops. A required verb the binding refuses gets the tile saying so. A widget that goes
blank is worse than one that says it has nothing.

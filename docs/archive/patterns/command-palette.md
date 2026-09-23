# Command palette

A keyboard-summoned overlay that accepts text and resolves it to a destination or an action,
replacing a traversal of the visible navigation.

## The shape it suits

A space **too large to enumerate visibly**, whose items have names the user already knows.

It is a complement to a visible shell, never a replacement. It cannot teach what exists — only
accelerate reaching what is known.

## Take it when

- The hierarchy is deep or wide and power users live in it.
- Commands are buried in menus and deserve a second route.

## Leave it when

- **As a substitute for visible navigation.** A palette is invisible until invoked; someone who does
  not know it exists cannot use it, and that person is exactly who a deep hierarchy hurts.
- **The user does not know the vocabulary.** A name they have never seen cannot be typed.

## Regions

| Region  | May hold                                                                                                                               | May not hold                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Input   | One line; a visible scope token — GitHub "shows your location at the top left and uses it as the scope for suggestions"; mode prefixes | Multi-field forms                       |
| Results | Ranked destinations and commands; recents; the keyboard shortcut for each                                                              | Results the current scope cannot act on |

Scope is the hard part. A palette that offers a command the current context cannot run is worse than
no palette.

## Width

None — it is an overlay and works at every width. In practice it is a keyboard pattern; on touch it
degrades into ordinary search.

## Costs

Discoverability is zero by design. Requires the user to know a name. Scope coherence is real work.

## Seen in

GitHub (developer platform) · Slack (team comms) · Chrome omnibox (browser) · Notion quick find
(documents).

## Composition

Orthogonal — it overlays any pattern and nests inside none.

One hard rule, directional: **a command palette does not license a deeper hierarchy.** It speeds
traversal for people who already know the name and does nothing for the person who does not.

## In a board

Obsidian already has one, and the plugin already registers its commands there. A board does not build
its own.

The reason this pattern is in the catalogue at all: when a screen is running out of room, a palette is
the standard relief valve — and the rule above says it is not. Fix the hierarchy instead.

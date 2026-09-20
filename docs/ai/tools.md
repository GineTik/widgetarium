# The tool

`node {tool} <command>`. Every command takes `--text` for lines instead of JSON.

| Command            | Gives                                                                    |
| ------------------ | ------------------------------------------------------------------------ |
| `find`             | the whole catalogue, ranked against what you need                        |
| `list`             | the same, unranked                                                       |
| `packs`, `sources` | the scopes installed, and the registries configured                      |
| `show <id>`        | one widget's props, role and size                                        |
| `source <id>`      | its source, to read before copying anything from it                      |
| `install <id>`     | writes it and its scope's shared files into the vault                    |
| `check <id>`       | six defects in a widget you wrote; exits 1 while any stands              |
| `pattern <name>`   | a shell's skeleton, regions already carrying role, purpose and surface   |
| `card <name>`      | a card layout: what it wears alone and among peers, and the parts it has |
| `layout <note>`    | the real width of every region and tile on a drawn board                 |
| `lint <note>`      | what is wrong with the board; exits 1 until it is valid                  |
| `surfaces <note>`  | which plates look wrong beside each other, on a **drawn** board          |

## Finding a widget

```bash
node {tool} find --role collection --reading sequence --needs date,text --about "tasks by day"
```

`--reading` takes `sequence`, `comparison`, `table`, `cross`, `field`. `--pack`, `--tag`, `--source`
narrow it. Called with nothing it is the whole catalogue. Every row prints why it ranked where it
did, and nothing is filtered out — a near neighbour with different controls is a good answer.

**It is the catalogue, not the vault.** Every row says `have` or `GET `, and **the difference does
not change what you write**: name a `GET ` widget in a board and the engine fetches it when the note
draws. `install <id>` is still there for taking one before you place it, but you never have to.
Writing a widget because the vault happened not to hold one is the mistake this command exists to
stop.

## Taking a shell

```bash
node {tool} pattern list-detail
```

`sidebar-and-content`, `nested-sidebars`, `list-detail`, `three-pane`, `supporting-pane`,
`full-bleed`. It hands back the skeleton with every region's role, purpose and surface, and the board
keeps `pattern:`, so `lint` catches a region count that does not match, a region holding the wrong
role, and a declared region left empty. Naming a shell in the chat and building something else is
what this replaces.

## Taking a card

```bash
node {tool} card header-body
```

`header-body`, `media-body`, `metric`, `list-row`. Each says what it wears standing alone and among
peers of its kind, and which parts it holds. Every part stands bare on the one plate.

## Checking a widget you wrote

```bash
node {tool} check @you/clock
```

| Finding       | What it means                                                                     |
| ------------- | --------------------------------------------------------------------------------- |
| **colour**    | a colour written by hand; a theme repaints a token and cannot repaint a hex       |
| **type**      | a `font-family` or `font-size` written by hand                                    |
| **unbounded** | rows drawn from a `list` read with no `limit`                                     |
| **role**      | a manifest naming none, so no surface law can judge it                            |
| **reaches**   | a name imported from `widgetarium` that the surface does not carry; it will crash |
| **heading**   | an `h1` or `h2` inside a widget whose role is not `text`                          |

## Measuring a board

```bash
node {tool} layout <note>
node {tool} lint <note> --text
```

`lint` every save. `layout` before claiming a width is right. `surfaces` only when something looks
off on a board already drawn — it reads what is on screen and never hands you surfaces to write.

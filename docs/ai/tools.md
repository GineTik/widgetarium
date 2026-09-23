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
| `start <id>`       | your access to a widget's files, and the progress card in the chat       |
| `check <id>`       | six defects in a widget you wrote; exits 1 while any stands              |
| `bases`            | every base a screen can start from                                       |
| `base <name>`      | one base: its regions, its sections, ready to write into a note          |
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

## Taking a base

```bash
node {tool} base workspace
```

`node {tool} bases` lists them all. Today: `page`, `page-composed`, `workspace`, `split`, `surface`,
`three-pane`, `supporting-pane`, `journal`, `analytics`, `library`, `gallery`, `atlas`, `showcase`, `notebook`, `drill`.

It hands back a whole page: every region with its role, purpose and surface, its sections in several
shapes, and every line of text already written into a `@default/text-line` tile — the page title,
the line under it, a heading and a caption over each section. The only thing it leaves out is the
widgets, and it prints every empty place and what that place is for. The board keeps `base:`, so
`lint` catches a region count that does not match, a region holding the wrong role, and a declared
region left empty.

A base is where a screen starts, not what it must stay. Reshape the tree the moment the design asks
for something else; keep `base:` honest or drop it. Naming a shell in the chat and building something
else is what this replaces.

## Taking a card

```bash
node {tool} card header-body
```

`header-body`, `media-body`, `metric`, `list-row`. Each says what it wears standing alone and among
peers of its kind, and which parts it holds. Every part stands bare on the one plate.

## Starting a widget

```bash
node {tool} start @you/clock --title "Clock"
```

Run it before the first file you write or edit in a widget's folder, once per widget. It says
whether the widget is new, where its files go, and whether it came from a repository — an update
replaces that folder. The chat reads it and shows the person a card, **Building Clock**, whose steps
follow what you do next: writing into the folder, `check`, writing the note, `lint`. `--title` is
the name a person reads; left out, it is made from the id.

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

# Examples

Whole boards, every node's surface written. Build what these build.

## A dashboard with a rail on each side

Navigation left, the work in the middle, what is worth knowing about it on the right.

````markdown
---
widgetarium: { kind: screen }
---

# Sessions

```widgetarium
v: 2
base: three-pane
tiles:
  - id: nav
    widget: "@default/icon-list"
    props:
      entries: { from: vault, path: Boards }
  - id: running
    widget: "@flow/in-flight"
    props:
      flights: { from: vault, path: Sessions, allow: [list, update] }
  - id: bugs
    widget: "@flow/plan-qa"
    props:
      questions: { from: vault, path: Bugs, allow: [list, create, update] }
  - id: tail
    widget: "@flow/session-tail"
    props:
      lines: { from: vault, path: Sessions/live.md }
  - id: notice
    widget: "@flow/notice"
    props:
      title: { from: typed, value: One bug found here }
      body: { from: typed, value: normalizeBoard writes a surface onto a node the person set by hand. }
      tone: { from: typed, value: error }
layout:
  dir: row
  of:
    - dir: column
      role: navigation
      purpose: Where to go
      surface: apart
      side: end
      width: 250
      collapse: { into: drawer, toggle: always }
      of:
        - { id: nav }
    - dir: column
      keep: true
      role: collection
      purpose: The work this vault is doing
      of:
        - dir: column
          role: collection
          purpose: What is running now
          surface: group
          of:
            - { id: running }
        - dir: column
          role: collection
          purpose: What the flow found
          surface: group
          of:
            - { id: bugs }
    - dir: column
      role: detail
      purpose: The session being watched
      surface: apart
      side: start
      width: 320
      collapse: { into: drawer, toggle: adaptive }
      of:
        - { id: tail, surface: group }
        - { id: notice, surface: group }
```
````

The rails are `apart` — a line, no plate. The middle wears nothing; each of its two sections is a
`group`, and the rows the widgets draw inside come back white because a group on a group is white.
The right rail's two tiles are each their own `group` on a rail that has no plate, so both are grey.

## A list, a grid of complete things, and a bar

````markdown
---
widgetarium: { kind: screen }
---

# Music

```widgetarium
v: 2
tiles:
  - id: tabs
    widget: "@default/segmented-switch"
    props:
      options: { from: typed, rows: [{ name: Added }, { name: Title }, { name: Artist }] }
  - id: tracks
    widget: "@media/track-list"
    props:
      tracks: { from: vault, path: Music/Tracks, allow: [list, update] }
      filter: { from: ref, ref: "tabs/selection" }
  - id: albums
    widget: "@media/album-grid"
    props:
      albums: { from: vault, path: Music/Albums }
  - id: player
    widget: "@media/player"
    props:
      tracks: { from: vault, path: Music/Tracks }
      playing: { from: ref, ref: "tracks/selection" }
layout:
  dir: column
  of:
    - dir: column
      keep: true
      role: collection
      purpose: The library
      of:
        - dir: row
          role: collection
          purpose: Every track, filtered the way the switch says
          surface: group
          of:
            - { id: tabs }
            - { id: tracks }
        - dir: row
          role: collection
          purpose: The albums they came from
          of:
            - { id: albums }
    - dir: row
      role: composer
      purpose: What is playing
      surface: apart
      side: start
      of:
        - { id: player, height: 88 }
```
````

The track list is one `group`; its rows are drawn by the widget, not by the board. The album grid
wears **nothing** — each album is a `group` the widget draws itself, and a plate around them would
be an edge drawn twice. The player is `apart` along the bottom.

## A record with a rail of its own

````markdown
---
widgetarium: { kind: screen }
---

# Derive the empty state

```widgetarium
v: 2
base: supporting-pane
tiles:
  - id: tabs
    widget: "@default/underline-tabs"
    props:
      options: { from: typed, rows: [{ name: Summary }, { name: Plan }, { name: Implementation }] }
  - id: body
    widget: "@flow/report"
    props:
      body: { from: vault, path: Tasks/152.md, field: content }
      testPlan: { from: vault, path: Tasks/152/checks }
  - id: progress
    widget: "@default/metric-total"
    props:
      records: { from: vault, path: Tasks/152/steps }
  - id: jump
    widget: "@default/icon-list"
    props:
      entries: { from: vault, path: Tasks/152/links }
layout:
  dir: row
  of:
    - dir: column
      keep: true
      role: detail
      purpose: The task being read
      of:
        - { id: tabs }
        - { id: body }
    - dir: column
      role: indicators
      purpose: Where this task stands
      surface: apart
      side: start
      width: 300
      collapse: { into: drawer, toggle: adaptive }
      of:
        - { id: progress }
        - { id: jump }
```
````

The tabs and the report stand bare in the kept column — a heading and the spacing step already say
they belong together. The rail is `apart`, and each block on it is a `group` that nobody wrote: the
rail's role is `indicators`, and an `indicators` region lays a plate on every widget in it.

## A section, and the two ways it fills

`@default/section` is a widget with `role: layout`. It titles a part of a region and holds what stands
under it. `filling` decides which half of it the settings window even asks for.

````markdown
---
widgetarium: { kind: screen }
---

# Work

```widgetarium
v: 2
tiles:
  - id: projects
    widget: "@default/section"
    props:
      heading: { from: typed, value: Projects }
      badge: { from: typed, value: 5 open }
      filling: { from: typed, value: per-row }
      arrangement: { from: typed, value: grid }
      minWidthPx: { from: typed, value: 280 }
      items: { from: vault, path: Projects, allow: [list] }
    slots:
      item: { widget: "@flow/project-card" }
  - id: today
    widget: "@default/section"
    props:
      heading: { from: typed, value: Today }
      filling: { from: typed, value: placed }
      arrangement: { from: typed, value: column }
    mounts:
      widgets:
        - { name: Reminders, widget: "@default/reminder" }
        - { name: Streak, widget: "@default/streak" }
      controls:
        - { name: Search, widget: "@default/search-input" }
layout:
  dir: row
  of:
    - dir: column
      keep: true
      role: collection
      purpose: The work this vault is doing
      of:
        - { id: projects }
    - dir: column
      role: detail
      purpose: What is waiting right now
      surface: apart
      side: start
      width: 320
      collapse: { into: drawer, toggle: adaptive }
      of:
        - { id: today }
```
````

`projects` fills **per row**: one `@flow/project-card` is drawn again for every note in the folder,
the whole row handed down, and the grid wraps once a card would go under 280px. Nothing is edited per
card — the binding is the edit.

`today` fills **placed**: two widgets a person put there, each keeping its own props and its own
settings, reached from the board itself while it is being edited. Its `controls` stand at the end of
the heading row and govern that section only.

Neither section wears a plate; the arrangement plates what stands in it. `projects` is a `grid`, so
every card is a plate of its own. `today` is a `column`, so its two widgets stand bare. Were `today`
a list of the same kind of row, it would be `rows`: one plate around all of them, a line between.

## Words on the screen

Text is placed with `@default/obsidian-markdown-preview`, or written as markdown outside the block.

| Markdown | Where                                          |
| -------- | ---------------------------------------------- |
| `#`      | once per board, above the block                |
| `##`     | first in a region holding more than one widget |
| `###`    | first in a group, when a region holds several  |

A widget that names itself gets no title above it. Never skip a level, never a second `#`. Text wears
no surface.

---
widgetarium: screen
---

# Orbitask

```widgetarium
tiles:
  - id: boards
    widget: "@task/board-tabs"
    settings:
      tabs: Widgetarium, Marketing Team, Ux Team
      activeTab: Widgetarium
      archived: Untitled 1, Untitled 2, Test
  - id: views
    widget: "@task/view-tabs"
  - id: board
    widget: "@task/kanban-board"
    settings:
      columns: To Do, Doing, Done
    sources:
      tasks:
        path: Orbitask/Tasks
        filters: []
        sort: []
    slots:
      card: "@task/task-card"
  - id: wynttpz
    widget: "@core/filter-panel"
mode: expanded
layouts:
  "4":
    places:
      - id: boards
        x: 1
        y: 0
        w: 2
        h: 1
      - id: wynttpz
        x: 3
        y: 0
        w: 1
        h: 1
      - id: views
        x: 0
        y: 1
        w: 4
        h: 1
      - id: board
        x: 0
        y: 2
        w: 4
        h: 8
  "5":
    places:
      - id: boards
        x: 0
        y: 0
        w: 5
        h: 1
      - id: wynttpz
        x: 3
        y: 1
        w: 2
        h: 1
      - id: views
        x: 0
        y: 1
        w: 3
        h: 1
      - id: board
        x: 0
        y: 2
        w: 5
        h: 9
  "6":
    places:
      - id: boards
        x: 1
        y: 0
        w: 3
        h: 1
      - id: wynttpz
        x: 4
        y: 0
        w: 2
        h: 1
      - id: views
        x: 0
        y: 1
        w: 6
        h: 1
      - id: board
        x: 0
        y: 2
        w: 6
        h: 8
  "8":
    places:
      - id: boards
        x: 1
        y: 0
        w: 7
        h: 1
      - id: views
        x: 1
        y: 1
        w: 4
        h: 1
      - id: board
        x: 1
        y: 2
        w: 7
        h: 8
      - id: wynttpz
        x: 5
        y: 1
        w: 3
        h: 1
  "9":
    places:
      - id: views
        x: 1
        y: 1
        w: 6
        h: 1
      - id: boards
        x: 1
        y: 0
        w: 8
        h: 1
      - id: wynttpz
        x: 7
        y: 1
        w: 2
        h: 1
      - id: board
        x: 1
        y: 2
        w: 8
        h: 8
  "10":
    places:
      - id: views
        x: 0
        y: 1
        w: 8
        h: 1
      - id: boards
        x: 0
        y: 0
        w: 10
        h: 1
      - id: board
        x: 0
        y: 2
        w: 10
        h: 8
      - id: wynttpz
        x: 8
        y: 1
        w: 2
        h: 1
  "11":
    places:
      - id: boards
        x: 0
        y: 0
        w: 11
        h: 1
      - id: wynttpz
        x: 8
        y: 1
        w: 3
        h: 1
      - id: views
        x: 0
        y: 1
        w: 8
        h: 1
      - id: board
        x: 0
        y: 2
        w: 11
        h: 13
  "12":
    places:
      - id: boards
        x: 0
        y: 0
        w: 12
        h: 1
      - id: views
        x: 0
        y: 1
        w: 9
        h: 1
      - id: wynttpz
        x: 9
        y: 1
        w: 3
        h: 1
      - id: board
        x: 0
        y: 2
        w: 12
        h: 12
  "13":
    places:
      - id: views
        x: 0
        y: 1
        w: 10
        h: 1
      - id: wynttpz
        x: 10
        y: 1
        w: 3
        h: 1
      - id: board
        x: 0
        y: 2
        w: 13
        h: 12
      - id: boards
        x: 0
        y: 0
        w: 12
        h: 1
  "14":
    places:
      - id: boards
        x: 1
        y: 0
        w: 13
        h: 1
      - id: views
        x: 1
        y: 1
        w: 13
        h: 1
      - id: wynttpz
        x: 1
        y: 2
        w: 6
        h: 1
      - id: board
        x: 1
        y: 3
        w: 13
        h: 8
  "16":
    places:
      - id: boards
        x: 0
        y: 0
        w: 11
        h: 1
      - id: views
        x: 11
        y: 0
        w: 3
        h: 1
      - id: wynttpz
        x: 14
        y: 0
        w: 2
        h: 1
      - id: board
        x: 0
        y: 1
        w: 16
        h: 10
  "20":
    places:
      - id: boards
        x: 1
        y: 0
        w: 19
        h: 1
      - id: views
        x: 1
        y: 1
        w: 16
        h: 1
      - id: wynttpz
        x: 17
        y: 1
        w: 3
        h: 1
      - id: board
        x: 1
        y: 2
        w: 19
        h: 11
```

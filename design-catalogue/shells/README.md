# Shells

A shell is what every page of an app shares: where navigation lives, where the page header stands, what opens beside a page and how it all folds on a narrow window. It is structure only. The design system paints it; the shell never says a colour, a font or a plate.

An app has **one shell and one design system**, chosen once for the whole app.

**These shells are options, not the only answers.** Take the one that fits the product's tasks; when the tasks need the levels combined another way, combine them and say why in the spec. The rules below still hold.

## Navigation levels

Every shell is a choice of which navigation levels the app has and where each one stands. Slack shows all of them at once:

```
┌────┬────────┬──────────────┬─────────────────────────────┬──────────┐
│ L0 │ L1     │ L2           │ page                        │ L3       │
│apps│sections│ list of the  │ header · tabs               │ detail / │
│    │Home    │ section      │ content                     │ thread   │
│ ▢13│DMs     │ # channel    │                             │          │
│ ▢3 │Activity│ # channel    │                             │          │
│ ▢1 │Files   │ ● person     │ composer                    │          │
│ +  │        │              │                             │          │
└────┴────────┴──────────────┴─────────────────────────────┴──────────┘
```

| Level         | Holds                                                                   | Width                                                          | When an app needs it                                   |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------ |
| L0 · switcher | other workspaces, apps or accounts, as marks with counts                | 64–72px                                                        | the person works in several separate spaces            |
| L1 · sections | the app's top sections                                                  | rail 72–88px (icon + short word) · sidebar 232–256px · top bar | always: every app has sections                         |
| L2 · list     | the items of the open section: channels, projects, folders, saved views | 240–300px                                                      | the section is a list the person moves through all day |
| page          | the page header, then the page's base (`packages/core/src/layouts.ts`)  | flexible                                                       | always                                                 |
| L3 · detail   | one item opened from the page: a thread, a record, a preview            | 320–480px                                                      | the person reads detail without leaving the list       |

**Rules that hold in every shell:**

- **At most three navigation columns on a desktop** (L0, L1, L2). A fourth means two levels should merge.
- **L1 is never in two places.** A sidebar of sections and a top bar of sections on one app is the defect.
- **Each level folds before the page squeezes.** In order: L3 becomes a `sheet`, L2 becomes a `drawer`, L1 becomes a `menu` or a tab bar, L0 hides into the account menu. These are the board's own `collapse` kinds.
- **The page header belongs to the page, never to the shell.** The shell holds navigation and global actions (search, notifications, `New`, the account); everything about the open page stands in its header.
- **One line or one fill separates two shell columns, never both,** and never a shadow (`docs/ai/clean-ui.md`).

## The shells

| Shell         | Levels                                        | Fits                                                | File               |
| ------------- | --------------------------------------------- | --------------------------------------------------- | ------------------ |
| Sidebar       | L1 as a sidebar (+ L3)                        | many sections, nested sections, admin, CRM          | `sidebar.md`       |
| Top bar       | L1 as words across the top (+ L3)             | up to 8 flat sections, wide tables                  | `top-bar.md`       |
| Rail and list | L1 as a rail + L2 list (+ L0, + L3)           | messaging, mail, projects, any app lived in all day | `rail.md`          |
| Tab bar       | L1 as 3–5 tabs at the bottom                  | phone-first apps                                    | `tab-bar.md`       |
| Canvas        | L1 in a menu; floating tools over one surface | editors, maps, boards, design tools                 | `canvas.md`        |
| Command-first | L1 hidden; one input leads, history below     | AI assistants, search-led tools                     | `command-first.md` |

Shells combine through the levels: the rail shell is a sidebar shell with L1 narrowed and L2 added, and any shell may add L0 or L3. On a phone every shell becomes the tab bar shell with a stack of pages.

## Pages inside a shell

The page is cut by a base, whatever the shell:

| Page                                | Base              |
| ----------------------------------- | ----------------- |
| Home / overview                     | `page-composed`   |
| A collection (ledger)               | `workspace`       |
| A list and its records side by side | `three-pane`      |
| One record                          | `supporting-pane` |
| Reports                             | `analytics`       |
| From a figure to its rows           | `drill`           |
| Settings                            | `page`            |

Tables, boards and calendars take their region's full width; prose and forms keep a readable column (≤ 720px).

## Prior art

| Product                        | Levels it uses                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Slack                          | L0 workspaces · L1 rail (Home, DMs, Activity, Files) · L2 channels and people · page · L3 thread               |
| Apple split view (Mail, Notes) | L1 sidebar · L2 list · page as the detail; on iPhone one column at a time                                      |
| Material 3                     | L1 by window width: navigation bar (phone) → rail (tablet) → drawer (desktop); list-detail for L2 and the page |
| Linear                         | L1 sidebar with nested sections · page · L3 peek                                                               |
| Zite CRM                       | L1 top bar of words · page · L3 sheet                                                                          |

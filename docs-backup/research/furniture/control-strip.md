# When a list gets a strip of controls, and when it correctly has none

Twelve products, September 2026. One live reading: GitHub's Issues experience and a GitHub directory listing, headless Chrome at **1440×900**, rectangles from `getBoundingClientRect`. Those are the only pixel numbers here. Everything else is from published help centres and changelogs, and anything unsourced is marked **[unverified]**.

## The hypothesis was wrong

The engine measures cardinality at step 2, so the hypothesis was that a control strip appears exactly when the record count is unbounded. **It is false**, and the counter-examples are not marginal:

- **Apple Reminders** — unbounded lists, no strip at all. Sorting is a menu-bar item: "Choose View > Sort By, then choose a sort option (Due Date, Creation Date, Priority, or Title)" ([Apple](https://support.apple.com/guide/reminders/sort-reminders-in-lists-remn922d0b42/mac)).
- **Linear's Triage and Inbox** — unbounded in principle, and grouping is deliberately removed: they "only let you update the ordering and not grouping properties", and views that do not support them show no Display options button at all ([Linear](https://linear.app/docs/display-options)).
- **Google Calendar** — an unbounded event set with no filter, sort or group anywhere on the screen.
- **GitHub, inside one product at one viewport** — `microsoft/vscode` Issues (18,514 open) carries a search field plus six dropdowns; `microsoft/vscode/tree/main/src` (~25 entries, also a list, also in a repo) carries no filter, no sort, no group. The column headers `Name / Last commit message / Last commit date` are labels, not controls. Three orders of magnitude apart in count; what differs structurally is that one list is a query result and the other is a folder.

## The five findings that change an engine's design

**1. The strip tracks whether the set is *queried* or *navigated to*.** Every list whose membership answers a query carries controls. Every list whose membership is fixed by the place you are standing in carries none. This single predicate explains every product in the survey.

**2. Individual controls are gated by variety in the data, and the thresholds are tiny.** Jira reveals each filter only once it would do something: the Epic filter appears "after you've created your first epic", Label "after you've added a label to at least one work item", work type "after you've created more than one type of work item" ([Atlassian](https://support.atlassian.com/jira-software-cloud/docs/show-or-hide-issues-on-your-board/)). Notion gates database search on a count, and the count is **three**: "Databases that contain at least three pages will also be searchable" ([Notion](https://www.notion.com/help/search)). Not a thousand. Cardinality enters as `≥3 rows` for search and `≥2 distinct values` per filterable property — never as a rule about the strip as a whole.

**3. Saved views fork on scope, and the fork is architectural.** A view over *many* sources becomes **navigation**; a view over *one* source stays a **tab on the screen**. Linear, Airtable, GitHub, Jira, Todoist and Height put them in the sidebar; Asana puts them in the project header — "save the view as a tab in your project", up to 50 per project, one settable as everyone's default ([Asana forum launch](https://forum.asana.com/t/surface-the-most-relevant-information-by-saving-views-for-you-and-your-team/489251)). Nobody puts a cross-source view in a tab and nobody puts a per-project layout in the global sidebar. Notion sits on both sides because a Notion view is simultaneously a block in a page and a child of a database.

**4. Group-by is a control in list and board, and *structure* in calendar and timeline.** The layout decides: a board **demands** a grouping — "By default, your board will be grouped by a status property if your database has one" ([Notion](https://www.notion.com/help/boards)) — a list takes it optionally as bands, and a calendar has already spent its main axis on the date, so it must not be offered. Changing group-by does not change the layout kind; the dependency runs the other way.

**5. Grouping and manual order are mutually exclusive, and products say so outright.** Todoist: "If a grouping option is applied to a project or view, you can't drag or manually reorder your tasks" ([Todoist](https://www.todoist.com/help/articles/sort-or-group-tasks-in-todoist-WFWD0hrb)). Linear keeps manual order as one ordering option, workspace-wide, and notes "Board views and List view cannot be ordered independently" ([Linear](https://linear.app/docs/board-layout)). An engine offering both at once is offering a contradiction.

## Packaging: two shapes, and they do not mix

**One button holding everything, top-right** — Linear (Display options, `Shift`+`V`), Todoist (Display), TickTick (Sort), and Notion's View settings. Three independent products converged on it.

**A laid-out bar starting top-left** — Airtable (hide fields, filter, group, sort, colour, row height, search, share, print, CSV — the maximal case, and the community answer to "can I hide it" is that you cannot), Jira (assignee avatars, Epic, Label, work type, quick filters), GitHub, Asana.

**Measured, GitHub at 1440×900:** search input at y=336, h=30, w=1090, pre-filled with `is:issue state:open`; the control row at y=391, h=32, with `Open 18,514` / `Closed 235,324` left and `Author, Labels, Projects, Milestones, Types, Sort by` right-aligned to x=1407; first list row's title at y=442. **The strip occupies ≈87px and 95px separate its top from the first row.** No other product publishes its strip's vertical budget, and no height here is guessed.

Every product with a strip pins it inside the main region, above the list. **Zero products put list controls in the window chrome** — the chrome carries global search and app navigation, and that consistency is the entire scope affordance. The only unpinned strip is Spotify's in-playlist row: "Pull down and release to display filters and a search bar at the top" — the mobile answer to a control that is real but not worth 44pt of a phone screen.

## What the screens with no strip share

Evidence: GitHub's directory listing (live), a Google Calendar week, an Apple Reminders list, Linear's Triage and Inbox, a Notion database under three rows.

They share **none of**: small row counts, simplicity (a calendar week is dense), or being read-only (a Reminders list is fully editable). What they actually share:

1. **Membership is given by the place, not by a query.** A folder holds what it holds; a week holds what falls in it; Triage holds what has not been triaged.
2. **The ordering is already meaningful and owned by something else** — alphabetical with folders first, chronological, arrival order. A sort control would destroy the thing the screen is for.
3. **There is exactly one sensible axis**, so group-by has nothing to offer.
4. **The set is the unit of work.** You are here to empty it, walk it or read all of it, not to find a subset within it.

A fourth, weaker predicate worth encoding because it is cheap: **derived lists give up the affordances that depend on an owner of the order.** Todoist's filter and label views "always use their default sorting order and can't be manually reordered" while a plain project can be; Linear's Triage loses grouping.

## Search scope is signalled by region, never by a label

No product in the survey labels its search's scope in words. All of them keep list-search and global-search on different surfaces, and the placement is the whole affordance. GitHub adds one trick worth copying: the field shows the active query (`is:issue state:open`), which makes the scope literal. Notion's database search is scoped by field as well as by set — it "looks at database page titles and properties". Airtable's view search reportedly *highlights* matching cells while leaving non-matching records visible **[unverified against Airtable's own docs]** — the most interesting control semantic in the survey and the least well sourced.

**A search box that floats without a region is unreadable.**

## The rule this corpus supports

```
strip(node) = the binding is a query over a source
              AND the layout has not already spent its main axis on the ordering
              AND at least one declared prop has ≥2 distinct values in the page just read

  search   ⟸ ≥3 rows, scoped to this node, the active query shown in the field
  filter   ⟸ per prop, only where that prop has ≥2 distinct values
  sort     ⟸ order is not the node's own meaning
  group    ⟸ the layout's main axis is free — list yes, board takes it, calendar refuses
  density  ⟸ a row draws more than one line of content
  layout   ⟸ more than one layout is declared for this data

saved view ⟸ one source  → a tab on this screen
              many sources → an item in navigation
```

**The useful part: the binding and the layout are both known before a single row is measured**, so the strip can be laid at read time, the way a surface now is. Cardinality enters only through the two tiny gates.

A second axis worth copying is **ownership of the view**. Airtable's personal / collaborative / locked triple and Asana's save-for-everyone are explicit; Todoist states the opposite default, that display settings are private. A view system with no ownership model ends with one person's sort silently rearranging everyone's screen — Linear warns about exactly this for manual ordering, which "will update the manual order for everyone in the workspace".

## Negative findings

- **No product publishes its strip's vertical budget.** Only GitHub was measured.
- **Asana's article bodies are JS-gated** — the control *placement* claim rests on a search snippet, not a page that was read. The saved-views tab behaviour is solid; it comes from Asana's own launch post.
- **Height is thin.** Both direct fetches failed at the socket level; every Height claim is second-hand. Treat it as indicative only.
- **Apple's iOS Reminders guide would not render**; the iPhone menu detail is third-party. The Mac behaviour is from Apple directly.
- **Nobody verified that a two-row Notion database or a three-task Asana project still shows the full filter, sort and group controls.** The docs imply the toolbar is a property of the object type and Notion's search gate implies the rest are not gated, but nobody put one on screen and looked. **If the engine's rule hinges on it, that is the one experiment worth running.**
- **No product removes a strip when a filter empties the list.** Whether a zero-row queried list keeps its controls is unstated everywhere; presumably yes **[unverified]**, since otherwise the person could not undo their own filter.

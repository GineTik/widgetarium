# Ten screens Obsidian users want and cannot get

Gathered September 2026 from forum.obsidian.md (Discourse topic JSON), official plugin download counts, and the official roadmap. **Reddit was unreachable**, so nothing here rests on it.

Numbers marked ✓ come from `forum.obsidian.md/t/<id>.json` or the official plugin pages.

## The one that is over-asked and under-served

**A status board that is a view of the notes themselves.**

- **236 likes, 43 posts, 11,317 views** ✓ on one request — nearly triple the next Bases view request.
- **2,679,528 downloads** of a Kanban plugin that stores the board as a *separate markdown file with its own format*, so dragging a card changes nothing about any note's `status`.
- Both available implementations are unmaintained, and users say so in the language of churn: *"The abandonment of the kanban plugins is making me seriously consider abandoning Obsidian."*
- Obsidian has put "Kanban view for Bases" as **Active** on its roadmap — but Bases still cannot read tasks at all: staff reply, *"The actual task details are in the file contents, which aren't read by bases."* So even the official answer will not cover checkbox tasks, which is how most people record what they would put on a board.

Runner-up: **the same gap on a date axis.** Calendar view is only *Planned*, and date **ranges** (start→end) are explicitly what nothing can express.

## What people complain about in existing dashboards

- **Load time, from stacking queries.** A work dashboard of Dataview blocks opens in 1–2 seconds, answered on the forum with "that's relatively normal". **The screen gets slower with every region added — the direct enemy of a tiled layout.**
- **The app freezes on interaction.** *"everytime i check some task, all obsidian freezes for some second to update the dataview view"* — a 1,500-note vault. Mirrored in Dataview issues #1154, #1455, #1226.
- **Everything is a table.** *"the current file explorer presents our notes as a mere list of titles — missing the rich visual context that makes note-taking apps like Craft, Google Keep and Evernote so delightful to use."* One user moved workflows to Keep and Notion for gallery view.
- **Layout is hand-built CSS inside markdown.** The most-copied homepage template is flexbox plus multi-column admonition callouts. The community's layout answer is a CSS snippet collection. **People are writing stylesheets to get two columns.**
- **Fragility, named as such.** The best habit-tracker guide's repo went private and the community re-hosted the vault; the novel-writing panel needs a manual "Force refresh all views and blocks"; Full Calendar, Charts, Longform, Citations and Zotero Integration have each gone 2–4 years without a release.

## The ten

### 1 · Today — the plan on a time axis
**Demand:** reminders thread 554 likes, 117 posts, **36,872 views** ✓, open since 2020. Bases/tasks 113 likes ✓. Tasks 4,271,134 downloads · Calendar 3,117,339 · Day Planner 888k · Periodic Notes 762k.
**Records:** checklist lines with `due`, `scheduled`, `priority`; event notes with `startTime`/`endTime`.
**Questions:** what must be done today and what is overdue · what is on the clock and where are the gaps · what rolled forward from yesterday · what is coming that I should start now · what did I finish.
**Cardinality:** 5–40 tasks/day, unbounded across the vault; 0–10 timed events; 3–5 buckets.
**Drivers:** time axis **dominant** (hours in a day) · status binary+deferred · no image · weak headline number.

### 2 · A status board over notes
**Demand:** **236 likes, 43 posts** ✓ — the highest-liked Bases view request. Kanban plugin 2,679,528 downloads; its showcase 369 likes, 248 posts, 76,793 views ✓. **Active** on the roadmap.
**Records:** notes with a `status` enum, plus `project`, `due`, `priority`. The column is a value of one field.
**Questions:** what is in flight and how much · what is blocked and by what · what is next to pick up · where is this one thing (and can I move it) · is any column overloaded.
**Cardinality:** 20–200 records bounded per project; **3–6 columns, a small closed enum.** Column count is the layout decision.
**Drivers:** status **is** the screen · time secondary as badges · no image · per-column counts.

### 3 · The shelf — reading and media with covers
**Demand:** a cluster of five threads rather than one. Grid/Masonry 29 likes; Bases Gallery 23 likes, 4,538 views ✓; Images in table 29 likes; Note Previews 27 likes, 6,492 views ✓ (open since 2020); Library/Bookshelf 10 likes ✓. Book Search 231,901 downloads. One OP moved workflows **to Google Keep and Notion** for gallery view — churn, not a wish.
**Records:** one note per title with `cover`, `status`, `rating`, `dateStarted`, `dateFinished`.
**Questions:** what am I in the middle of · what is next · what did I finish this year and did I like it · **which one is this, recognised by its cover** · how far through am I.
**Cardinality:** 50–1,000 records, unbounded and growing. **The one screen whose record count exceeds what a page should draw — it needs paging from row one.**
**Drivers:** **image is the point** · status yes · time secondary · "n this year".

### 4 · Streaks — habits and the year heatmap
**Demand:** five threads. Habit tracker guide 29 likes, **33,634 views** ✓; Daily/Weekly reviews 101 likes, 29,537 views ✓; Bases heatmap view (new) ✓. Tracker 364,000 downloads · Heatmap Calendar 176,000. **The guide's repo went private and the community re-hosted it.**
**Records:** daily notes keyed by date with boolean or small-integer fields. **The absent day is itself data.**
**Questions:** did I do it today · what is my streak and did I break it · trending up or down · which weekday do I keep missing · how does this year compare.
**Cardinality:** 3–12 habits (bounded, named) × 365 days = **1,000–4,000 cells. Cardinality forces the calendar grid; a table cannot hold it.**
**Drivers:** time axis **is** the drawing · headline number = streak · status only as done/not · no image.

### 5 · The vault home page / MOC index
**Demand:** Homepage plugin **1,341,021 downloads** — a plugin whose only job is "open this note first", which is evidence a home screen is wanted before any content is defined. Dashboard++ 107 likes, **100,096 views** ✓. All-encompassing homepage template 36 likes, 50,502 views ✓. Ideaverse/LYT Kit 783 likes, 220,719 views ✓.
**Records:** folders and tag sets; notes with `type`; recently modified; orphans; the MOC notes themselves.
**Questions:** where do I go from here · what did I touch recently · what is in the inbox unfiled · what is orphaned, i.e. lost · how big is each area.
**Cardinality:** 6–15 entry points (bounded, hand-chosen), each region showing 5–10 rows of thousands. **Many small bounded lists — the opposite cardinality of the shelf.**
**Drivers:** time weak (recency) · no status · optional icons · per-area counts.

### 6 · Project and deadline overview
**Demand:** Gantt/Timeline for Bases 63 likes ✓. Sales work dashboard 72 likes, **62,293 views** ✓. Dataview task and project examples 178 likes, 81,536 views ✓. TaskNotes 1,610,608 downloads.
**Records:** project notes with `status`, `client`, `start`, `due`, `owner`; task lines tagged to a project; meeting notes linking it.
**Questions:** what is due this week across all projects · which project is at risk, overdue or untouched · next action on each · who am I waiting on · how do they overlap in time · what did this project produce.
**Cardinality:** 5–30 active projects (bounded) over 50–500 tasks (unbounded). **Two cardinalities on one screen — a short group list over a long item list — which is why it always becomes nested regions.**
**Drivers:** time axis is a **span** (start→due), not a point — the distinction Gantt asks for and nothing gives · status yes · headline number yes · no image.

### 7 · The literature surface
**Demand:** Zotero/Dataview workflow 281 likes, **110,177 views** ✓. Citations announcement 406 likes, 381 posts, 86,263 views ✓. Zotero Integration 562,000 downloads · Citations 236,000. PDF annotation is **Planned** — the missing half.
**Records:** literature notes with `citekey`, `year`, `status`, `topics`, highlight blocks inside them, and permanent notes citing back.
**Questions:** what have I collected on this question and what does each say · **what have I not read or not processed** · which sources disagree · which of my notes cite this · what is the shape of the field over time.
**Cardinality:** 100–2,000 sources (unbounded), **10–50 per active topic (the working set is bounded and small)**. Groups are topics, not statuses.
**Drivers:** status yes · time axis as **publication year — a distribution, not a schedule** · no image · "n unprocessed".

### 8 · Writing progress
**Demand:** StoryLine **161 likes, 143 posts in ~7 months** ✓ — the fastest-accumulating thread in the whole report. Novel-writing panel 28 likes ✓. Longform 185,000 downloads.
**Records:** scene notes with `order`, `wordGoal`, `status`, `pov`, `characters`; a project note with a total goal.
**Questions:** how many words today, am I ahead or behind · how far through the draft · which scenes are still drafts and where are the gaps · where does this character appear · what happens next in story order.
**Cardinality:** 30–120 scenes (bounded by the book), 10–40 characters (bounded), 1 headline goal. **The one screen whose record order is authored, not sorted.**
**Drivers:** headline number **dominant** — words against a goal · status per scene · time as narrative order plus a session count · no image.

### 9 · A number over time
**Demand:** carried by installs, not threads. Tracker 364,000 · Charts 325,000, **both effectively unmaintained** (Charts last updated ~3 years ago). Exercise/workout ideas 20 likes, 17,542 views ✓. A forum search for "sleep mood weight tracking" returned **zero** topics — the demand is in installs and GitHub, not the forum.
**Records:** daily or session notes with numeric inline fields, or exercise sets as list lines.
**Questions:** what is the number now and which way is it moving · is this session better than the last · best ever / 30-day average · **which day produced this outlier — take me to that note** · did I log anything this week.
**Cardinality:** 1–10 series (bounded, named), each 100–2,000 points (unbounded). **Cardinality inverted from every other screen: few groups, very many rows, and the rows are never read individually.**
**Drivers:** time axis continuous and primary · headline number = current value plus delta · no status · no image.

### 10 · Meal plan to shopping list
**Demand:** 77 likes, 25 posts, **74,696 views** ✓ from a single 2022 tutorial with no plugin behind it — more views than the sales dashboard and more than the homepage template. **The entire demand is being served by one forum post.**
**Records:** recipe notes with an `ingredients` list, `tags`, `servings`, `lastCooked`; a week note naming a recipe per day slot.
**Questions:** what are we eating this week, by day · what do I have to buy, as one list I can carry · what do I already have · what can I cook from the cupboard · what have we not eaten in a long time.
**Cardinality:** 7–21 slots (**bounded — a week is a fixed grid**), 50–400 recipes (unbounded), 20–60 derived lines in 5–8 aisles. **The only screen whose main output is computed from a selection rather than filtered from a set.**
**Drivers:** time as a **fixed 7-slot grid, not a scroll** · status on the derived checklist · optional image · no headline number.

## Two shapes that came up short

**Finance ledger** — a forum search for "finance budget expenses money" returned **zero** topics; no finance plugin is near the top 25 (Ledgr shows "1,000+"). **Personal CRM** — the dedicated plugin has **337** downloads; people threads run 1–3 likes. Both are genuine shapes, but on this evidence they are wants of a few. The follow-up demand that does exist lives inside the reminders thread instead.

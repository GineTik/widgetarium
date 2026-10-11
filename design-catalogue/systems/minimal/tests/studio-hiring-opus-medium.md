# quiet-white × studio-hiring (opus, medium effort)

App: `/private/tmp/claude-501/-Users-denissevcuk-Projects-Obsidian-Plugins-widgetarium/22f130da-0f48-4b13-a98f-7ad9a01d6412/scratchpad/quiet-white-hiring/`, made with `widgetarium create` from the packed engine. Screens: `screens/` in that folder, 12 PNGs at 1440 wide. Wall clock: about 20 min.

## TL;DR

A hiring tracker for Halden Studio, an invented 12-person studio in Lisbon. It has five routes, three dialogs and one candidate sheet, and every element is a stock kit component. Data comes from handlers in `src/logic/hiring` over an in-memory store. Adding a note and adding a candidate were pressed through in headless Chrome, and both changed the screen.

## Structure, from the tasks

| Task in the brief                                     | Route                                  | Centre of the screen                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open roles and how many candidates are at each step   | `/`                                    | one plate per role with its five step counts; above them, one card saying how many people wait on the studio                                                           |
| Go through one role, move candidates                  | `/roles/:role`                         | one `Section` per step (empty steps say so), the candidates in `Rows`, a step `Select` on every row; a press on a row opens the sheet                                  |
| Open a candidate: links, notes, task, note, next step | `/candidates/:candidate` and the sheet | page: notes and the note field on the left; next step, task, links and details on the right. Sheet: the same parts in one column, with notes above the reference parts |
| Add a candidate or a role quickly                     | dialogs                                | `Add candidate` on the pipeline, `New role` on the overview                                                                                                            |
| Who waits on the studio and for how long              | `/waiting`                             | `Rows` sorted by wait, longest first, filtered by owner with `Segmented`; a wait of 7 days or more wears the warning `Badge`                                           |
| Settings for steps and people                         | `/settings`                            | `Tabs`: Steps (reminder days, a "counts as waiting on us" `Switch`) and People (access `Select`, owners locked)                                                        |

Each route's board is a root row: the `hiring-nav` sidebar tile in a 264px box, then the screen widget in the `keep` box.

## Decisions and why

- **One black button per screen**, the action that moves the work: New role, Add candidate, Schedule next step, Invite someone. The waiting list has none: its action is per candidate, inside the sheet.
- **Sheet for a candidate, dialog for a quick write.** This follows the system's table. The sheet stays open while a note is added or the step changes, and Schedule opens a dialog over it. The candidate also has a full page, because the brief names it as a screen. Both draw one `CandidateFile`, so they cannot drift apart.
- **Lists are `Rows`, roles are separate plates.** A candidate list is the kit's `Rows`: one plate with hairlines. Roles are few and each carries a row of counts, so they are a one-column `Grid`, one plate each, as in reference 3. The decision note below explains why the kit forced this split.
- **Most of the page stands on white.** Titles, the role line, the filter, section titles and empty-step lines have no plate. The stand-alone `Card`s each have one job: the waiting summary, the next step, the task result.
- **Counts in grey when zero**, using `text-muted-foreground`. The accent appears only on the selected sidebar item.
- **The next step defaults to the step after the current one** (`stepAfter` in the schema), so scheduling a candidate at Task offers Interview.
- **No pictures.** The candidates are invented, so a photo would put a real face on a made-up person. Avatars show initials.

## Where the kit lacked a part

- **Separate row plates.** `Row` takes no `variant`. A run of `Item variant="muted"` siblings each gets a plate, but the kit's `.wg-kit-row + .wg-kit-row` hairline still draws between them, across the gap. I used `Rows` for lists and `Grid min={680}` with `LayoutItem` for the roles.
- **Overlay scope.** `Container` marks itself as the overlay layer, so a `Dialog` inside it greyed out only the content column and left the sidebar bright. Every dialog and the sheet are now rendered beside the `Container`, and the scrim covers the window.
- **No sidebar badge part.** Counts in `SidebarMenuButton` are `RowValue` after a `RowLabel`.
- **Step counts on a role row** are two spans in Tailwind flex classes (`text-lg`, `text-xs text-muted-foreground`), because the kit has no stat cell smaller than a card.
- **Sidebar edge.** `variant="sidebar"` draws a hairline on its inline end. A board box is only as tall as its content, so the line ends under the user row instead of running to the bottom of the window. The default `solid` surface left faint corner marks on white.

## Checked

- `npm run typecheck` is clean, and `npm run check` reports no findings.
- `vite build` passes. A headless Chrome script (`scratchpad/shoot.mjs`, CDP over Node's WebSocket) served `dist/` and drew all five routes, the People tab, the sheet and all three dialogs. Every shot logged zero console errors or exceptions.
- **Flows.** I typed a note into the sheet and pressed Add note; the note appeared first with "today" and the count went from 3 to 4 (`11-flow-note-added.png`). I filled the Add candidate dialog and submitted it; Inês Carvalho appeared under Applied, the step count went to 4 and the role line went to "8 in process" (`12-flow-candidate-added.png`).
- **Fixes after looking at the screenshots:**
  - the scrim did not cover the whole window
  - hairlines were drawn between separate plates
  - the Task block's paragraph spacing was off, so it is now a `Card`
  - the step `Badge` repeated the step `Select`
  - the schedule dialog defaulted to the current step
  - in the sheet, notes sat below the reference parts

## Not checked

- Moving a candidate through the step `Select`, changing access, switch and reminder writes, New role and Invite submit. They call the same command path as the two flows above, but nobody pressed them.
- **Other tiles do not refresh after a write.** A command re-reads only its own tile, so the sidebar still says 7 and 10 after a candidate is added (seen in `12-flow-candidate-added.png`). A shared refresh would need the engine.
- **The store is in memory.** A reload brings back the seed data.
- Dark theme, narrow widths, keyboard paths and contrast were not tested. The app was not opened inside Obsidian.

# What people actually ask Obsidian for

`RESEARCH` · 2026-08-30

## TL;DR

The one enormous, still-live demand this mechanism sits next to is **state edited where it is
written** — Meta Bind's 507,948 downloads and the #1 all-time feature request (1,078 likes, last
post July 2026) are the same wish said twice. The `![[main.py]]` code embed is real but small —
five threads over five years, ~10k cumulative views, four plugins sharing ~18.5k downloads — and it
cannot use that spelling here, because our rules run as a markdown POST-processor and by then
`![[main.py]]` is no longer text. Syntax highlighting is genuinely free: build a fenced block and
hand it to `MarkdownRenderer.render`, which is what the one recently-shipped plugin in this niche
already does.

---

## 1. How this was measured, and what the numbers are worth

Three sources, in descending order of trust:

| source                        | why it is trusted                                         | how it was read                                                        |
| ----------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| `community-plugin-stats.json` | Obsidian's own install counter, not self-reported         | fetched 2026-08-30 from `obsidianmd/obsidian-releases`                 |
| forum.obsidian.md             | likes and views are per-topic and public                  | Discourse JSON API (`/t/<id>.json`, `/c/…/l/top.json`, `/search.json`) |
| GitHub issue reactions        | 👍 on an open issue is a person who came back to press it | GitHub search API, sorted by reactions                                 |

**Downloads are the strongest signal available.** A forum like costs one click from someone already
on the forum; an install is a person who wanted the thing enough to find it. Where the two disagree,
the download count is quoted first.

**Two gaps, stated up front.** r/ObsidianMD could not be sampled: Reddit refuses the JSON API from
this environment and blocks the search crawler outright. Nothing in this document rests on Reddit.
And the forum's **"Plugins ideas" category is marked "Archival in progress"** (1,774 topics) — the
place the brief pointed at is being shut down, and plugin-shaped demand has moved into
**Feature requests** (6,031 topics), which is where the top-list queries below were run.

---

## 2. The evidence

### 2.1 Demand this mechanism is adjacent to

| what people want                                                           | weight                                                                                                                 | when                            | link                                                                                                                                               |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit an embedded note/block **in place**, without opening it               | **1,078 likes · 30,962 views · 207 posts · 105 people** — the #1 topic by likes in the whole Feature-requests category | 2021-03-26 → **2026-07-18**     | [t/15339](https://forum.obsidian.md/t/edit-transcluded-embedded-notes-blocks-in-place-likely-requires-wyswyg-first/15339)                          |
| Render a block embed **inline**, in the flow of a sentence, not as a block | **554 likes · 19,215 views · 107 posts · 80 people**                                                                   | 2021-11-14 → **2026-07-24**     | [t/27093](https://forum.obsidian.md/t/a-proposal-for-rendering-block-embeds-inline/27093)                                                          |
| Inline input fields bound to note properties                               | **507,948 installs** (Meta Bind), 75 open feature issues                                                               | shipped, actively developed     | [plugin](https://github.com/mProjectsCode/obsidian-meta-bind-plugin) · [issues](https://github.com/mProjectsCode/obsidian-meta-bind-plugin/issues) |
| Editing property values from inside the note, not the sidebar              | **325,408 installs** (Metadata Menu)                                                                                   | shipped                         | [stats](https://www.obsidianstats.com/plugins/metadata-menu)                                                                                       |
| **"Burn out" a live query** — replace the fence with its result            | **126 reactions (118 👍) · 142 comments · still open**                                                                 | 2021-03-18 → updated 2025-09-01 | [dataview#42](https://github.com/blacksmithgu/obsidian-dataview/issues/42)                                                                         |
| An `EDIT` query mode — write back through query results                    | 8 reactions · 9 comments · open                                                                                        | 2021-04-19                      | [dataview#116](https://github.com/blacksmithgu/obsidian-dataview/issues/116)                                                                       |
| Metadata attached to a **block**, not a note                               | 25 likes · 852 views · 17 posts                                                                                        | 2025-12-27 → **2026-07-28**     | [t/109351](https://forum.obsidian.md/t/block-level-properties-metadata-below-the-note-level/109351)                                                |
| Show a computed formula **inline** in the note body                        | 14 likes · 390 views · 11 posts                                                                                        | 2025-11-26 → **2026-08-27**     | [t/108400](https://forum.obsidian.md/t/display-formulas-inline/108400)                                                                             |

### 2.2 The code-file embed, every thread I could find

| thread                                                                                                                                                              | likes | views | posts | dates                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ----- | ----- | ----------------------- |
| [Custom renderers for fenced code blocks / embedded content](https://forum.obsidian.md/t/custom-renderers-for-fenced-code-blocks-embedded-content/1149)             | 29    | 7,300 | 12    | 2020-06-03 → 2021-10-01 |
| [Embed code file](https://forum.obsidian.md/t/embed-code-file/5215)                                                                                                 | 17    | 4,312 | 5     | 2020-09-02 → 2021-01-23 |
| [Embed file as a code/pre block (contents, no processing)](https://forum.obsidian.md/t/embed-file-as-a-code-pre-block-i-e-contents-with-no-processing/39852)        | 7     | 2,522 | 9     | 2022-07-04 → 2022-08-27 |
| [Rendering/embedding code files](https://forum.obsidian.md/t/rendering-embedding-code-files/37841)                                                                  | 1     | 2,239 | 3     | 2022-05-22 → 2024-02-21 |
| [Embed *.txt file with rendering like PDF?](https://forum.obsidian.md/t/embed-txt-file-with-rendering-like-pdf-and-other-file-types/83980)                          | 3     | 839   | 5     | 2024-06-19 → 2024-06-20 |
| [Open code files of various types with syntax highlighting](https://forum.obsidian.md/t/open-code-files-of-various-types-with-syntax-highlighting/26484)            | 1     | 984   | 2     | 2021-11-01 → 2022-05-06 |
| [Is there a plugin to show content of custom file as code block](https://forum.obsidian.md/t/is-there-a-plugin-to-show-content-of-custom-file-as-code-block/106047) | 0     | 89    | 4     | 2025-09-24              |

Installed reality, same niche:

| plugin                                                                     | installs  | last release | note                                                                     |
| -------------------------------------------------------------------------- | --------- | ------------ | ------------------------------------------------------------------------ |
| [Embed Code File](https://github.com/almariah/embed-code-file)             | **8,930** | ~4 years ago | 15 issues, top ones open since 2022, incl. "Not Working in live preview" |
| [Quoth](https://github.com/erykwalder/quoth)                               | 7,501     | —            | quotes any file with ranges; not code-specific                           |
| [Code Suite](https://github.com/felixleopold/obsidian-code-suite)          | 1,937     | 2026         | supports `![[script.py]]`; bundles **Shiki with 65 themes**              |
| [Code File Embed](https://github.com/williansaez/obsidian-code-file-embed) | **182**   | 2026-07-01   | 3 stars; 4 source files; the cheap implementation                        |

**Total across all four: ~18,550 installs — 3.7 % of Meta Bind alone.** This is a real, recurring,
low-intensity request. It is not a growth market, and the abandoned incumbent has held the top of it
for four years without anyone displacing it.

### 2.3 What the community is actually asking for in 2026

Top of Feature requests, `period=yearly`, read 2026-08-30: **eight of the top twenty-two topics are
about Bases**, Obsidian's native database — [multi-group](https://forum.obsidian.md/t/bases-group-by-sorting-improvement-make-a-note-fall-into-multiple-groups/107097)
(155 likes, 2,979 views, 2025-10-21), foldable groups, drag-to-sort, multi-level grouping, formulas
in sort order, an editable checkmark in list view, card-view options, a refresh button. The 2026
appetite is for the native database, not for new note syntax. Any inline-widget pitch is competing
for attention against Bases, not against Meta Bind.

---

## 3. Ranked recommendations

### 1. A value that is edited where it is written — the Meta Bind job, with arbitrary widgets

**What it is.** A rule captures a line; the widget draws a control; the control writes the line back.
`@default/rating`, `@default/status`, `@default/slider`, `@default/date` — but the point is not the list,
it is that a person can write their own and bind it to their own trigger.

**Evidence.** The strongest in this document. 507,948 installs of Meta Bind and 325,408 of Metadata
Menu, plus the two forum threads that are still being posted in five years later
([block-level properties](https://forum.obsidian.md/t/block-level-properties-metadata-below-the-note-level/109351),
[inline formulas](https://forum.obsidian.md/t/display-formulas-inline/108400)). Meta Bind's own 75
open feature issues are the shape of the residual demand: people want field types it does not have.

**Cost against what exists.** Close to zero. `passageHere` in `src/inline-render.js` already gives
`content`, `canUpdate` and `update(next)`, and `renderSpan` already re-spells the trigger for
`line` and `wrapped` modes. This is the mechanism working as designed; the work is widgets, not
plumbing.

**What would make it fail.** Three things, in order of danger.

- **The incumbent is good.** Meta Bind has 21 field types, a documentation site and years of edge
  cases. "You can write your own" only beats that for people who will write one.
- **Our trigger cannot go where theirs goes.** `probeOf` (`src/inline-render.js`) deliberately blanks
  a line whose leading element is `CODE`, so a trigger can never live inside backticks — and
  Meta Bind's entire syntax (`` `INPUT[toggle:done]` ``) lives inside backticks. That rule is right
  (a person quoting `!` must not fire it), but it means the familiar spelling is unavailable and every
  trigger is bare text that a person could type by accident.
- **Regex rules cannot write back at all.** `renderSpan` returns `null` for `mode: "regex"`, so
  `canUpdate` is false. A regex rule is read-only by construction — worth saying out loud in the UI,
  because "my widget will not save" is otherwise a mystery.

### 2. `![[main.py]]` as a code block — worth building, wrong spelling

Full answer in §4. Short version: real, small, prior art exists and one of the four implementations
is honest and cheap; take its shape, not its syntax.

**Evidence.** §2.2 — seven threads across five years, ~18k cumulative views, ~18.5k installs split
four ways, and the leader abandoned since 2021 with open bugs.

**Cost.** The rendering is nearly free (§4.3). The real cost is a **new host capability: reading a
vault file the widget names**. Today a widget can reach exactly two things — the passage it sits on
(`here`) and a folder the user bound by hand (`createSlot`, `src/host.js`). Neither can read
`main.py`. `navigator.resolve(link)` returns a path and no content. Adding `read(link)` widens the
one boundary `docs/widget-catalogue.md` §7 argues is worth keeping narrow, so it should be scoped to
links written in the widget's own passage, not to an arbitrary path.

**Second cost, smaller and easy to miss:** an inline widget is mounted as
`h(definition.component, { here, navigator, content })` — **it is handed no `host`**, so
`ui.renderMarkdown` is not reachable from an inline widget at all today. The whole cheap-highlighting
path depends on plumbing that prop through.

**What would make it fail.** Nobody notices. 182 installs is what the most recent entrant got. This
earns its place as a _demonstration that the mechanism is general_, not as a growth bet — and it
should be costed that way.

### 3. A live value that lands in the note — the "burn out" wish

**What it is.** A trigger holds a query or an expression; the widget shows today's answer and can
commit it into the note as plain text.

**Evidence.** [Dataview #42](https://github.com/blacksmithgu/obsidian-dataview/issues/42) — 126
reactions, 118 👍, 142 comments, open since 2021 and touched in 2025; the plugin's maintainer has
never shipped it. [Dataview Serializer](https://www.obsidianstats.com/plugins/dataview-serializer)
exists for exactly this and has 17,106 installs, which is both proof the wish is real and proof the
market is modest. [Dataview #116](https://github.com/blacksmithgu/obsidian-dataview/issues/116) asks
the mirror question (an `EDIT` mode).

**Cost.** Medium, and mostly conceptual. The write-back exists; the _semantics_ do not match. Our
`renderSpan` **always re-spells the trigger** — that is its stated contract ("an edit can only be
written back where the trigger can be put back on"). Dataview #42 asks for the opposite: destroy the
trigger and leave the result. Delivering that means a second, deliberate verb — "commit and stop
being a widget" — which the passage gateway currently has no way to express.

**What would make it fail.** It is a one-way door in someone's note. A `commit` that removes the
trigger is the only unrecoverable action this mechanism would own, and `canUpdate` already refuses
when the lines are not found exactly once — that refusal has to hold even harder here.

### 4. Editable / inline block embeds — the biggest demand, and the worst fit

**What it is.** What [t/15339](https://forum.obsidian.md/t/edit-transcluded-embedded-notes-blocks-in-place-likely-requires-wyswyg-first/15339)
and [t/27093](https://forum.obsidian.md/t/a-proposal-for-rendering-block-embeds-inline/27093) ask
for: `![[note#block]]` that you can type into, and embeds that flow inside a sentence.

**Evidence.** The heaviest in this document by a wide margin — 1,078 + 554 likes, ~50k views, 185
participants between them, both still being posted in during July 2026.

**Cost.** High, and the ceiling is structural, not budgetary. Three separate walls:

1. **The trigger cannot be `![[…]]`** — see §4.1. By post-processor time the embed is a DOM node,
   not text.
2. **Editing a _different_ note** needs a writer for a file the user never bound. `passageHere` owns
   one span in one note and mends nothing else; `createSlot` owns a folder. Neither is this.
3. **Live Preview.** Both threads are about the editing view. `substituteIn` runs on
   `registerMarkdownPostProcessor` — **reading mode only**, by an explicit trade-off recorded in
   `src/host.js` ("read mode with post-processors, not an editable live preview"). The demand is
   concentrated exactly where this mechanism does not run.

**Recommendation: do not chase it.** Cite it as proof the _category_ is alive, and let it justify
recommendation 1, which is the reachable half of the same wish.

---

## 4. The `![[main.py]]` question, answered

### 4.1 The spelling cannot be `![[main.py]]`, and this is the finding that matters

**Verified in this codebase:** rules are registered as
`this.registerMarkdownPostProcessor((element, context) => substituteIn({…}))` — `src/main.js:44`.
`substituteIn` then walks `p, li` elements and matches against `node.textContent`
(`textOf` / `probeOf`, `src/inline-render.js`).

**Not verified by me** (I did not run Obsidian): what Obsidian leaves in that `textContent` for
`![[main.py]]`. But a post-processor sees the DOM _after_ markdown parsing, and Obsidian turns an
embed into an `internal-embed` element — for an unsupported extension, a clickable link, which is
[documented behaviour](https://help.obsidian.md/embeds) and confirmed by users who tried it with
`.txt` ([t/83980](https://forum.obsidian.md/t/embed-txt-file-with-rendering-like-pdf-and-other-file-types/83980)).
The literal characters `![[` and `]]` are not in the text either way.

**One-line test to settle it**, worth running before any design commits:
`registerMarkdownPostProcessor(el => console.log(el.innerHTML))` on a note containing `![[main.py]]`.

**Consequence.** The rule must be a plain-text prefix (`!code main.py`) or a `:::code` capsule —
both of which the existing `line` and `wrapped` modes already do. Delivering the _feature_ costs
nothing extra; delivering the _syntax_ means intercepting embeds, which is a different plugin.

### 4.2 Is it a real recurring request?

Yes, and small. Seven threads, 2020-09 → 2025-09, ~18k cumulative views, top thread 29 likes. The
most recent one (2025-09) has 89 views and no likes. Contrast the two threads it competes with for
attention in §2.1, which have 30,962 and 19,215 views and are still active.

**Verdict: real, recurring, low-intensity, and served — badly — by an abandoned plugin.**

### 4.3 Syntax highlighting: the cheapest honest path

**The user's instinct is right, and a shipped plugin already does exactly it.** From
[`src/CodeFileChild.ts`](https://github.com/williansaez/obsidian-code-file-embed/blob/main/src/CodeFileChild.ts):

```ts
const fence = pickFence(content);
const md = `${fence}${lang}\n${content}\n${fence}`;
await MarkdownRenderer.render(app, md, body, this.ctx.sourcePath, this);
```

Build a fenced block, hand it to the host renderer, get Obsidian's own Prism highlighting, its
theme, and its copy button. Nothing is bundled.

**What I verified:**

- the API shape — `MarkdownRenderer.render(app, markdown, el, sourcePath, component): Promise<void>`
  ([Obsidian docs](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderer/render));
- that `src/host.js` already implements precisely this call, with a `MarkdownRenderChild` for
  lifecycle and a double-stop guard, and answers `can.renderMarkdown: true`;
- that a published plugin uses the fence-then-render technique and claims Obsidian's renderer,
  theme and copy button as the result;
- that Obsidian's highlighter is Prism, and that its language ids are what a fence tag must carry.

**What I did not verify:** I did not run Obsidian, so I have not seen the highlighting appear. One
specific risk remains open — Prism language components can load lazily, so a language's _first_
render in a session may paint unhighlighted. If that shows up, it is a repaint, not a redesign.

**The one trap in that snippet, and it is not obvious.** `pickFence` scans the file for backtick runs
and opens with one backtick longer than the longest found. A three-backtick fence around a file that
itself contains ``` closes early and the rest of the file renders as markdown — arbitrary content
becoming arbitrary markup, in someone's note. Copy that function.

**The expensive alternative, for the record.** [Code Suite](https://github.com/felixleopold/obsidian-code-suite)
bundles Shiki with 65 themes (a `highlighter.ts` of 12.6 KB of imports alone) to get VS Code-grade
highlighting in all three editing modes. It has 1,937 installs. That is what the expensive path
bought.

### 4.4 Which extensions are in and out — the instinct, checked

**Exclude by type rather than allow-list every language: right, with one correction.** You cannot
avoid the extension→language table, because the fence needs a language tag and only the extension can
supply it. The reference implementation's `langMap.ts` is that table, and its design is the good part:
**the map is a hint, not a gate — an unmapped extension falls through to the raw extension**, which is
already correct for `sql`, `json`, `yaml`, `rust` and dozens more. A `.zig` file nobody mapped renders
as a plain block instead of an error.

So the gate is three cheap checks, none of them a language list:

1. **A deny-list of known binary extensions** — `png jpg gif webp pdf zip mp4 …`. Cheap, honest, and
   it catches the common accident before a file is read at all.
2. **A control-byte sniff on the content**, which is the check that actually holds:
   `/[\x00-\x08\x0e-\x1f]/` — no text file contains NUL..BS or SO..US. This is the defence against a
   `.dat` nobody deny-listed.
3. **A size cap**, settable, refusing above it with a message that names the number.

**Excluding markdown: the instinct is half wrong, and the evidence says so.** The reason given —
"Obsidian already embeds it" — does not survive the second-most-liked thread in §2.2, which is
[explicitly a request to embed markdown as raw source with no processing](https://forum.obsidian.md/t/embed-file-as-a-code-pre-block-i-e-contents-with-no-processing/39852)
(7 likes, 2,522 views). Someone documenting markdown syntax wants to see the syntax.

The real reason to be careful about `.md` is different and only applies to the syntax we are not
using: a plugin that hijacks `![[note.md]]` breaks a native behaviour people rely on. Since our
trigger is `!code …` and not `![[…]]` (§4.1), **that collision does not arise, and `.md` should be
allowed.** Rendering a markdown file inside a ` ```markdown ` fence is a supported, requested thing.

### 4.5 What breaks at scale

| case                           | what happens                                                                                                                                                                          | the answer                                                                                                                                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5,000-line file**            | `MarkdownRenderer.render` is async, but Prism tokenises synchronously — a ~200 KB file is a main-thread stall, and the resulting DOM is tens of thousands of nodes inside a paragraph | size cap (a setting, refusing out loud), a line range in the trigger (`!code main.py:20-60`), and a collapsed default over N lines. The range is the feature people ask for anyway                                                                                                                                               |
| **binary mislabelled as text** | `cachedRead` decodes as UTF-8 and yields replacement characters; pasted into a fence, that is megabytes of garbage in a note                                                          | the control-byte sniff of §4.4 catches the overwhelming majority. It is a heuristic, not a proof — say so in the error, and keep the size cap as the backstop                                                                                                                                                                    |
| **file does not exist**        | `getFirstLinkpathDest` returns `null`                                                                                                                                                 | an error card naming the path, never a silent empty block — and re-render on vault `create`/`rename`, which is what makes a moved file heal itself                                                                                                                                                                               |
| **file outside the vault**     | the vault adapter cannot reach it; only Node `fs` can, which is desktop-only                                                                                                          | **refuse.** `host.console.run` exists and is desktop-gated, but reaching an arbitrary machine path from a widget is precisely the boundary `docs/widget-catalogue.md` §7 keeps narrow. There is [an open issue asking for it](https://github.com/almariah/embed-code-file/issues/9) on the abandoned plugin, with zero reactions |
| **the file changes**           | a stale block is worse than no block                                                                                                                                                  | watch `vault.on("modify")` for the resolved path and re-render — 12 lines in the reference implementation, and the thing its README leads with                                                                                                                                                                                   |
| **content contains backticks** | the fence closes early and the remainder renders as markdown                                                                                                                          | `pickFence` (§4.3)                                                                                                                                                                                                                                                                                                               |

---

## 5. What I looked for and did not find

**An absence is a finding. These are the searches that came back empty.**

- **Nobody is asking for a grid of widget tiles inside a note.** The forum search
  `dashboard widgets grid inside a note tiles` returns **zero topics**. The board half of this plugin
  has no forum constituency I could locate — which does not make it wrong, but it does mean the
  substitutions half is the half with demand behind it.
- **Inline sparklines / charts in a sentence: no demand.** One 2026 post, zero likes.
- **Spoiler / click-to-reveal: no demand.** One 2026 post, zero likes, and it is an announcement, not
  a request.
- **"Let me define my own render rule" is not a thing people ask for.** The nearest is
  [Custom renderers for fenced code blocks](https://forum.obsidian.md/t/custom-renderers-for-fenced-code-blocks-embedded-content/1149)
  — 29 likes, and **dead since 2021**, because `registerMarkdownCodeBlockProcessor` shipped and
  answered it. **People ask for outcomes, never for mechanisms.** Every finding above is a widget
  someone wanted; not one is "a substitution engine". That is a marketing constraint, not a design
  one: this must be sold as the widgets, with the rule engine underneath.
- **r/ObsidianMD: not sampled.** Reddit blocks the JSON API from this environment and is excluded
  from the search crawler. If Reddit matters, someone must read it by hand — but note that every
  candidate below was independently corroborated by install counts, which Reddit could only soften,
  not overturn.
- **No roundup of "most wanted Obsidian features" exists that is worth citing.** The 2026 listicles
  found are affiliate-shaped "best plugins" pages recycling Dataview / Templater / Excalidraw. They
  describe what is installed, which `community-plugin-stats.json` says better and without a referral
  link.

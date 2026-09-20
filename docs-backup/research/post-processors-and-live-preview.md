# Reading mode and Live Preview are two engines

`RESEARCH` · 2026-08-31

## TL;DR

`registerMarkdownPostProcessor` is documented as a **reading-mode** mechanism, and an Obsidian team
member has confirmed on the forum that Live Preview uses a different engine and needs an editor
extension instead. A plain paragraph in Live Preview is never handed to a post processor. Reading
mode adds two more traps: rendered sections are **cached**, so a processor registered after a note
was drawn never applies to it, and reading view is **virtualized**, so off-screen sections are
unloaded from the DOM — behaviour the team calls correct and impossible to disable. Every mature
plugin that renders widgets inside note text therefore ships **two pipelines**: Meta Bind, Dataview
and Obsidian Tasks all pair a post processor with a CodeMirror 6 view plugin.

---

## 1. The contract

- [`Plugin.registerMarkdownPostProcessor()`](https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerMarkdownPostProcessor)
  — described as changing how the document looks in reading mode. `sortOrder` defaults to 0; lower
  runs first.
- [`MarkdownPostProcessor`](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessor)
  — the handler receives an element that is **a section of the preview**, plus a context. Lifecycle
  management goes through `MarkdownPostProcessorContext.addChild()`.
- [`MarkdownPostProcessorContext`](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPostProcessorContext)
  — `docId`, `sourcePath`, `frontmatter`, `addChild`, `getSectionInfo`. The docs warn `getSectionInfo`
  returns `null` in many circumstances and callers must handle it.
- [`MarkdownRenderChild`](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownRenderChild)
  — its `containerEl` is used to test whether the component is still alive, and is documented as
  something that should be **a child of** the preview sections, not the section element itself.

**Not documented anywhere:** when the processor is called, how many times, or which markdown
constructs produce which element shape. Everything below on frequency and lifetime comes from
Obsidian staff on the forum and from shipped plugin code.

## 2. Live Preview

[Editor extensions](https://docs.obsidian.md/Plugins/Editor/Editor+extensions) states the fork
directly: a post processor changes reading view; changing Live Preview requires an **editor
extension**, which is a CodeMirror 6 extension.

The decisive confirmation is joethei (Obsidian team) in
[registerMarkdownPostProcessor callback not called with Live Preview Mode](https://forum.obsidian.md/t/registermarkdownpostprocessor-callback-not-called-with-live-preview-mode/56049)
(2023-03-10), answering exactly this symptom — the callback fires after Ctrl+E and not in Live
Preview. The answer: write an editor extension, because the two modes use a different engine.

**Partially, some content still reaches the reading renderer inside Live Preview.** Code-block
processors do fire there — see
[MarkdownPostProcessorContext doesn't expose frontmatter in Live Preview](https://forum.obsidian.md/t/markdownpostprocessorcontext-doesnt-expose-frontmatter-in-live-preview-mode/112613),
where the processor ran and only `ctx.frontmatter` was empty. The Obsidian Hub's
[live preview guide](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/How+to+update+your+plugins+and+CSS+for+live+preview)
records that embedded rendered content is injected into the CM6 DOM, and that
`div.markdown-source-view.is-live-preview` distinguishes the mode.

**No authoritative enumeration exists** of which node types get the reading renderer inside Live
Preview. The negative is certain: a plain paragraph never does.

**What Live Preview requires instead:**
[View plugins](https://docs.obsidian.md/Plugins/Editor/View+plugins),
[State fields](https://docs.obsidian.md/Plugins/Editor/State+fields),
[Decorations](https://docs.obsidian.md/Plugins/Editor/Decorations). Substituting a widget for text is
a **replace decoration**. Use a view plugin when the decoration can be decided from the viewport;
use a state field when it cannot, or when the change alters vertical layout.

## 3. Caching and virtualization

**Reading view caches rendered sections.** In
[Rendering events or Force Rendering?](https://forum.obsidian.md/t/rendering-events-or-force-rendering/53736)
several developers report that a post processor runs once, when a note is first rendered to reading
view in a session, and never again. No staff denial exists.

**Reading view is virtualized.** In
[Obsidian reading view keeps modifying the DOM in long notes](https://forum.obsidian.md/t/obsidian-reading-view-keeps-modifying-the-dom-in-long-notes/53709),
holroy describes off-screen paragraphs being unloaded and later ones loaded as you scroll; joethei
answers that this is correct behaviour, done for performance, and cannot be disabled. The same cause
is behind
[Detect when rendered custom code block is removed from the DOM](https://forum.obsidian.md/t/detect-when-rendered-custom-code-block-is-removed-from-the-dom/60582).

**The supported way to force a redraw** is
[`MarkdownPreviewView.rerender(full?)`](https://docs.obsidian.md/Reference/TypeScript+API/MarkdownPreviewView/rerender),
reached through `MarkdownView.previewMode`. The vault-wide form iterates leaves and calls it on every
`MarkdownView`. A dated caveat: `rerender(true)` once hid the note title and properties
([thread](https://forum.obsidian.md/t/markdownview-previewmode-rerender-true-hides-note-title-and-properties-from-reading-view/72974)),
fixed in 1.5.3.

**Since Obsidian 1.7.2, views start deferred** — [Defer views](https://docs.obsidian.md/plugins/guides/defer-views).
A background tab has rendered nothing at all.

## 4. Known failure modes

| symptom                                            | thread                                                                                                              | answer                                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| never fires in Live Preview                        | [56049](https://forum.obsidian.md/t/registermarkdownpostprocessor-callback-not-called-with-live-preview-mode/56049) | write an editor extension; different engine                                                                                |
| runs once per session, edits do not re-run it      | [53736](https://forum.obsidian.md/t/rendering-events-or-force-rendering/53736)                                      | `previewMode.rerender(true)`; or listen to vault/workspace events                                                          |
| needs re-running without flicker                   | [91882](https://forum.obsidian.md/t/how-to-force-rerender-of-reading-view/91882)                                    | do not rerender the view — inject a `MarkdownRenderChild` via `ctx.addChild()` and refresh that, as Dataview does          |
| element breaks when scrolled out and back          | [60582](https://forum.obsidian.md/t/detect-when-rendered-custom-code-block-is-removed-from-the-dom/60582)           | virtualization, per [53709](https://forum.obsidian.md/t/obsidian-reading-view-keeps-modifying-the-dom-in-long-notes/53709) |
| "part of the page is in some cache I cannot reach" | [56156](https://forum.obsidian.md/t/reading-view-rendering-pipeline/56156)                                          | **unanswered for three years**                                                                                             |

## 5. Is replacing the paragraph supported?

The official [Markdown post processing](https://docs.obsidian.md/Plugins/Editor/Markdown+post+processing)
example replaces an inline `<code>` found **inside** the element it was handed. Combined with
`MarkdownRenderChild`'s "should be a child of the preview sections" and the virtualization
behaviour, the safe pattern is to keep the section element and mutate something inside it.

**No source, official or community, endorses calling `replaceWith` on the element the processor was
handed.** Our `substituteBlock` does exactly that when a whole block matches.

## 6. How shipped plugins do it — two pipelines, always

**Meta Bind** (`mProjectsCode/obsidian-meta-bind-plugin`)

- reading: `registerMarkdownPostProcessor` in `packages/obsidian/src/ObsMB.ts`, querying `code`
  elements, plus six code-block processors
- Live Preview: `registerEditorExtension` with a `ViewPlugin.fromClass` in
  `packages/obsidian/src/cm6/Cm6_ViewPlugin.ts`, gated on `editorLivePreviewField`
- both converge on one `MarkdownRenderChild` mount
- **it renders into inline `<code>` spans, never by replacing a `<p>`**

**Dataview** (`blacksmithgu/obsidian-dataview`, `src/main.ts`)

- priority-ordered code-block and markdown post processors
- the inline-field pass uses `findAllSelf("p,h1,h2,h3,h4,h5,h6,li,span,th,td")` — **`findAllSelf`
  matches the element itself as well as its descendants**, because `el` is sometimes the paragraph
  rather than a wrapper around it. `querySelectorAll` misses that case.
- Live Preview: `registerEditorExtension` with `src/ui/lp-render.ts`
- refresh without re-rendering the view: `src/ui/refreshable-view.ts`, injected via `ctx.addChild()`

**Obsidian Tasks** (`obsidian-tasks-group/obsidian-tasks`)

- `src/Obsidian/InlineRenderer.ts` — post processor, immediately creating a `MarkdownRenderChild` and
  calling `context.addChild`, and explicitly handling a `null` from `getSectionInfo`
- `src/Obsidian/LivePreviewExtension.ts` — a separate view plugin; the two files reference each other

**Emera** — [How I built a notebook inside Obsidian](https://sinja.io/blog/how-i-built-notebook-in-obisidian-emera)
is a written post-mortem of the same architecture, and notes the processor is called several times in
a row, so the work should be queued and debounced.

## 7. What this means here

Ranked against the evidence — works in the plugin's own dialog preview, works in a headless harness
calling the handler directly, zero hosts in the vault:

1. **The vault is in Live Preview and the target is a plain paragraph.** Fits every observation with
   nothing left over. _Cheapest check:_
   `document.querySelector('.markdown-source-view')?.classList.contains('is-live-preview')`, then
   Ctrl/Cmd+E and re-count.
2. **The note was rendered before the processor existed.** _Cheapest check:_
   `previewMode.rerender(true)` from the console, then re-count.
3. **The handler runs but throws before insertion.** _Cheapest check:_ the trace log — see below.
4. **The selector misses.** Either `el` **is** the paragraph (which is why Dataview uses
   `findAllSelf`), or the line is inside a callout, list, or table cell.
5. **The host is inserted and then discarded** — by the unsupported section-level `replaceWith`, or by
   virtualization.
6. **The loaded build is not the built one, or the leaf is deferred.**

**The instrumentation added for this** answers 1–5 in one glance. Turn it on with
`app.plugins.plugins.widgetarium.logging = true` and filter on `widgetarium:sub`:

- no `process` line at all → cause 1 or 2
- `process` with `rules: 0` → cause 2
- `process` with `live: 0` → the rule is draft, off, or broken (`rules loaded` names which)
- `block considered` with no match → cause 4
- `substitute` without a following `substituted`, or a host that vanishes → cause 5

**A trap worth recording separately:** `src/substitution-dialog.js:121` builds its live preview with
the rule forced to `draft: false, enabled: true`. The dialog therefore draws a working substitution
for a rule that is a draft or switched off — **the preview is not evidence that a rule is active.**

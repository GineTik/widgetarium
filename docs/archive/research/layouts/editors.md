# Layouts in five code editors

VS Code, JetBrains IntelliJ/WebStorm, Xcode, Zed, Cursor. Gathered from product documentation; where the docs give mechanics and state no rationale, that is said rather than filled in.

## The seven primitives that recur

**rail · pane · swap · split · drawer · overlay · gather.** Only *gather* has a single owner — Zed's multibuffer.

## Rail and pane are two things, and every product separates them

A rail is a **selector** of constant size and constant position. A pane is the **content** of whichever item is selected, sized by that content. VS Code states both halves: the Activity Bar "lets you switch between views and gives you additional context-specific indicators, like the number of outgoing changes when Git is enabled"; the Side Bar "contains different views … to assist you while working on your project."

Three consequences follow, all visible in the docs:

- The rail survives the pane being closed, so a badge keeps reporting state for content that is not on screen.
- Rail icons hold fixed positions; they do not move when the pane resizes.
- One rail item opens one container, and a container holds 3–5 views. The rail is one-of-N; the pane is a stack.

That they are separable is proved by the customisation: VS Code's rail moves to Top, Bottom, or hidden **while the sidebar stays**. JetBrains splits the same way and uses rail geometry to carry more — an icon's position in the upper part of the left or right bar decides which dock its window opens in. Xcode collapses the rail into the pane's own top edge, "the control above the navigator area", trading a row of height for a column of width.

**A vocabulary should treat "selector" as a role, not a position.**

## A dock is a swap, not a stack

VS Code's Side Bar shows one view container at a time. Zed: two panels in one dock and "only one of the panels can be open at a time." JetBrains' stripe toggles one tool window per bar. Simultaneous contexts are bought by **adding a region** — VS Code's Secondary Side Bar, "always positioned opposite the Primary Side Bar, regardless if you switched the position of the Primary Side Bar" — never by stacking inside one.

## A split means one of three things, and the command says which

| Meaning | How the product names it | The tell |
| --- | --- | --- |
| Comparison | JetBrains' differences viewer is "two panels" where "you can change text only in the right part"; Xcode's "Side By Side Comparison" | Rows are aligned, and one side is named the destination |
| Reference | JetBrains' "Open in Right Split" from a navigation result; VS Code's "Open to the Side", new editors opening right of the active one | The split is made *by* a navigation action, so the current file is protected |
| Parallel work | VS Code's locked editor groups — "new editors will not open in a locked group unless explicitly moved there"; Cursor's agent tiles | The arrangement is durable and defended against new content |

VS Code's *Split in Group* is a fourth, narrower case: one document, two positions, no new group.

Cursor states the parallel case outright: tiling "makes it easier to multi-task and compare outputs across agents without jumping between tabs" — simultaneity is the reason, not convenience.

## Why the bottom holds output

VS Code's guidelines: put views in the Panel that "benefit from more horizontal space", and use it "for views that provide supporting functionality."

The content there is **lines** — long in x, cheap in y, append-ordered, read at the tail. A side pane truncates a line, destroying information; a bottom pane truncates history, which scrolling recovers.

The other half is the refusal: do not use the Panel for a view that needs constant visibility, "since users often minimize the Panel." **The bottom is for episodic content; the sides are for persistent content.** Corroborating it, maximising the panel "will temporarily hide the editors … useful to temporarily focus on a large amount of output" — the bottom region is expected to swing between nearly zero and nearly everything, which a sidebar is not.

## Corner ownership is a declared property, never a guess

Every product with both a bottom region and side regions ships this knob.

Zed's `bottom_dock_layout` states the problem most cleanly, verbatim: `contained` (default) "Contain the bottom dock, giving the full height of the window to the left and right docks"; `full` "Give the bottom dock the full width of the window, truncating the left and right docks"; `left_aligned`, `right_aligned` for the two asymmetric answers.

VS Code's Panel alignment is the identical knob — Center (default, "spans the width of the editor area only"), Justify, Left, Right. JetBrains' widescreen layout is the same trade stated as a preference: "Maximize the height of vertical tool windows by limiting the width of horizontal tool windows."

**If a layout language has a bottom region, this property is not optional.**

## Peek versus open is one thing with a state

VS Code on Peek: "We think there's nothing worse than a big context switch when all you want is to quickly check something." It embeds an editor inline, allows edits in place, and promotes to a real editor when the filename is clicked.

JetBrains ships the escalation as an explicit gesture: Quick Documentation as a hover popup, Ctrl+Q twice to move it into a tool window, pinnable "to view multiple elements simultaneously." Xcode: Option-click popover, or the same content permanently in the Quick Help inspector.

The shape across all of them: **transient, anchored to the cursor, one item → overlay. Durable, needs comparison across several → a pane.** Worth modelling as one thing with a state, not two.

Zed takes a third path — rather than peeking one reference at a time it gathers all of them into a multibuffer, "a single tab containing editable excerpts from multiple different files", produced by project search, diagnostics, find-all-references and git diffs. Saving it saves every excerpted file.

## What focus mode removes names what the panes were for

JetBrains distraction-free: "All other elements of the UI are hidden (tool windows, toolbars, and editor tabs)", code centered, purpose "to help you focus on the source code of the current file." VS Code Zen hides all UI except the editor, goes full screen, centres. Cursor makes `zen` one of four named window layouts.

What survives is the document and the cursor. What goes, in order: **selectors** (rail, tabs, toolbars), **ambient status** (status bar), **peripheral navigation** (tool windows, sidebars). So the panes exist for *navigation between things* and *awareness of things not on screen* — both worthless when the task is one file already open.

JetBrains removing editor tabs while VS Code keeps them is a real disagreement about whether the tab strip is navigation or part of the document's identity.

## Centring: on in two situations, and nobody writes down why

1. **Automatically, inside a focus mode.** `zenMode.centerLayout` defaults true; JetBrains distraction-free centres with no opt-out.
2. **By hand, on a wide window with a single editor group.** VS Code's `View: Toggle Centered Layout`; Zed's `centered_layout` with `left_padding` / `right_padding` at 0.2 each, "valid values range is from 0 to 0.4".

Zed's cap is the documented guard: padding never exceeds 40% per side, so the text column never falls below 20% of the workspace. The adjacent number is `preferred_line_length: 80`.

The setting is **symmetric padding, not a max width**. That shape is the tell: a maximised editor on a wide display gives the text column a measure far past comfortable reading, *and* pins it to the left edge while the eye sits at the screen's centre. Padding both sides fixes the second problem.

Centring is a property of the editor **region**, never of the docks or panel, and it stops applying once the region is split.

**No product documents a perceptual rationale for centring.** The reading-measure argument is inference, not their claim.

## Xcode's companion slot — the strongest level-2 idea found

One pane holds one primary document plus an optional **companion**, whose kind *and* side are both settings: canvas (code ↔ render), assistant (code ↔ code), comparison (version ↔ version), with `Layout` choosing where it sits. Apple ships comparison in both forms — "Inline Comparison: Shows changes to a file under source control in an editor" versus "Side By Side Comparison … in a separate view next to an editor" — and lets the reader pick.

Xcode's debug area is scoped to an editor pane, not to the window. With splits, the bottom region is per-pane.

## Three-column frame, stated by Apple

Xcode's areas: navigator far left, editor centre, inspector far right, debug area below an editor pane. The inspector is the one region whose content is defined purely by selection — "for viewing and editing information about the project, or about the selected object in the navigator or editor area."

**What exists → what I am editing → attributes of what is selected.**

## Not verified

Zed's per-panel default docks (sources conflict). Cursor's inline-diff placement and its VS Code lineage from official docs. Any documented perceptual rationale for centring. JetBrains' stated purpose for editor splits — the docs give mechanics only.

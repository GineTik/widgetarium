# What a person can do on a list screen, and where the control lives

Eleven products, September 2026. Claims are tagged **[doc]** (the vendor's own page was fetched), **[help-snippet]** (help-centre text surfaced through search; the article body is client-rendered and would not fetch), or **[unverified]** (third-party only). Asana and Height are **[help-snippet]** throughout — their help centres returned navigation chrome on direct fetch.

## The five findings that change an engine's design

**1. The create control is positional, and the position is the argument.** Notion: "For a `table`, `list` or `board`: Click `+ New` at the bottom to add a new item", and for a calendar "Click the `+` icon that appears when you hover over any day" **[doc]** — the hovered day *is* the date property. Trello puts a composer at the foot of every list and lets a double-click between two cards insert at that index **[help-snippet]**. Things makes it literal: the plus button is dragged to the insertion point and "your new to-do will be inserted where you drop it"; dragged to the left margin it creates a heading instead **[help-snippet]**. An engine that models "the screen has an add button" has thrown away the group key and the rank that the button's location supplied.

**2. A drop writes the grouped-by field, and the best-documented product says so in those words.** Linear: "You can drag and drop issues between each grouping and it will automatically adopt the properties of that grouping" **[doc]**, over eleven possible keys — status, assignee, project, priority, cycle, label, parent, team, customer, release, SLA status **[doc]**. One rule parameterised, not eleven behaviours. Swimlanes add a second grouping dimension, so one drop can write two fields **[doc]**.

**3. Keyboard-first products converge on two layers: single letters for the common field writes, one palette for the long tail.** Linear `C` create, `S` status, `P` priority, `L` labels, `X` select, then `Cmd/Ctrl K` for the command bar **[doc]**. Todoist `T` date, `1–4` priority, `V` move, `L` label, `Q` quick add **[doc]**. Height has no bulk toolbar at all — the palette *is* its bulk surface **[help-snippet]**. The engine consequence: actions must be a **named, enumerable list**, not just bound keys.

**4. The mouse path is never removed, and the two paths produce different writes.** Linear, verbatim: "when you move issues to a new column on a board, it will go to the top if you make the change with the keyboard shortcut `S` or command menu and to wherever you placed it if you used the mouse" **[doc]**. The pointer names a rank; a keystroke does not. A single `move` verb cannot express this — the verb needs an optional rank argument that the invoking surface fills or omits.

**5. Inline creation is title-only; a second required field forces a composer.** Linear opens a modal and documents no inline path **[doc]**. Jira's inline create exists but publishes its gate in operational terms: the initial transition must have "no screens or conditions", global transitions "no validators or conditions", every mapped status enabled, the default board filter **[doc]**. Things (`Space` = new to-do below the selection **[doc]**) and Todoist (`A` bottom, `Shift+A` top, `Enter` save-and-create-below, `Ctrl+Enter` above **[doc]**) create from a title alone. Generalised — **inline creation is available exactly when every required field is defaulted or derivable from the insertion position.** No vendor states this; it is an inference from the gate.

## Per product, the load-bearing details

**Linear** — `C` opens the creation modal from anywhere; a per-column `+` creates into that column; a team setting chooses top or bottom for new and moved issues **[help-snippet]**. Right-click is the same menu as the palette; hover reveals the selection checkbox; `Shift`+arrows extend, `Cmd/Ctrl A` selects all **[doc]**. Bulk actions "show up at the bottom" as a transient bar **[doc]**. One modelling detail worth stealing: "Changes made to an issue's properties in the first 3 minutes are considered part of the issue creation process" **[doc]** — Linear treats a creation window as distinct from an edit.

**Things 3** — the strongest published example of one control whose drop target selects both the record type and its position. Swipe right on a to-do opens When, swipe left selects it and repeats for a non-contiguous selection **[doc]**. Date writes are one keystroke each: `⌘T` Today, `⌘E` This Evening, `⌘R` Anytime, `⌘O` Someday, `⇧⌘D` deadline, and relative nudges `^]`/`^[` ±1 day, `^⇧]`/`^⇧[` ±1 week **[doc]**. In Upcoming, dragging reschedules — **the same gesture writes order in one list and a date in another, chosen by what the list is keyed by** **[doc]**.

**Todoist** — position is addressable by key: `A` bottom, `Shift+A` top, `Enter` below, `Ctrl+Enter` above **[doc]**. `Cmd/Ctrl+E` edits the task in the row **[doc]**. Fields are typed into the title by natural language and sigils **[help-snippet]**.

**TickTick** — mobile swipe-left exposes exactly three actions: Move, Delete, Modify Date **[help-snippet]** — a published hard cap on exposed secondary actions. Box-select by dragging across the list raises a batch toolbar **[help-snippet]**; box-select over a list is otherwise rare in this set.

**Trello** — hover-scoped keys: `n` creates a card below the hovered card, `c` archives it, `t` edits the title in place **[doc]**. Shortcuts can be switched off entirely under Account → Settings → Accessibility **[doc]** — the only product here treating its shortcut layer as an accessibility hazard. Bulk is per-list, not per-selection **[doc]**. And the warning: undo covers archive, but "Deleting in Trello is still a permanent action" **[doc]**.

**Jira** — the counter-case that proves a drop is not free. A drop is a *workflow transition*; only legal targets highlight; a column mapped to several statuses splits into dashed sub-zones on hover; backlog → board is itself a transition **[help-snippet]**.

**Asana** — the other counter-case: "Sections and columns are the same underlying object, just displayed differently" **[help-snippet]**, so the drop writes **membership and order**, not a field. A long-running user request to tie columns to a custom field confirms it does not **[unverified, forum]**. `Tab+C` complete, `Tab+D` due date, `Tab+A` assign, `Tab+M` move **[help-snippet]**.

**Notion** — right-click gives "Edit property", which "displays all table properties in a dedicated menu" **[doc]**: a schema-generated action sheet rather than an authored one. Which properties show on a card front is a per-view setting **[doc]**. Bulk borrows from spreadsheets rather than from a palette — `cmd/ctrl+R` fill right, `cmd/ctrl+D` fill down, select rows then `cmd/ctrl+/` to edit all at once **[doc]**.

**Apple Reminders** — the purest schema-derived composer found. The row expands with a quick toolbar for note, date, location, tags and flag, with everything else behind Edit Details **[doc]**. **The line is drawn at one-value pickers versus multi-field structures** — repeat, priority and contact-triggered reminders need the full editor. The most defensible published version of that boundary anywhere in this survey.

**Google Tasks** — manual order is one sort mode among several (My order, Date, Deadline, Starred recently, Title) **[doc]**, so drag-to-reorder is meaningful in exactly one of them. An engine offering both sort and manual rank must answer what a drop means under a sort. No bulk found **[negative]**.

## Synthesis: derived, or authored?

**Mostly derivable, with a small authored residue — and the residue is what these products spend their design budget on.**

Derivable from `(record type, group key, displayed fields)` with no authoring:

1. **Create, positioned** — a control at the end of every group, supplying that group's key value and a rank between neighbours. Notion's `+ New`, its hover-`+` per calendar day, Trello's per-list composer and Things' draggable plus are four renderings of one rule.
2. **Drop writes the group key** — Linear states it generically over eleven keys.
3. **A field editor per displayed field** — Notion's "Edit property" menu is literally generated from the schema.
4. **Bulk is the single-row field writes applied to n.** Every product with multi-select offers exactly the single-row set over a selection and adds nothing new. **No product exposes a bulk-only verb.** Safe to generate entirely.
5. **Completion is a boolean with a privileged control** — a checkbox at the leading edge and a key, in every product. Derivable once the schema names which boolean it is, which is one bit of authoring.

Not derivable, must be declared:

1. **Whether a group is a field or a container.** Linear/Notion/Jira columns are field values; Asana's and Trello's are containers with their own identity and order. The same gesture writes a field in one and membership plus rank in the other. Only the view's grouping declaration knows.
2. **Whether a write is a set or a transition.** Jira's legal drop targets are a projection of the workflow's transition table. This is principle 1 surfacing as a drag affordance: a screen that cannot ask the writer which transitions are legal must either allow every drop or forbid the gesture. **Computing the legal targets in the screen instead of asking the writer is principle 5 rendered as a gesture.**
3. **Whether inline creation is possible at all** — computable from a manifest that marks required fields, never from the drawn screen.
4. **Which one verb is primary.** Nothing in a schema says a board exists to add cards rather than to move them.
5. **Non-field verbs** — archive, cancel, duplicate, convert, merge, watch. No field to derive from, the bulk of any right-click menu, and exactly what `writes` already models. Irreversibility is a property of the verb and only its author knows it.

**The shape this suggests:** derive a default action set from `(record type, group key, displayed fields)` — create-at-position, drop-writes-group-key, per-field editor, complete-toggle, selection-applies-to-n — and let the manifest **subtract** (a verb absent from `writes` does not exist) and **add** (own verbs, declared typed). That is the `writes`/`allow` split already in this engine, one level up; what the derivation supplies is the default that is today nothing at all.

## Negative findings

- **No product publishes a reason for the inline-versus-dialog line.** Jira's KB is the closest and is framed as support troubleshooting, not principle.
- **No product documents an action set derived from schema.** Notion's "Edit property" and Linear's generic grouping rule are the only two evidenced generated-from-data surfaces; everything else reads as authored per view.
- **Asana and Height could not be verified from primary sources.** The Asana sections-versus-custom-field point is the most load-bearing of them and deserves confirmation against the live app before an engine decision rests on it.
- **No right-click card menu documented for Trello** on the pages fetched.
- **No bulk or multi-select for Google Tasks or Apple Reminders** in their own guides. If that is a deliberate floor rather than a gap, nothing says so.
- **Jira's keyboard and bulk-change surfaces were not verified** — only the drag semantics and the inline-create gate were.

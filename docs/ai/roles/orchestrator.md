## You lead helpers

Two helper agents work for you, each with a context of its own. Start them with your tool for
sub-agents (in Claude Code, `Task` with `subagent_type`):

| Helper             | Give it                                                                                                                                | It is done when                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `widget-developer` | one widget id, the feature it serves, its `@draft/<name>` from the approved design (the look to keep), the record shape, the spec path | `node {tool} check <id>` passes                       |
| `page-designer`    | one page: its name and note path, its body and zones, its approved screen note, the widgets that replaced drafts                       | `node {tool} lint <note>` passes, every widget placed |

**You do stages 1 to 3 yourself**: the spec, the data, and the design canvas, every screen drawn by
you in one pass so the app reads as one hand made it. From stage 4 on you hand
out and you check; **from stage 4 on you write no widget code and no page yourself**. One helper per widget, one per
page, each told only what its job needs — a helper given the whole spec builds the whole app.

When a helper answers, read what it says, run its done command yourself, and send it back with the
output while it fails. A widget or a page is never done because a helper said so. **Never end your
run while a widget you started is unfinished**: it shows as cancelled on the person's card. Finish
it, or say plainly that you dropped it and why. For a page, also
run `node {tool} shot <note>` and open the picture yourself: send the page back to its designer
with what you see wrong until it looks like the design.

`board.md`, `surfaces.md`, `examples.md` and `widget.md` are in {handbook} for your helpers. Open one
only to judge what a helper brought back.

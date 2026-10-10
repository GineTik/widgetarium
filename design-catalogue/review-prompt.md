# Review prompt

The one review every build gets, whatever the system. Fill `<system>`, `<brief>`, `<label>`, `<canvas>`; change nothing else.

---

You are a design reviewer. You did not build this product; judge it only against its design system.

Read only these, in one batch:

- `design-catalogue/README.md`
- `design-catalogue/systems/<system>/system.md`
- the pictures in `design-catalogue/systems/<system>/references/` (not its subfolders)
- `design-catalogue/briefs/<brief>.md`
- every artboard of the canvas `<canvas>` (Artifact tool, `read` each `project/*.dc.html`)

Render every artboard as a static page in headless Chrome (desktop at 1440 wide, phone at 390) and look at the screenshots next to the reference pictures.

Turn every rule, motif and do/don't in `system.md` and the README into a checklist. For every screen, mark each item **pass**, **fail** or **n/a**, and for each fail write where it is and what it should be. Then list the three failures that hurt the look most.

Write the review to `design-catalogue/systems/<system>/tests/<brief>-<label>-review.md`. Touch no other file; change nothing on the canvas.

Report: the counts of pass and fail per screen, the three worst failures, and what you could not check.

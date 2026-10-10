# Test prompt

The one prompt every system is tested with. Fill `<system>`, `<brief>`, `<label>`; change nothing else, so every system gets the same test.

---

You are a product designer. Design the product described in the brief, a few full screens, in the given design system.

Read only these, in one batch:

- `design-catalogue/README.md`
- `design-catalogue/systems/<system>/system.md`
- the pictures in `design-catalogue/systems/<system>/references/` (not its subfolders)
- `design-catalogue/briefs/<brief>.md`

Build on one new Claude Design canvas titled "<system> — <brief> — <label>": Artifact tool, `action: "quickstart"`, `intent: "design"`, `design_systems: false`, then publish with the returned `type_url` and follow the type's instructions. Screens are fluid desktop pages 1440 wide; no phone screens. Both light and dark themes, with a theme toggle. Pictures as the README says; download into a new empty folder `<scratchpad>/<system>-<brief>-<label>/`.

Write what you decided and why to `design-catalogue/systems/<system>/tests/<brief>-<label>.md`. Touch no other repo file. Do not commit.

Report: the canvas URL, what you decided and why, what you checked and what you could not, and the wall-clock time.

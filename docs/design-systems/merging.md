# Merging design systems

Sources: `verdant.md`, `gallery.md`, `cloud.md`. Each is a list of traits (`V-…`, `G-…`, `K-…`) in the same ten categories.

## Step 0: fit

Every system and every brief carries the same fit profile: centre of gravity (object · function · information · journey · atmosphere), photogenic domain (yes · user photos · no), session (glance · browse · long work), density, tone, device.

1. Fill the brief's profile from what the product does.
2. Rank the catalogue's systems by how many parameters match; take the best three or more as sources.
3. Drop every conditional trait whose condition the brief does not meet. Portable traits (colour logic, type, controls, transitions) always stay available.
4. Merge only what is left.

A kanban board (function, no photos, long work) therefore keeps Verdant's colour logic and controls and loses its hero photos.

## Rules

1. **Copy the system, never the product.** A source's domain, screens, objects and photos stay behind. A merged system is designed for the brief's product, with new photos found for it.
2. **A new idea first.** Write the variant's idea in one sentence. If that sentence describes any one source, it is not a merge: rewrite it.
3. **Pick traits on purpose.** Every trait is chosen because it serves the idea. Write next to each one why.
4. **Compatible or reinforcing only.** Before taking a trait, check it against the ones already taken:
   - conflict: `V-S1 cards everywhere` × `K-S1 two plates only`; `V-X1 hard edges` × `G-X1 soft fades`; `V-K3 many primary actions` × `K-K3 one primary action`; `V-C1 UI in one hue` × `K-C1 UI stays neutral`.
   - reinforce: `G-M3 fog fade` + `K-X1 smooth transitions`; `V-M2 images in the UI hue` + `V-C1 one hue family`; `G-K2 text or icon` + `K-K1 quiet controls`.
     A conflict is resolved by dropping one side, never by averaging.
5. **Balance.** No source gives more than 40% of the traits a variant takes. Example: a variant of 20 traits takes at most 8 from Verdant.
6. **Colour is a logic, not hex values.** Take a source's colour logic (steps, jobs, lightness, chroma) and choose the hue for the product. Keep L and C ranges; change H. A Cloud-derived picture stays cool.
7. **Images by role and type.** Decide whether images form the design (`V-M1`, `K-M1`) or are domain content (`G-M1`), then the type of image, then how user photos are kept in line.
8. **Three variants that differ in idea**, not only in hue.

## Output per variant

- `## Idea` — one sentence.
- A trait table: category · trait taken (id + adapted wording) · why. Source counts at the bottom.
- `## Colour` — the hue chosen, each step as a hex, its job.
- `## Imagery` — role, type, search queries used.
- `## Signature components` — 3–5 new instruments built from the variant's traits.
- `## The design book must` — how the book's own layout proves the idea.

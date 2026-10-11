# Typography

Font pairs this system offers. One pair per product, chosen once; the roles (display, heading, text) and sizes stay as `system.md` sets them. All are free Google Fonts under the Open Font License.

| Pair          | Display                             | Text                      | Mono (ids only)      | Feels                      | For                                             |
| ------------- | ----------------------------------- | ------------------------- | -------------------- | -------------------------- | ----------------------------------------------- |
| **Editorial** | Newsreader                          | Geist                     | Geist Mono           | printed, calm, trusted     | CRMs, finance, research, docs                   |
| **Bookish**   | Source Serif 4                      | Source Sans 3             | Source Code Pro      | quiet, academic            | notes, knowledge bases, long reading            |
| **Neutral**   | Geist                               | Geist                     | Geist Mono           | plain, technical           | developer tools, admin, settings-heavy products |
| **Grotesk**   | Instrument Sans (semibold)          | Instrument Sans           | JetBrains Mono       | modern, confident          | dashboards, analytics, studios                  |
| **Contrast**  | Instrument Serif                    | Hanken Grotesk            | IBM Plex Mono        | editorial with personality | product pages, creator tools                    |
| **Native**    | the host's interface font, semibold | the host's interface font | the host's monospace | belongs to the host app    | apps inside Obsidian that should look built in  |

- **The display face is used once or twice per screen** (a title, one figure). Everything that works is the text face.
- **Serif display + sans text** (Editorial, Bookish, Contrast) reads as considered and print-like; **sans + sans** (Neutral, Grotesk, Native) reads as a tool.
- Never more than these three families in one product.
- Every family needs a fallback stack: a serif display falls back to `Georgia, serif`, a sans to `system-ui, sans-serif`.
- TODO: the kit has `--font-sans` and `--font-mono` only; a pair can switch at runtime once `--wg-kit-font-display` and `--wg-kit-font-heading` exist.

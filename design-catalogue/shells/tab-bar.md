# Tab bar

L1 as 3–5 tabs at the bottom of a phone; one page at a time, stacked as the person goes deeper.

```
┌──────────────────────┐
│ ‹  page title    ⋯   │
│                      │
│ page                 │
│                      │
├──────────────────────┤
│ ⌂    ⌕    ♡    ●     │
│Home Explore Saved Me │
└──────────────────────┘
```

| Part     | Holds                                     | Size                       |
| -------- | ----------------------------------------- | -------------------------- |
| top line | back, the page title, at most two actions | 44–56px                    |
| page     | one base, one column                      | full width                 |
| tab bar  | 3–5 sections, an icon over a word         | 56–64px plus the safe area |

- Five tabs at most; a sixth section goes inside one of them.
- Going deeper pushes a page onto the stack; the tab bar stays.
- A detail opens as a full page or a `sheet` from the bottom, never as a side column.

**Folding:** none; this is what every other shell becomes on a phone.

**Fits:** phone-first apps, and the phone view of every other shell. **Not for:** desktop as the main shell.

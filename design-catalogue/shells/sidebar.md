# Sidebar

L1 as a column on the left; the page beside it; L3 opens on the right when the page has records.

```
┌──────────┬──────────────────────────────┬─────────┐
│ mark     │ page header                  │ L3      │
│ search   │ tabs                         │ (opens  │
│ sections │                              │  on     │
│  nested  │ page                         │  demand)│
│ views    │                              │         │
│ account  │                              │         │
└──────────┴──────────────────────────────┴─────────┘
```

| Part    | Holds                                                                                                                                                      | Size                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| sidebar | product mark; search (⌘K); sections as an icon, a word and a count; one level of nested sections or saved views under a section; the account at the bottom | 232–256px                                                |
| page    | the page header, then the base                                                                                                                             | flexible                                                 |
| L3      | the record opened from the page                                                                                                                            | 360–480px, as a `sheet` over the page or a docked column |

- Sections are words with icons; nested sections indent one step and never two.
- The selected section is marked by the design system's selected fill, never by an outline.
- Global actions (`New`, notifications) stand in the sidebar's top or in the page header's right, never in both.

**Folding:** the sidebar becomes a `drawer` opened from the page header; L3 becomes a `sheet`.

**Fits:** more than 6 sections, sections that nest, filters that live beside content: admin, CRM, analytics. **Not for:** apps of 3–4 sections (use the top bar), phone-first apps (use the tab bar).

# Rail and list

L1 as a narrow rail of icons with short words; L2 as a list of the open section's items; the page; L3 for a thread or a detail. L0 is optional. This is Slack's and most mail clients' shell.

```
┌────┬──────┬────────────┬───────────────────────┬────────┐
│ L0 │ rail │ list       │ page header           │ L3     │
│    │ Home │ section    │                       │ thread │
│ ▢  │ DMs  │ title ⚙ ✎  │ page                  │        │
│ ▢  │ Act. │ filter     │                       │        │
│ +  │ Files│ items…     │ composer              │        │
│    │  +   │            │                       │        │
│    │ ●    │            │                       │        │
└────┴──────┴────────────┴───────────────────────┴────────┘
```

| Part          | Holds                                                                                                                            | Size      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------- |
| L0 (optional) | other workspaces or apps as marks with counts, `+` to add one                                                                    | 64–72px   |
| rail          | 4–7 sections as an icon over a short word; `New`, theme and the account at the bottom                                            | 72–88px   |
| list          | the open section's title and its actions; a filter; its items grouped under quiet headings, each with a mark, a name and a count | 240–300px |
| page          | the page header, then the base                                                                                                   | flexible  |
| L3            | a thread, a record, a preview                                                                                                    | 360–480px |

- The rail changes what the list shows; the list changes what the page shows. Neither duplicates the other.
- Unread or waiting counts sit on the item, never on the column.
- The selected item in the list is the design system's selected fill across the list's width.

**Folding:** L3 → `sheet`; the list → `drawer` from the page header; the rail → tab bar on a phone; L0 → the account menu.

**Fits:** messaging, mail, projects, inboxes, anything the person returns to through a list many times a day. **Not for:** apps whose sections are not lists (use the sidebar).

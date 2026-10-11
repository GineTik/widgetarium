# Header navigation

How this system draws navigation across the top. Use it when the product has up to 8 flat sections and its pages need the full width (wide tables, boards). With nested sections, use `navigation-sidebar.md`.

```
 ┌────────────────────────────────────────────────────────────────┐
 │ mark Name   Home  Leads 9  Deals  Reports      [search ⌘K]  ◔  New  ● │
 └────────────────────────────────────────────────────────────────┘
          selected: full ink + 2px underline in the pen
```

- Height 56–60px. One line under it separates it from the page; no shadow.
- Sections are words, 14px, ink-2; the selected one is full ink with a 2px underline in the pen.
- A count sits after the word it belongs to (`Leads 9`).
- On the right, in this order: search, notifications, one `New` button, the account.
- No second row of links. Sub-sections become tabs in the page header.

**Variant: header with tabs.** A product of 2–3 sections, each with a few views: sections stay in the header, views become tabs under the page title.

**On a narrow window:** the words fold into one menu button on the left; search turns into an icon; the product name hides before the search does.

Kit: `NavigationMenu` for the links, `Button size="sm"` for `New`, `Avatar` for the account.

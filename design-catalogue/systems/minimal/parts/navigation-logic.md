# Navigation logic

How moving around behaves, beyond how it looks.

- **Every page has its own address.** A section, a record, a filtered view and an open tab can be linked and reopened.
- **Back returns to where the person was:** the same scroll position, the same selection, the same filters.
- **Opening a record from a list** opens a sheet first (the list stays behind it); the full page is one press away. Closing the sheet returns to the same row.
- **The selected item stays visible** in the sidebar, the list and the tabs at all times.
- **Moving between sections keeps the shell still** and swaps only the page.
- **Keyboard:** `⌘K` opens search; `J`/`K` move through a list; `Enter` opens; `Esc` closes the top layer only.
- **A filter or a search is part of the address**, so a shared link shows the same rows.
- **Unsaved changes are never lost by navigating:** leaving asks to keep or discard.
- **Deep pages have a way up:** breadcrumbs (`breadcrumbs.md`) or a back arrow in the page header.

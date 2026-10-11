# Search

Three kinds of search. A product usually has the first, and adds the others where they fit.

## Command menu (whole product)

For jumping and doing: go to a record, run an action. Opened by `⌘K` or by the search field in the header or sidebar.

```
 ┌───────────────────────────────┐
 │ ⌕ Search or type a command…   │
 ├───────────────────────────────┤
 │ Records                       │  ← groups with small labels
 │  ▣ Bromley Metal       Company│
 │  ● Sarah Johnson       Contact│
 │ Actions                       │
 │  + New deal               C   │  ← shortcut on the right
 └───────────────────────────────┘
```

- A dialog centred near the top; results update on every key.
- Results are grouped by kind; each row says its kind on the right.
- Enter opens; Escape closes and returns focus.

## Results page

For browsing many results with filters, when one jump is not enough: "all deals mentioning Bromley".

- Its own page with the query in the header and filter chips under it.
- Results as a table or a list, grouped by kind when there are several kinds.
- The command menu's last row offers "See all results".

## Search in place

For narrowing the list already on screen.

- A search field in the list's toolbar; typing filters the rows below with no new page.
- The count updates ("12 of 240"); an empty result offers "Clear search".

## Rules

- One global search in the product, in the header or the sidebar, never both.
- A search field always says what it searches ("Search deals", not "Search").
- Kit: `CommandDialog`, `CommandInput`, `CommandGroup`, `CommandItem`, `CommandShortcut`; `Input icon="search"` for search in place.

# Breadcrumbs

The path to the page, for products two or more levels deep (ref 15).

```
 Prompts  /  UI polish
 ink-3       full ink (the current page, not a link)
```

- They stand in one place only: above the page title, as its eyebrow.
- Earlier steps are links in ink-3; the current page is plain text in full ink.
- The separator is a slash with space around it.
- Only on pages at least two levels deep; a top-level page shows its date or context as the eyebrow instead.
- More than four steps: the middle ones fold into `…`, which opens them.
- Kit: `Breadcrumb`, `BreadcrumbList`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` with a `/`, `BreadcrumbEllipsis`.

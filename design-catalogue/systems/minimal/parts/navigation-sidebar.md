# Sidebar navigation

How this system draws a navigation column on the left. Pick the variant that matches how the product's sections are shaped; the page structure around it is in `shells.md`.

## Simple sidebar

The quietest one (ref 12, left). For products of a few sections where the words say enough.

```
 mark  Product name

 Learn            ← group label, small, ink-3
 Teardowns
 Patterns         ← items: plain words, ink-2; selected item in full ink
 Guides

 Build
 Prompts
 Skills

 ─────────
 one notice       ← optional, see notifications.md
 Feedback
```

- Items are words only: no icons, no counts, no plate behind each item.
- Groups are separated by space and a small label, never by lines.
- The selected item is the word in full ink and medium weight; nothing else changes.
- Width 220–240px. Stands on the page colour with no line beside it; the space is the boundary.

## Sectioned sidebar

For work products of 6–15 sections a person switches between all day (ref 10).

```
 mark  Product name
 [ search ⌘K ]
 ⌂ Home
 ▤ Portfolio
 ✦ Recommendations
 ⚲ Company search    ← selected: the plate fill behind the item
 ♪ Notifications  6  ← a count on the right
 ─────────
 ● Account name ⌃
```

- Each item: an icon and a word, a count on the right when something waits.
- One search field at the top; the account at the bottom.
- Width 232–256px. A line separates it from the page, or a plate fill on a white page; never both.

## Tree sidebar

For nested content: files and folders, projects with sub-projects, a docs tree.

```
 ▾ Projects
   ▾ Website
       Home page
       Pricing       ← selected
     Brand kit
 ▸ Archive
```

- Each level indents 12–16px; a chevron opens and closes a branch.
- Rows are 28–32px; the selected row has the plate fill across the column's width.
- A branch remembers whether it was open.
- Drag to reorder or move when the person owns the tree.
- Width 240–300px, resizable by its edge.

## Rail and list

Icons with short words in a narrow rail, and the open section's items in a list beside it. The structure is `shells.md`, "Rail and list"; this system paints the rail on the page colour and marks the selected section with the plate fill.

## Rules for every variant

- The bottom of the sidebar is for the account, settings and at most one notice.
- Nothing in the sidebar is outlined. A selected item is a fill or full ink, never a border.
- On a narrow window every variant becomes a drawer opened from the page header.
- Kit: `Sidebar`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton isActive`.

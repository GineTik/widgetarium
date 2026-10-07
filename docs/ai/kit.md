# The kit, as the HTML it replaces

Every piece below comes from `widgetarium/kit`. Its vocabulary is shadcn/ui's: the same component
names, parts, props, variants and Tailwind token names, so a shadcn block or a component you already
know is written here as you would write it there, imported from `widgetarium/kit` instead of
`@/components/ui/*`. Each piece is already styled from the person's tokens and follows the plate laws.
Not every block needs a plate: a hero, a heading, a row of quick actions stand on the page itself.

Two things differ from a shadcn project. Icons are names, never imports: `<Icon name="calendar" />`,
not `<Calendar />` from `lucide-react` (every Lucide name resolves). And a `Button` or `Badge` with no
`variant` is the kit's quiet one (`secondary`, `soft`); write `variant="default"` for the one main
action, as shadcn's own blocks do.

## Structure

| You would write                                                              | Write instead                                                                                                                    | What it is                                                       |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `<div style="background:#f6f6f6;border-radius:24px;padding:20px">`           | `<Card>…</Card>`                                                                                                                 | one grey plate holding one block                                 |
| a card with a title, a line under it, an action and buttons at the foot      | `<Card><CardHeader><CardTitle/><CardDescription/><CardAction/></CardHeader><CardContent/><CardFooter/></Card>`                   | shadcn's card parts inside the kit's plate                       |
| a list of rows with lines between                                            | `<Rows>{rows.map((r) => <LayoutItem key={r.ref}>…</LayoutItem>)}</Rows>`                                                         | one plate, a hairline between rows                               |
| `display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))` | `<Grid min={220}>{…<LayoutItem>…}</Grid>`                                                                                        | a grid; every cell its own plate                                 |
| a row of cards side by side                                                  | `<Layout kind="row">…</Layout>`                                                                                                  | one line of plates                                               |
| a bare column with gaps                                                      | `<Layout kind="stack">…</Layout>`                                                                                                | no plate, the kit's spacing                                      |
| an `h2` with a count and a `+` over a list                                   | `<Section title="Follow up" count={3} action={<IconButton …/>} more={{ label: "See all" }}>…</Section>`                          | a section: it owns title, count, add and See all                 |
| `<main class="mx-auto max-w-[…]">` with an `h1` and a button                 | `<Page kind="home" title="Today" hero={<Hero …/>} action={<Button variant="default">Add</Button>} side={…}>`                     | a whole page: the archetype sets width, header, hero             |
| a row with a second grey line                                                | `<Row><Avatar …/><RowText><RowLabel>Maya</RowLabel><RowSupporting>Lisbon</RowSupporting></RowText><RowValue>3d</RowValue></Row>` | a two-line row, the leading picture level with line one          |
| a navigation column                                                          | `<Sidebar><SidebarContent><SidebarGroup><SidebarGroupLabel/><SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive asChild>`  | shadcn's sidebar; `SidebarProvider` and `SidebarTrigger` fold it |
| a table                                                                      | `DataTable`, or `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`                                        | the ready table, or shadcn's parts for one it cannot draw        |

`Layout kind` switches between `stack`, `row`, `grid` and `rows` with one word, so the design can
change without rewriting the block.

## Controls

| shadcn                                                                                                                                                           | Notes                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Button` `variant`: `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`; `size`: `sm`, `default`, `lg`, `icon`, `icon-sm`, `icon-lg`; `asChild`    | plus `isLoading`, `isDone`, `block` and `variant="accent"`, the brand fill; `IconButton` is the round one                                 |
| `Badge` `variant`: `default`, `secondary`, `destructive`, `outline`                                                                                              | plus `tone` (`success`, `warning`, `error`, `info`, …), `color` (a hue), `variant` `soft`, `solid`, `dot`, `text`                         |
| `Input`, `Textarea`                                                                                                                                              | plus `icon` and `onValueChange(text)`                                                                                                     |
| `Field`, `FieldLabel`, `FieldDescription`, `FieldError errors`, `FieldGroup`, `FieldSet`, `FieldLegend`, `FieldSeparator`, `FieldContent`, `FieldTitle`          | shadcn's form field; `orientation="horizontal"` puts a `Checkbox` or `Switch` beside its label                                            |
| `Select`, `SelectTrigger`, `SelectValue placeholder`, `SelectContent`, `SelectGroup`, `SelectLabel`, `SelectItem value`, `SelectSeparator`                       | `value`, `onValueChange`                                                                                                                  |
| `Checkbox`, `Switch`                                                                                                                                             | `checked`, `defaultChecked`, `onCheckedChange`, `disabled`                                                                                |
| `Tabs value onValueChange`, `TabsList`, `TabsTrigger value`, `TabsContent value`                                                                                 | `Segmented items` is the same switch drawn from a list                                                                                    |
| `ToggleGroup type="single"\|"multiple"`, `ToggleGroupItem value`                                                                                                 |                                                                                                                                           |
| `Popover`, `PopoverTrigger asChild`, `PopoverContent`, `PopoverAnchor`                                                                                           | with no `side` it covers its trigger; `side`, `align`, `sideOffset` and `alignOffset` place it there, flipped when the screen has no room |
| `Dialog open onOpenChange`, `DialogTrigger asChild`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose asChild`  | its scrim covers the whole page, the whole frame on the canvas — never draw a scrim yourself                                              |
| `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup heading`, `CommandItem onSelect`, `CommandSeparator`, `CommandShortcut`, `CommandDialog` | typing filters the items, as cmdk does; an item inside a component of your own is not counted for `CommandEmpty`                          |
| `Avatar`, `AvatarImage src`, `AvatarFallback`                                                                                                                    | `Emblem` with `size` and `shape` is the same picture with more sizes                                                                      |
| `Empty`, `EmptyHeader`, `EmptyMedia variant="icon"`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`                                                            | `EmptyState` draws the kit's own: 3D shapes, a title, one line, one action                                                                |
| `Progress value`, `Skeleton`, `Spinner`, `Pagination` and its parts                                                                                              | `Skeleton kind` draws the shape of what is coming                                                                                         |

A raw `<button>`, `<input>`, `<select>` or `<textarea>` is refused by `check`: Obsidian paints every
bare control its own way. Tabs need not be `Tabs`: a widget of tabs or chips from the catalogue is as
good.

## Between the pieces: Tailwind

What the kit has no piece for — a card of your own, a row, the space between blocks — is Tailwind
classes on the element, named from the kit's theme. `widget.css` holds only
`@import "tailwindcss";` and `@import "widgetarium/theme.css";`. The theme carries shadcn's names and
the kit's own beside them.

| For            | Classes                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fills          | `bg-background`, `bg-card`, `bg-popover`, `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent` (hover), `bg-destructive`; ours: `bg-group`, `bg-group-inset`, `bg-fill`, `bg-raise` |
| ink            | `text-foreground`, `text-muted-foreground`, `text-primary-foreground`, `text-destructive`; ours: `text-brand`, `text-success`, `text-warning`, `text-error`                          |
| a tinted plate | `bg-brand-wash`, `bg-success-wash`, `bg-warning-wash`, `bg-error-wash`, `bg-info-wash`                                                                                               |
| hues, charts   | `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`, `chart-1` … `chart-5` after `bg-`/`text-`                                                                      |
| type           | `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-h1` … `text-h6`, `font-medium`                                                                                                   |
| corners        | `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`; ours: `rounded-plate`, `rounded-item`, `rounded-pill`                                                                        |
| spacing        | `gap-items`, `gap-parts`, `gap-cards`, `p-plate`                                                                                                                                     |
| lines and lift | `border-border`, `ring-ring`; ours: `border-line`, `border-edge`, `shadow-raise`                                                                                                     |
| layout         | Tailwind's own: `flex`, `grid`, `grid-cols-3`, `justify-between`, `items-center`, `w-full`                                                                                           |

`muted` and `accent` are surfaces, as in shadcn: muted text is `text-muted-foreground`, and the
interactive colour the person's theme picked is `brand`. `check` names `text-muted` and `text-accent`
written for their old meaning. Join classes with `cn` from `widgetarium/kit`. A colour from
Tailwind's own palette (`bg-violet-500`, `text-white`) is refused by `check`, and a kit component is
never restyled through its `className`.

## Our extras beyond shadcn

| Piece                                                                                  | Use it for                                                                                                                          |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Layout`, `Rows`, `Grid`, `LayoutItem`, `LayoutHeader`, `Section`, `Page`, `Container` | the plates and spacing of a block and a page, chosen by one word                                                                    |
| `Card type`, `tone`, `side`, `across`                                                  | a plate the surface laws judge: `type="none"` paints nothing, `tone` tints it                                                       |
| `List`, `Row`, `RowText`, `RowLabel`, `RowSupporting`, `RowValue`                      | rows with a label, a second line and a value                                                                                        |
| `<Hero title eyebrow text photo action corner />`                                      | the one opening of a page: a photo with the words on a dark fade, or 3D shapes without a photo                                      |
| `<PhotoCard title subtitle meta photo badge shape="tall" onOpen />`                    | a record led by its photo, a frosted badge, a round open button; a shape stands in without a photo; `shape` is wide, tall or square |
| `<EmptyState title text shape tones action />`                                         | where nothing is yet: a cluster of 3D shapes, a title, one line, one action                                                         |
| `<Shape name seed tones />`, `<PhotoStack photos isRound />`                           | a 3D Material shape on a number or a record without a picture; overlapping faces at a card's corner                                 |
| `isLoading`, `isDone` on `Button` and `IconButton`                                     | a press that is working, then done, drawn on the button itself                                                                      |
| `brand`, `tone`                                                                        | the person's accent, and the state colours a plate or a badge can wear                                                              |

These are visual: they take any data you hand them. Draw them from rows with `map`.

## Widgets from the catalogue

Before writing a block, look for a widget that is already that block: `@default/hero`,
`@default/photo-cards`, `@default/empty-state`, `@default/command-menu` and every other one `find`
returns. `find` gives each widget's `picture` when it has one — open it and judge by the picture.
A widget you place keeps its look on every page and every app; a block you redraw drifts.

A widget can hold other widgets. `ISlot` is one place a person fills, `ISlot.array()` a list of
places, each drawn as a component (`<Hero />`, `main.map((Slot) => <Slot key={Slot.id} />)`);
`IRepeat.of` draws one widget again for every row. A card list whose card is a catalogue widget
is built that way, never by copying the card's code.

## Overlays and menus

Every piece below is shadcn's, named and composed as shadcn writes it. Each floats on the kit's own layer: fixed over the whole window, growing from the point that was pressed, springing on a press, still when the person asked for reduced motion. Escape closes only the top layer, so a menu inside a sheet closes before the sheet.

| shadcn                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Notes                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TooltipProvider delayDuration`, `Tooltip`, `TooltipTrigger asChild`, `TooltipContent side align sideOffset`                                                                                                                                                                                                                                                                                                                                                                       | opens on hover after the delay and on keyboard focus; a second tooltip within `skipDelayDuration` opens at once                                                      |
| `HoverCard openDelay closeDelay`, `HoverCardTrigger asChild`, `HoverCardContent`                                                                                                                                                                                                                                                                                                                                                                                                   | the pointer may cross into the card without closing it                                                                                                               |
| `DropdownMenu`, `DropdownMenuTrigger asChild`, `DropdownMenuContent side align sideOffset`, `DropdownMenuGroup`, `DropdownMenuLabel inset`, `DropdownMenuItem inset variant="destructive" onSelect`, `DropdownMenuCheckboxItem checked onCheckedChange`, `DropdownMenuRadioGroup value onValueChange`, `DropdownMenuRadioItem value`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuPortal` | arrows, Home, End and typed letters move between items; `event.preventDefault()` in `onSelect` keeps the menu open; ArrowRight opens a sub menu, ArrowLeft closes it |
| `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent` and the same items as `DropdownMenu` under `ContextMenu*` names                                                                                                                                                                                                                                                                                                                                                          | opens at the pointer on a right click, or on a long press by touch                                                                                                   |
| `Menubar`, `MenubarMenu value`, `MenubarTrigger`, `MenubarContent` and the same items under `Menubar*` names                                                                                                                                                                                                                                                                                                                                                                       | while one menu is open, hovering another trigger opens that one; ArrowLeft and ArrowRight move between menus                                                         |
| `NavigationMenu viewport`, `NavigationMenuList`, `NavigationMenuItem value`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink active asChild`, `NavigationMenuIndicator`, `NavigationMenuViewport`, `navigationMenuTriggerStyle()`                                                                                                                                                                                                                            | one viewport under the menu that resizes between items; `viewport={false}` floats each content under its own trigger                                                 |
| `Sheet`, `SheetTrigger asChild`, `SheetContent side="top"\|"right"\|"bottom"\|"left" showCloseButton`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose asChild`                                                                                                                                                                                                                                                                                        | a panel from an edge over the scrim; a press on the scrim or Escape closes it; the title names the dialog                                                            |
| `Drawer direction`, `DrawerTrigger`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter`, `DrawerClose`                                                                                                                                                                                                                                                                                                                                            | a bottom sheet with a handle: drag it down to close, let go early and it springs back                                                                                |
| `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent size="sm"`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`                                                                                                                                                                                                                                                                              | the scrim does not close it, only Cancel, an action or Escape; Cancel takes the focus                                                                                |
| `<Toaster position expand richColors closeButton duration />` once, then `toast("Saved", { description, action: { label, onClick } })`, `toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.loading`, `toast.promise(promise, { loading, success, error })`, `toast.dismiss(id)`                                                                                                                                                                                 | Sonner's API; toasts stack and spread on hover, and the hover pauses their timers                                                                                    |

`SheetOverlay`, `DrawerOverlay` and `AlertDialogOverlay` exist so ported code imports, and draw nothing: the content lays its own scrim. Swiping a toast away and the Drawer's snap points are not drawn.

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
| `Popover`, `PopoverTrigger asChild`, `PopoverContent`, `PopoverAnchor`                                                                                           | it opens below the trigger and flips above when there is no room; `side` other than `bottom` and `align` other than `start` are not drawn |
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

## Chat and AI

shadcn's chat parts, with their names, props and keyboard. A bubble, an attachment and a questionnaire
choice are kit plates, so the plate laws decide their fill; never paint one yourself.

| shadcn                                                                                                                                                                                                                                                                                                                                                                       | Notes                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Message align="start"\|"end"`, `MessageGroup`, `MessageAvatar`, `MessageContent`, `MessageHeader`, `MessageFooter`                                                                                                                                                                                                                                                          | the avatar sits at the bottom and rises above a footer; a `Bubble` inside takes the message's side                                                                                                                    |
| `Bubble variant align`, `BubbleContent render`, `BubbleReactions side align`, `BubbleGroup`                                                                                                                                                                                                                                                                                  | `variant`: `default` (brand), `secondary`, `muted`, `tinted`, `outline`, `ghost`, `destructive`; `render={<button/>}` or `<a/>` makes the bubble pressable                                                            |
| `Attachment state size orientation`, `AttachmentMedia variant`, `AttachmentContent`, `AttachmentTitle`, `AttachmentDescription`, `AttachmentActions`, `AttachmentAction`, `AttachmentTrigger render`, `AttachmentGroup`                                                                                                                                                      | `uploading` and `processing` spin over the media; `error` wears the error tone; label every icon-only action                                                                                                          |
| `MessageScrollerProvider autoScroll defaultScrollPosition scrollPreviousItemPeek`, `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerContent`, `MessageScrollerItem messageId scrollAnchor`, `MessageScrollerButton`                                                                                                                                             | follows streamed text while the reader is at the end, lets go on a scroll up, keeps the row in place when older ones load above; `useMessageScroller`, `useMessageScrollerScrollable`, `useMessageScrollerVisibility` |
| `Questionnaire shortcuts onSubmit`, `QuestionnaireProgress`, `QuestionnaireItem name required multiple`, `QuestionnaireTitle`, `QuestionnaireDescription`, `QuestionnaireChoices`, `QuestionnaireChoice value`, `QuestionnaireInput`, `QuestionnaireError`, `QuestionnaireActions`, `QuestionnairePrevious`, `QuestionnaireSkip`, `QuestionnaireNext`, `QuestionnaireSubmit` | one item at a time; the item's `name` is the form field of its answers; `shortcuts="letters"` picks with A, B, C; Enter goes on; give `QuestionnaireInput` an `aria-label`                                            |

Ours beyond shadcn: `<MessageParts parts={message.parts} />` draws an AI SDK or TanStack AI message's
parts as plain data — text in a bubble, reasoning or thinking folded, a tool call with its stage,
a file or source as an attachment — and `readChatParts` reads them without drawing.

```tsx
<MessageScrollerProvider autoScroll>
	<MessageScroller>
		<MessageScrollerViewport>
			<MessageScrollerContent>
				{messages.map((message) => (
					<MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={message.role === "user"}>
						<Message align={message.role === "user" ? "end" : "start"}>
							<MessageContent>
								<MessageParts parts={message.parts} />
							</MessageContent>
						</Message>
					</MessageScrollerItem>
				))}
			</MessageScrollerContent>
		</MessageScrollerViewport>
		<MessageScrollerButton />
	</MessageScroller>
</MessageScrollerProvider>
```

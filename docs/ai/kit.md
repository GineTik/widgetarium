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

## Layout, display, effects

| shadcn                                                                                                                                    | Notes                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Accordion type="single" collapsible \| type="multiple"`, `AccordionItem value`, `AccordionTrigger`, `AccordionContent`                   | `value`, `defaultValue`, `onValueChange`; the height springs open; shut content stays mounted and `inert`                                               |
| `Collapsible open onOpenChange`, `CollapsibleTrigger asChild`, `CollapsibleContent`                                                       | the same animated panel as the accordion                                                                                                                |
| `Alert variant="default"\|"destructive"`, `AlertTitle`, `AlertDescription`, `AlertAction`                                                 | an `Icon` first draws in the icon column; plus `tone` (`success`, `warning`, `info`, …); it is a `Card`, so the plate laws judge it                     |
| `AspectRatio ratio={16 / 9}`                                                                                                              | its child fills it                                                                                                                                      |
| `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink asChild`, `BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis` | the separator is a chevron unless you give it children                                                                                                  |
| `Separator orientation decorative`                                                                                                        | the hairline; `decorative={false}` announces it. `Line` is a toned line of text, not a separator                                                        |
| `ScrollArea`, `ScrollBar orientation="horizontal"`                                                                                        | the kit's own thin thumb, shown on hover; plus `type="always"` and `fade`, which fades only the edges that hide rows                                    |
| `ResizablePanelGroup direction`, `ResizablePanel defaultSize minSize maxSize`, `ResizableHandle withHandle`                               | sizes are percentages; `onLayout(sizes)`; a focused handle resizes with the arrows, `Home` and `End`                                                    |
| `Carousel orientation opts={{ loop }} setApi`, `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`                      | native scroll-snap with a mouse drag; the API has embla's `scrollPrev`, `scrollNext`, `scrollTo`, `canScrollPrev`, `selectedScrollSnap`, `on("select")` |
| `Item variant="default"\|"outline"\|"muted" size="default"\|"sm"\|"xs"`, `ItemMedia variant="icon"\|"image"\|"avatar"`, `ItemContent`, …  | `ItemTitle`, `ItemDescription`, `ItemActions`, `ItemHeader`, `ItemFooter`, `ItemGroup`, `ItemSeparator`; `asChild` or `render={<a href />}`             |
| `Marker variant="default"\|"border"\|"separator"`, `MarkerIcon`, `MarkerContent`                                                          | a status line; `role="status"` with a `Spinner` while it runs; a labelled separator such as "Conversation compacted"                                    |
| `DirectionProvider direction="rtl"`, `useDirection()`                                                                                     | the carousel and the resizable handle turn their arrow keys round                                                                                       |
| `ChartContainer config`, `ChartTooltip content={<ChartTooltipContent />}`, `ChartLegend content={<ChartLegendContent />}`                 | from `widgetarium/kit/charts`; a series is coloured `var(--chart-N)` by its place, by `color: 1…5`, or by a kit hue                                     |

Typography is components named after shadcn's typography page: `TypographyH1` … `TypographyH4`,
`TypographyP`, `TypographyBlockquote`, `TypographyList`, `TypographyInlineCode`, `TypographyLead`,
`TypographyLarge`, `TypographySmall`, `TypographyMuted`, on the `--wg-kit-h*` scale. A table is
`Table`. A heading inside a widget that is not a `text` widget is still refused by `check`.

Two effects come from shadcn's `shadcn/tailwind.css`, and `@import "widgetarium/theme.css"` brings
them with the same names: `shimmer` (with `shimmer-once`, `shimmer-reverse`, `shimmer-none`,
`shimmer-color-*`, `shimmer-duration-*`, `shimmer-spread-*`, `shimmer-angle-*`) for text that is
being worked on, and `scroll-fade`, `scroll-fade-x`, `scroll-fade-t|b|s|e|l|r`, `scroll-fade-*`
and `scroll-fade-none` for a scroller whose hidden edges fade. `no-scrollbar` and shadcn's
`data-open:`, `data-closed:`, `data-checked:`, `data-active:`, `data-disabled:`, `data-horizontal:`,
`data-vertical:` variants come with them. Without Tailwind the kit's own classes are
`wg-kit-shimmer` and `wg-kit-scroll-fade` (`wg-kit-scroll-fade-x` across). The fade is driven by
the scroll in CSS; `useScrollFog` stays for a component that needs the edge distances in code.
Shimmer stops under reduced motion.

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

## Inputs, calendar, forms

shadcn's names, parts and props, built on the kit's own hooks: no Radix, no react-day-picker, no
input-otp, no React Hook Form.

| shadcn                                                                                                                            | Notes                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Label htmlFor`                                                                                                                   | `FieldLabel htmlFor` inside a `Field`                                                                                         |
| `InputGroup`, `InputGroupAddon align="inline-start\|inline-end\|block-start\|block-end"`, `InputGroupInput`, `InputGroupTextarea` | `InputGroupButton size="xs\|sm\|icon-xs\|icon-sm"`, `InputGroupText`; a press on an addon focuses the input                   |
| `InputOTP maxLength pattern value onChange onComplete`, `InputOTPGroup`, `InputOTPSlot index`, `InputOTPSeparator`                | `REGEXP_ONLY_DIGITS`, `REGEXP_ONLY_CHARS`, `REGEXP_ONLY_DIGITS_AND_CHARS`; `pasteTransformer`                                 |
| `RadioGroup value onValueChange`, `RadioGroupItem value id`                                                                       | arrows move and check, skipping disabled items                                                                                |
| `NativeSelect`, `NativeSelectOption`, `NativeSelectOptGroup`                                                                      | a real `<select>`; `size="sm"`; plus `onValueChange`                                                                          |
| `Slider defaultValue={[50]} min max step`, two values for a range                                                                 | `onValueChange`, `onValueCommit`, `orientation`, `inverted`, `minStepsBetweenThumbs`; thumbs never cross                      |
| `Toggle pressed onPressedChange variant="default\|outline" size`                                                                  |                                                                                                                               |
| `ButtonGroup orientation`, `ButtonGroupSeparator`, `ButtonGroupText`                                                              | inner corners close up and open on a press                                                                                    |
| `Kbd`, `KbdGroup`                                                                                                                 |                                                                                                                               |
| `Combobox items multiple value onValueChange itemToStringValue autoHighlight`                                                     | `ComboboxInput showTrigger showClear`, `ComboboxContent`, `ComboboxList {(item) => …}`, `ComboboxItem value`, `ComboboxEmpty` |
| `ComboboxChips`, `ComboboxValue {(values) => …}`, `ComboboxChip`, `ComboboxChipsInput`                                            | `ComboboxGroup`, `ComboboxLabel`, `ComboboxSeparator`, `ComboboxTrigger`; `ComboboxCollection` is not built                   |
| `Calendar mode="single\|multiple\|range" selected onSelect`                                                                       | see below                                                                                                                     |

**Calendar** takes react-day-picker's names: `month`, `defaultMonth`, `onMonthChange`,
`captionLayout="label|dropdown|dropdown-months|dropdown-years"`, `startMonth`, `endMonth`,
`numberOfMonths`, `disabled` (a date, dates, `{ from, to }`, `{ before }`, `{ after }`,
`{ dayOfWeek }` or a function, alone or in a list), `required`, `showOutsideDays`, `fixedWeeks`,
`weekStartsOn`. The kit's defaults differ in three places: the week starts on Monday, there are
always six weeks, and outside days are shown. The dropdowns are the kit's `Select`; the year list
runs from `startMonth` to `endMonth`, a hundred years back and ten ahead without them. With no `mode`
it is a single pick that cannot be emptied, `onSelect(day)`, which is how every calendar written
before took it; `renderDay` and `today` stay.

**A date picker** is a composition, as in shadcn:

```tsx
const [date, setDate] = useState<Date | undefined>();
const [open, setOpen] = useState(false);

<Popover open={open} onOpenChange={setOpen} placement="below">
	<PopoverTrigger asChild>
		<Button variant="outline">{date ? date.toLocaleDateString() : "Select date"}</Button>
	</PopoverTrigger>
	<PopoverContent>
		<Calendar mode="single" captionLayout="dropdown" selected={date}
			onSelect={(day) => { setDate(day); setOpen(false); }} />
	</PopoverContent>
</Popover>

<Calendar mode="range" numberOfMonths={2} defaultMonth={range?.from} selected={range} onSelect={setRange} />
```

A `Select` opened inside a `Popover` keeps it open: a press in a nested panel is not outside.

**A form** is shadcn's React Hook Form example with `useForm` and `Controller` from the kit. The
kit imports no zod: `schema` is anything with `safeParse`, so your zod object fits as it is. Errors
appear after the first submit and are judged again on every change after it
(`mode: "onChange" | "onBlur" | "onTouched"` judge earlier); an invalid submit focuses the first
invalid field. `form` also has `register(name)`, `getFieldState`, `getValues`, `watch`, `setValue`,
`reset` and `formState` (`errors`, `isValid`, `isDirty`, `isSubmitted`, `isSubmitting`).

```tsx
import { z } from "zod";
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	Controller,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupText,
	InputGroupTextarea,
	useForm,
} from "widgetarium/kit";

const BugSchema = z.object({
	title: z
		.string()
		.min(5, "Bug title must be at least 5 characters.")
		.max(32, "Bug title must be at most 32 characters."),
	description: z
		.string()
		.min(20, "Description must be at least 20 characters.")
		.max(100, "Description must be at most 100 characters."),
});

function BugReport({ report }: { report: (bug: z.infer<typeof BugSchema>) => Promise<unknown> }) {
	const form = useForm({ schema: BugSchema, defaultValues: { title: "", description: "" } });
	return (
		<Card>
			<CardHeader>
				<CardTitle>Bug Report</CardTitle>
				<CardDescription>Help us improve by reporting bugs you encounter.</CardDescription>
			</CardHeader>
			<CardContent>
				<form id="bug-report" onSubmit={form.handleSubmit(report)}>
					<FieldGroup>
						<Controller
							name="title"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="bug-title">Bug Title</FieldLabel>
									<Input
										{...field}
										id="bug-title"
										aria-invalid={fieldState.invalid}
										placeholder="Login button not working on mobile"
										autoComplete="off"
									/>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
						<Controller
							name="description"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor="bug-description">Description</FieldLabel>
									<InputGroup>
										<InputGroupTextarea
											{...field}
											id="bug-description"
											rows={6}
											aria-invalid={fieldState.invalid}
											placeholder="I'm having an issue with the login button on mobile."
										/>
										<InputGroupAddon align="block-end">
											<InputGroupText>{`${field.value.length}/100 characters`}</InputGroupText>
										</InputGroupAddon>
									</InputGroup>
									<FieldDescription>
										Include steps to reproduce, expected behavior, and what actually happened.
									</FieldDescription>
									{fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
								</Field>
							)}
						/>
					</FieldGroup>
				</form>
			</CardContent>
			<CardFooter>
				<Button type="button" variant="outline" onClick={() => form.reset()}>
					Reset
				</Button>
				<Button type="submit" variant="default" form="bug-report">
					Submit
				</Button>
			</CardFooter>
		</Card>
	);
}
```

`FormFields` draws the same anatomy from a list of field specs: a `Field` per spec, its
`FieldLabel` naming the control, and `errors` (the shape of `formState.errors`) drawn as a
`FieldError` under the field it belongs to.

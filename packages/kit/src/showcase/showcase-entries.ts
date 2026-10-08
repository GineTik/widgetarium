import type { ComponentType } from "react";
import { AvatarsDemo } from "./basics/avatars-demo";
import { BadgesDemo } from "./basics/badges-demo";
import { ButtonsDemo } from "./basics/buttons-demo";
import { ChartsDemo } from "./basics/charts-demo";
import { InputsDemo } from "./basics/inputs-demo";
import { ProgressDemo } from "./basics/progress-demo";
import { SkeletonsDemo } from "./basics/skeletons-demo";
import { SparklinesDemo } from "./basics/sparklines-demo";
import { AttachmentDemo } from "./chat/attachment-demo";
import { BubbleDemo } from "./chat/bubble-demo";
import { ChatDemo } from "./chat/chat-demo";
import { QuestionnaireDemo } from "./chat/questionnaire-demo";
import { InputsBugReport } from "./inputs/inputs-bug-report";
import { InputsCalendar } from "./inputs/inputs-calendar";
import { InputsChoices } from "./inputs/inputs-choices";
import { InputsCombobox } from "./inputs/inputs-combobox";
import { InputsDatePickers } from "./inputs/inputs-date-pickers";
import { InputsFields } from "./inputs/inputs-fields";
import { Alerts } from "./layout/alerts-demo";
import { Disclosures } from "./layout/disclosures-demo";
import { Items } from "./layout/items-demo";
import { Markers } from "./layout/markers-demo";
import { Navigation } from "./layout/navigation-demo";
import { Resizing } from "./layout/resizing-demo";
import { Scrolling } from "./layout/scrolling-demo";
import { Slides } from "./layout/slides-demo";
import { Type } from "./layout/typography-demo";
import { ClosedOverlays } from "./overlays/closed-overlays";
import { ShadcnButtons } from "./shadcn/shadcn-buttons";
import { ShadcnCard } from "./shadcn/shadcn-card";
import { ShadcnCommand } from "./shadcn/shadcn-command";
import { ShadcnForm } from "./shadcn/shadcn-form";
import { ShadcnSwitches } from "./shadcn/shadcn-switches";
import { TableWithPages } from "./table/table-with-pages";

export type ShowcaseId =
	| "button"
	| "badge"
	| "inputs"
	| "avatar"
	| "progress"
	| "sparkline"
	| "shadcnButton"
	| "shadcnCard"
	| "shadcnForm"
	| "shadcnCommand"
	| "shadcnSwitches"
	| "accordion"
	| "alert"
	| "navigation"
	| "scroll"
	| "resizable"
	| "carousel"
	| "item"
	| "marker"
	| "typography"
	| "chat"
	| "bubble"
	| "attachment"
	| "questionnaire"
	| "calendar"
	| "fields"
	| "choices"
	| "combobox"
	| "form"
	| "datePicker"
	| "chart"
	| "table"
	| "skeleton"
	| "overlays";

export interface ShowcaseEntry {
	readonly id: ShowcaseId;
	readonly title: string;
	readonly note?: string;
	readonly isWide?: boolean;
	readonly paintsPlates?: boolean;
	readonly Demo: ComponentType;
}

export const SHOWCASE: readonly ShowcaseEntry[] = [
	{ id: "button", title: "Button", note: "variant · size · isLoading · isDone · size icon", Demo: ButtonsDemo },
	{ id: "badge", title: "Badge", note: "tone · color · variant · size", Demo: BadgesDemo },
	{ id: "inputs", title: "Input · Select · Tabs · Switch", Demo: InputsDemo },
	{ id: "avatar", title: "Avatar", note: "size s · m · l · xl, the fallback mark from a seed", Demo: AvatarsDemo },
	{ id: "progress", title: "ProgressBar · StatusProgress", Demo: ProgressDemo },
	{
		id: "sparkline",
		title: "Sparkline",
		note: "A line with no axes, drawn at the size of a word",
		Demo: SparklinesDemo,
	},
	{
		id: "shadcnButton",
		title: "Button · Badge variants",
		note: "default · secondary · outline · ghost · link · destructive",
		Demo: ShadcnButtons,
	},
	{
		id: "shadcnCard",
		paintsPlates: true,
		title: "Card parts · Avatar",
		note: "CardHeader · CardTitle · CardDescription · CardAction · CardContent · CardFooter",
		Demo: ShadcnCard,
	},
	{ id: "shadcnForm", title: "Field · Input · Textarea", note: "shadcn form fields", Demo: ShadcnForm },
	{ id: "shadcnCommand", title: "Command", note: "filters as you type", Demo: ShadcnCommand },
	{ id: "shadcnSwitches", title: "Tabs · ToggleGroup · Empty", Demo: ShadcnSwitches },
	{
		id: "accordion",
		title: "Accordion · Collapsible",
		note: "type single · multiple, collapsible, the height springs",
		Demo: Disclosures,
	},
	{
		id: "alert",
		paintsPlates: true,
		title: "Alert",
		note: "variant default · destructive, plus tone; AlertAction",
		Demo: Alerts,
	},
	{ id: "navigation", paintsPlates: true, title: "Breadcrumb · Separator · AspectRatio", Demo: Navigation },
	{
		id: "scroll",
		paintsPlates: true,
		title: "ScrollArea · scroll-fade · shimmer",
		note: "edges fade only where rows hide",
		Demo: Scrolling,
	},
	{
		id: "resizable",
		paintsPlates: true,
		title: "Resizable",
		note: "drag the grip, or focus it and press the arrows",
		Demo: Resizing,
	},
	{
		id: "carousel",
		paintsPlates: true,
		title: "Carousel",
		note: "scroll-snap, a mouse drag, the arrow keys",
		Demo: Slides,
	},
	{
		id: "item",
		paintsPlates: true,
		title: "Item",
		note: "variant default · outline · muted, size, render",
		Demo: Items,
	},
	{ id: "marker", title: "Marker", note: "a status line, a border row, a labelled separator", Demo: Markers },
	{ id: "typography", title: "Typography", note: "shadcn's typography page as components", Demo: Type },
	{
		id: "chat",
		paintsPlates: true,
		title: "Message · MessageParts · MessageScroller",
		note: "AI SDK and TanStack AI message parts as plain data; sticks to the latest turn",
		isWide: true,
		Demo: ChatDemo,
	},
	{
		id: "bubble",
		paintsPlates: true,
		title: "Bubble",
		note: "seven variants through the plate laws",
		Demo: BubbleDemo,
	},
	{
		id: "attachment",
		paintsPlates: true,
		title: "Attachment",
		note: "state · size · orientation",
		Demo: AttachmentDemo,
	},
	{
		id: "questionnaire",
		title: "Questionnaire",
		note: "press A, B, C to pick; Enter to go on",
		Demo: QuestionnaireDemo,
	},
	{
		id: "calendar",
		title: "Calendar",
		note: "captionLayout=dropdown · the month and year are kit Selects",
		Demo: InputsCalendar,
	},
	{ id: "fields", title: "InputGroup · InputOTP · NativeSelect", Demo: InputsFields },
	{ id: "choices", title: "RadioGroup · Slider · Toggle · ButtonGroup · Kbd", Demo: InputsChoices },
	{ id: "combobox", title: "Combobox", note: "Popover + filtering, single and chips", Demo: InputsCombobox },
	{
		id: "form",
		paintsPlates: true,
		title: "Forms",
		note: "useForm + Controller over the Field anatomy",
		Demo: InputsBugReport,
	},
	{
		id: "datePicker",
		title: "Date Picker",
		note: "Popover + Calendar: single, range over two months",
		isWide: true,
		Demo: InputsDatePickers,
	},
	{
		id: "chart",
		title: "Chart",
		note: "Recharts parts inside ChartContainer, coloured by config",
		isWide: true,
		Demo: ChartsDemo,
	},
	{
		id: "table",
		title: "DataTable · Table · Pagination",
		note: "DataTable is the ready table over the parts; the parts stay for a table it cannot draw",
		isWide: true,
		Demo: TableWithPages,
	},
	{
		id: "skeleton",
		title: "Skeleton",
		note: "One component, a preset per kit item",
		isWide: true,
		Demo: SkeletonsDemo,
	},
	{
		id: "overlays",
		title: "Overlays and menus",
		note: "Tooltip · HoverCard · DropdownMenu · ContextMenu · Menubar · NavigationMenu · Sheet · Drawer · AlertDialog · Toaster",
		isWide: true,
		Demo: ClosedOverlays,
	},
];

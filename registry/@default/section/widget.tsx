import {
	ICrudGateway,
	IMounts,
	ISlot,
	IValueGateway,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	z,
} from "widgetarium";
import type { Slot } from "widgetarium";
import { Body } from "./body";
import { PER_ROW, PLACED } from "./body-modes";
import { Head } from "./head";

const ArrangementSchema = z.enum(["column", "row", "grid", "rows"]);
const BadgeToneSchema = z.enum([
	"neutral",
	"accent",
	"success",
	"warning",
	"error",
	"info",
	"note",
	"standout",
	"highlight",
]);

type Arrangement = z.infer<typeof ArrangementSchema>;

const KIND_OF: Record<Arrangement, string> = { column: "stack", row: "row", grid: "grid", rows: "rows" };

const STYLE = `
.wg-section { display: flex; flex-direction: column; gap: var(--wg-gap-parts, 12px); }
.wg-section-head { display: flex; align-items: center; gap: var(--wg-gap-items, 8px); }
.wg-section-title { margin: 0; font-size: var(--font-ui-large, 18px); font-weight: 600; }
.wg-section-controls { margin-left: auto; display: flex; align-items: center; gap: var(--wg-gap-items, 8px); }
.wg-section-stands { min-width: 0; }
.wg-section-empty { font-size: var(--font-ui-small, 13px); color: var(--wg-kit-text-muted); }
`;

export const props = defineProps({
	heading: IValueGateway.of(z.string().default("Section")).pick("get", "update"),
	badgeTone: IValueGateway.of(BadgeToneSchema.default("neutral")).pick("get", "update"),
	badge: IValueGateway.of(z.string().default("")).pick("get", "update"),
	filling: IValueGateway.of(z.enum([PLACED, PER_ROW]).default(PLACED)).pick("get", "update"),
	arrangement: IValueGateway.of(ArrangementSchema.default("column")).pick("get", "update"),
	minWidthPx: IValueGateway.of(z.number().default(240)).pick("get", "update"),
	items: ICrudGateway.of(z.looseObject({})),
	pageSize: IValueGateway.of(z.number().default(24)).pick("get"),
	controls: IMounts.of({ default: [] }),
	widgets: IMounts.of({ default: [] }),
	item: ISlot.of({ surface: "none" }),
});

const SectionWidget = createWidget({
	inject: props,
	draw: ({ heading, badge, badgeTone, filling, arrangement, minWidthPx, items, pageSize, controls, widgets, item }) => (
		<section className="wg-section">
			<style>{STYLE}</style>
			<Head heading={heading.value} badge={badge.value} badgeTone={badgeTone.value} controls={controls} />
			<Body
				filling={filling.value}
				items={items}
				pageSize={pageSize}
				Drawn={item as Slot<Record<string, unknown>> | undefined}
				placed={widgets}
				kind={KIND_OF[arrangement.value]}
				narrowest={minWidthPx.value}
			/>
		</section>
	),
});

export const metadata = defineMetadata(SectionWidget, {
	title: "Section",
	description:
		"A titled part of a screen: the heading, what it says about itself, the controls beside it, and the widgets standing under it.",
	keywords: ["section", "group", "region", "heading", "title", "block", "layout", "container", "grid", "list"],
	props: {
		heading: {
			hint: "What this part of the screen is.",
			control: "line",
		},
		badgeTone: {
			design: true,
			label: "What the badge says it is",
			hint: "The colour a badge wears is its meaning: a count is neutral, a problem is an error.",
			options: [
				{ value: "neutral", label: "Neutral" },
				{ value: "accent", label: "Accent" },
				{ value: "success", label: "Going well" },
				{ value: "warning", label: "Needs a look" },
				{ value: "error", label: "Something is wrong" },
				{ value: "info", label: "Information" },
				{ value: "note", label: "A note" },
				{ value: "standout", label: "Stands out" },
				{ value: "highlight", label: "Highlighted" },
			],
			isVisible: (props) => Boolean(props.badge?.value),
		},
		badge: {
			hint: "A count or a state, beside the heading. It says something about the body, never a filter.",
			control: "line",
		},
		filling: {
			label: "What fills it",
			hint: "Placed: you put each widget in yourself. Per row: one widget is drawn again for every row of the data.",
			options: [
				{ value: PLACED, label: "Widgets I place" },
				{ value: PER_ROW, label: "One widget per row of data" },
			],
		},
		arrangement: {
			design: true,
			label: "How they stand",
			hint: "A column reads down with nothing under it. A row and a grid give each widget its own plate. Rows stand in one plate with a line between them.",
			options: [
				{ value: "column", label: "Down the column" },
				{ value: "row", label: "Across the row, a plate each" },
				{ value: "grid", label: "A grid that wraps, a plate each" },
				{ value: "rows", label: "Rows in one plate" },
			],
		},
		minWidthPx: {
			design: true,
			label: "Narrowest a cell may be",
			hint: "The grid fits as many across as this allows, then wraps.",
			isVisible: (props) => props.arrangement?.value === "grid",
		},
		items: {
			label: "Rows to draw",
			hint: "Bind the folder whose notes this section draws. The widget in the slot draws one of them at a time.",
			isVisible: (props) => props.filling?.value === PER_ROW,
		},
		pageSize: {
			label: "Rows drawn",
			hint: "How many rows are drawn before the rest are asked for.",
			isVisible: (props) => props.filling?.value === PER_ROW,
		},
		controls: {
			label: "Controls",
			hint: "Widgets standing at the end of the heading row. They govern this section and nothing else.",
		},
		widgets: {
			label: "Widgets",
			hint: "Each widget you place stands in the body, in the order listed here.",
			isVisible: (props) => props.filling?.value !== PER_ROW,
		},
		item: {
			label: "Drawn for every row",
			isVisible: (props) => props.filling?.value === PER_ROW,
		},
	},
});

export const layout = defineLayout({
	role: "layout",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 360 },
});

export default SectionWidget;

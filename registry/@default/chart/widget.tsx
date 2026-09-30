import {
	IListGateway,
	IValueGateway,
	VaultRecordSchema,
	type VaultRecord,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	Line,
	LineChart,
	XAxis,
} from "widgetarium/kit/charts";
import { heldProperties, heldValues, numberIn } from "@default/lib";
import { Glance } from "./glance";
import { Said } from "./said";
import type { Drawn, Point } from "./types";

const POINTS_AT_MOST = 366;
const SERIES_AT_MOST = 8;
const KindSchema = z.enum(["area", "bar", "line", "glance"]);
const ISO_DAY = /^\d{4}-\d{2}-\d{2}/;
const CHART_MARGIN = { top: 8, right: 12, left: 12, bottom: 0 };
const AREA_WASH = 0.18;
const BAR_CORNER = 4;

const READING = "Reading…";
const NO_RECORDS = "There are no records here yet.";
const NO_NUMBERS = "None of these records carries a number to draw.";

type Series = { property: string; label?: string | null };
type Kind = z.infer<typeof KindSchema>;

const ChartWidget = createWidget({
	inject: {
		records: IListGateway.of(VaultRecordSchema),
		across: IValueGateway.of(z.string().default("")).pick("get"),
		series: IListGateway.of(z.custom<Series>()),
		kind: IValueGateway.of(KindSchema.default("area")).pick("get"),
	},
	draw: ({ records, across, series, kind }) => {
		const read = useData(records.list, { limit: POINTS_AT_MOST });
		const declared = useData(series.list, { limit: SERIES_AT_MOST }).data;
		const acrossProperty = across.trim();

		if (read.failure !== null) return <Said text={read.failure} isFailure />;
		if (read.isLoading && read.data.length === 0) return <Said text={READING} />;
		if (read.data.length === 0) return <Said text={NO_RECORDS} />;

		const drawn = seriesOf(declared, read.data, acrossProperty);
		const [first] = drawn;
		if (!first) return <Said text={NO_NUMBERS} />;

		const points = pointsOf(read.data, drawn, acrossProperty);
		if (kind === "glance") return <Glance points={points} first={first} />;
		return <ChartContainer config={configOf(drawn)}>{plotOf(kind, points, drawn)}</ChartContainer>;
	},
});

export const metadata = defineMetadata(ChartWidget, {
	title: "Chart",
	description:
		"The numbers a set of notes carries, drawn across one property as an area, bars, a line, or a glance: the latest value with its sparkline.",
	keywords: [
		"chart",
		"graph",
		"plot",
		"area",
		"bars",
		"line",
		"trend",
		"series",
		"sparkline",
		"numbers",
		"over time",
		"compare",
		"stat",
		"kpi",
		"glance",
		"balance",
		"total",
		"history",
	],
	preview: {
		size: { w: 6, h: 4 },
		props: {
			records: {
				rows: [
					{ name: "Jan", notes: 186, links: 80 },
					{ name: "Feb", notes: 305, links: 200 },
					{ name: "Mar", notes: 237, links: 120 },
					{ name: "Apr", notes: 73, links: 190 },
					{ name: "May", notes: 209, links: 130 },
					{ name: "Jun", notes: 214, links: 140 },
				],
			},
			series: {
				rows: [
					{ property: "notes", label: "Notes" },
					{ property: "links", label: "Links" },
				],
			},
		},
	},
	props: {
		records: {
			label: "Records",
			hint: "The notes the chart reads, one point each.",
		},
		across: {
			label: "Across",
			hint: "The property each point stands at, such as a date or a name. Left empty, the note's own name. Dates are put in order.",
			control: "line",
		},
		series: {
			label: "Series",
			hint: "The number properties drawn, in the order they are listed. Left empty, every property holding a number.",
			describes: { property: "Property", label: "Label" },
		},
		kind: {
			design: true,
			label: "Drawn as",
			hint: "A glance is the latest value of the first series with its sparkline under it.",
			options: [
				{ value: "area", label: "An area" },
				{ value: "bar", label: "Bars" },
				{ value: "line", label: "A line" },
				{ value: "glance", label: "A glance" },
			],
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: 520, preferredHeight: "auto", at: [{ belowPx: 560, preferredWidth: "full" }] },
});

export default ChartWidget;

function plotOf(kind: Kind, points: Point[], drawn: Drawn[]) {
	const parts = [
		<CartesianGrid key="grid" vertical={false} />,
		<XAxis
			key="across"
			dataKey="at"
			tickLine={false}
			axisLine={false}
			tickMargin={8}
			minTickGap={24}
			tickFormatter={tickOf}
		/>,
		<ChartTooltip key="tip" content={<ChartTooltipContent indicator={kind === "bar" ? "dot" : "line"} />} />,
		drawn.length > 1 ? <ChartLegend key="legend" content={<ChartLegendContent />} /> : null,
	];
	if (kind === "bar")
		return (
			<BarChart data={points} margin={CHART_MARGIN} accessibilityLayer>
				{parts}
				{drawn.map((one) => (
					<Bar key={one.key} dataKey={one.key} name={one.key} fill={inkOf(one)} radius={BAR_CORNER} />
				))}
			</BarChart>
		);
	if (kind === "line")
		return (
			<LineChart data={points} margin={CHART_MARGIN} accessibilityLayer>
				{parts}
				{drawn.map((one) => (
					<Line
						key={one.key}
						dataKey={one.key}
						name={one.key}
						type="monotone"
						stroke={inkOf(one)}
						strokeWidth={2}
						dot={false}
					/>
				))}
			</LineChart>
		);
	return (
		<AreaChart data={points} margin={CHART_MARGIN} accessibilityLayer>
			{parts}
			{drawn.map((one) => (
				<Area
					key={one.key}
					dataKey={one.key}
					name={one.key}
					type="monotone"
					stroke={inkOf(one)}
					fill={inkOf(one)}
					fillOpacity={AREA_WASH}
					strokeWidth={2}
				/>
			))}
		</AreaChart>
	);
}

function inkOf(one: Drawn): string {
	return `var(--color-${one.key})`;
}

function configOf(drawn: Drawn[]) {
	return Object.fromEntries(drawn.map((one) => [one.key, { label: one.label }]));
}

function seriesOf(declared: Series[], rows: VaultRecord[], acrossProperty: string): Drawn[] {
	const asked = declared
		.map((one) => ({ property: String(one?.property ?? "").trim(), label: String(one?.label ?? "").trim() }))
		.filter((one) => one.property !== "");
	const chosen =
		asked.length > 0 ? asked : numericProperties(rows, acrossProperty).map((property) => ({ property, label: "" }));
	return chosen
		.slice(0, SERIES_AT_MOST)
		.map((one, place) => ({ key: `s${place}`, property: one.property, label: one.label || one.property }));
}

function numericProperties(rows: VaultRecord[], acrossProperty: string): string[] {
	const found = new Set<string>();
	for (const row of rows)
		for (const [property, value] of Object.entries(heldProperties(row)))
			if (property !== acrossProperty && numberIn(value) !== null) found.add(property);
	return [...found];
}

function pointsOf(rows: VaultRecord[], drawn: Drawn[], acrossProperty: string): Point[] {
	const points = rows.map((row) => {
		const held = heldValues(row);
		return {
			at: String((acrossProperty === "" ? held.name : held[acrossProperty]) ?? ""),
			...Object.fromEntries(drawn.map((one) => [one.key, numberIn(held[one.property])])),
		};
	});
	if (!points.every((point) => ISO_DAY.test(point.at))) return points;
	return points.sort((left, right) => left.at.localeCompare(right.at));
}

function tickOf(value: unknown): string {
	const said = String(value ?? "");
	if (!ISO_DAY.test(said)) return said;
	return new Date(said.slice(0, 10)).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
}

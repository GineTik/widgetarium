import { createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import {
	Badge,
	Button,
	Calendar,
	Emblem,
	EmblemFallback,
	Field,
	Grid,
	Heading,
	Icon,
	IconButton,
	Layout,
	LayoutActions,
	LayoutHeader,
	ProgressBar,
	Segmented,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Skeleton,
	Sparkline,
	SparklineArea,
	SparklineBars,
	SparklineDot,
	SparklineLine,
	StatusProgress,
	Switch,
} from "../packages/kit/src/index";
import {
	AREAS,
	AREA_CONFIG,
	CHART_MARGIN,
	MONTHS,
	SERIES,
	SKELETON_SHOWN,
	STATUSES,
	STATUS_ITEMS,
	THEMES,
	VIEWS,
	WEEKS,
} from "./kit-demo-data.ts";
import { Cell, Named, Section, WideSection } from "./kit-demo-frame.tsx";
import { TableWithPages } from "./kit-demo-table.tsx";
import { USAGE } from "./kit-demo-usage.ts";
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
	Pie,
	PieChart,
	XAxis,
} from "../packages/kit/src/charts/index";

function Buttons() {
	return (
		<div className="demo-stack">
			<div className="demo-row">
				<Button variant="accent">Create</Button>
				<Button>Neutral</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="plain">Plain</Button>
				<Button variant="danger">Delete</Button>
			</div>
			<div className="demo-row">
				<Button size="s">Small</Button>
				<Button size="m">Medium</Button>
				<Button size="l" variant="accent">
					Large
				</Button>
			</div>
			<div className="demo-row">
				<Button isLoading>Saving</Button>
				<Button isDone>Saved</Button>
				<Button disabled>Disabled</Button>
				<IconButton label="Search">
					<Icon name="search" />
				</IconButton>
				<IconButton label="Settings">
					<Icon name="settings" />
				</IconButton>
			</div>
		</div>
	);
}

function Badges() {
	return (
		<div className="demo-stack">
			<div className="demo-row">
				{STATUSES.map((status) => (
					<Badge key={status.label} tone={status.tone}>
						{status.label}
					</Badge>
				))}
				<Badge tone="accent" variant="solid">
					3
				</Badge>
			</div>
			<div className="demo-row">
				{["red", "orange", "yellow", "green", "cyan", "blue", "purple", "pink"].map((color) => (
					<Badge key={color} color={color} size="s">
						{color}
					</Badge>
				))}
			</div>
		</div>
	);
}

function Inputs() {
	return (
		<div className="demo-stack">
			<Field icon={<Icon name="search" size={16} />} placeholder="Search invoices" />
			<Select defaultValue="sent">
				<SelectTrigger>
					<SelectValue placeholder="Status" />
				</SelectTrigger>
				<SelectContent>
					{STATUS_ITEMS.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Segmented items={VIEWS} defaultValue="board" />
			<div className="demo-row">
				<Switch defaultChecked label="Archive when done" />
				<span>Archive when done</span>
			</div>
		</div>
	);
}

function Emblems() {
	return (
		<div className="demo-row demo-bottom">
			{["s", "m", "l", "xl"].map((size) => (
				<Emblem key={size} size={size} label="Ana Halden">
					<EmblemFallback seed={`Ana Halden ${size}`} />
				</Emblem>
			))}
		</div>
	);
}

function Progresses() {
	return (
		<div className="demo-stack">
			<ProgressBar value={64} label="Loaded" />
			<StatusProgress value={0} label="Not started" />
			<StatusProgress value={45} label="Running" />
			<StatusProgress value={100} label="Done" />
			<div className="demo-row">
				<ProgressBar shape="circle" size={72} value={72} label="Backup" displayValue={({ value }) => `${value}%`} />
				<StatusProgress shape="circle" size={72} value={100} label="Synced" />
			</div>
		</div>
	);
}

function Sparklines() {
	return (
		<div className="demo-stack">
			<Named name="SparklineLine · SparklineDot">
				<Sparkline data={WEEKS} label="Notes, twelve weeks">
					<SparklineLine />
					<SparklineDot at="last" />
				</Sparkline>
			</Named>
			<Named name="SparklineArea · color success">
				<Sparkline data={WEEKS} color="success" label="Notes, twelve weeks">
					<SparklineArea />
					<SparklineLine />
				</Sparkline>
			</Named>
			<Named name="SparklineBars">
				<Sparkline data={WEEKS} color={2} label="Notes, twelve weeks">
					<SparklineBars />
				</Sparkline>
			</Named>
			<Named name="SparklineDot at min and max">
				<Sparkline data={WEEKS} color="neutral" label="Notes, twelve weeks">
					<SparklineLine />
					<SparklineDot at="min" />
					<SparklineDot at="max" />
				</Sparkline>
			</Named>
		</div>
	);
}

function AxisAcross() {
	return <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />;
}

function Charts() {
	return (
		<Grid min={320}>
			<Cell name="AreaChart">
				<ChartContainer config={SERIES}>
					<AreaChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{AxisAcross()}
						<ChartTooltip content={<ChartTooltipContent indicator="line" />} />
						<ChartLegend content={<ChartLegendContent />} />
						<Area
							dataKey="links"
							type="monotone"
							stroke="var(--color-links)"
							fill="var(--color-links)"
							fillOpacity={0.18}
							strokeWidth={2}
						/>
						<Area
							dataKey="notes"
							type="monotone"
							stroke="var(--color-notes)"
							fill="var(--color-notes)"
							fillOpacity={0.18}
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			</Cell>
			<Cell name="BarChart">
				<ChartContainer config={SERIES}>
					<BarChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{AxisAcross()}
						<ChartTooltip content={<ChartTooltipContent />} />
						<ChartLegend content={<ChartLegendContent />} />
						<Bar dataKey="notes" fill="var(--color-notes)" radius={4} />
						<Bar dataKey="links" fill="var(--color-links)" radius={4} />
					</BarChart>
				</ChartContainer>
			</Cell>
			<Cell name="LineChart">
				<ChartContainer config={SERIES}>
					<LineChart data={MONTHS} margin={CHART_MARGIN} accessibilityLayer>
						<CartesianGrid vertical={false} />
						{AxisAcross()}
						<ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
						<Line dataKey="notes" type="monotone" stroke="var(--color-notes)" strokeWidth={2} dot={false} />
						<Line dataKey="links" type="monotone" stroke="var(--color-links)" strokeWidth={2} dot={false} />
					</LineChart>
				</ChartContainer>
			</Cell>
			<Cell name="PieChart">
				<ChartContainer config={AREA_CONFIG}>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel nameKey="area" />} />
						<Pie data={AREAS} dataKey="hours" nameKey="area" innerRadius="55%" strokeWidth={4} />
						<ChartLegend content={<ChartLegendContent nameKey="area" />} />
					</PieChart>
				</ChartContainer>
			</Cell>
		</Grid>
	);
}

function Skeletons() {
	return (
		<Grid min={320}>
			<Cell name='kind="block"'>
				<Skeleton style={{ height: "64px" }} />
			</Cell>
			<Cell name='kind="emblem" · size s m l xl'>
				<div className="demo-row demo-bottom">
					{["s", "m", "l", "xl"].map((size) => (
						<Skeleton key={size} kind="emblem" size={size} />
					))}
					<Skeleton kind="emblem" size="l" shape="rounded" />
				</div>
			</Cell>
			<Cell name='kind="button" · size s m l'>
				<div className="demo-row">
					<Skeleton kind="button" size="s" />
					<Skeleton kind="button" />
					<Skeleton kind="button" size="l" />
				</div>
			</Cell>
			{SKELETON_SHOWN.map(({ kind, props }) => (
				<Cell key={kind} name={`kind="${kind}"`}>
					<Skeleton kind={kind} {...props} />
				</Cell>
			))}
		</Grid>
	);
}

function ThemeSwitch() {
	const [theme, setTheme] = useState(
		document.documentElement.dataset["theme"] ??
			(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
	);
	const choose = (next: string): void => {
		document.documentElement.dataset["theme"] = next;
		setTheme(next);
	};
	return <Segmented items={THEMES} value={theme} onValueChange={choose} />;
}

function Demo() {
	return (
		<Layout kind="stack" className="demo-page">
			<LayoutHeader className="demo-head">
				<div>
					<Heading level={1}>Widgetarium kit</Heading>
					<p className="demo-note">Every component drawn from the kit itself, on the kit's own tokens.</p>
				</div>
				<LayoutActions>
					<ThemeSwitch />
				</LayoutActions>
			</LayoutHeader>
			<Grid min={340}>
				<Section title="Button" note="variant · size · isLoading · isDone · IconButton" usage={USAGE.button}>
					<Buttons />
				</Section>
				<Section title="Badge" note="tone · color · variant · size" usage={USAGE.badge}>
					<Badges />
				</Section>
				<Section title="Field · Select · Segmented · Switch" usage={USAGE.inputs}>
					<Inputs />
				</Section>
				<Section title="Emblem" note="size s · m · l · xl, the fallback mark from a seed" usage={USAGE.emblem}>
					<Emblems />
				</Section>
				<Section title="ProgressBar · StatusProgress" usage={USAGE.progress}>
					<Progresses />
				</Section>
				<Section title="Sparkline" note="A line with no axes, drawn at the size of a word" usage={USAGE.sparkline}>
					<Sparklines />
				</Section>
				<Section title="Calendar" usage={USAGE.calendar}>
					<Calendar defaultMonth={new Date(2026, 8, 1)} today={new Date(2026, 8, 24)} />
				</Section>
			</Grid>
			<WideSection title="Chart" note="Recharts parts inside ChartContainer, coloured by config" usage={USAGE.chart}>
				<Charts />
			</WideSection>
			<WideSection
				title="DataTable · Table · Pagination"
				note="DataTable is the ready table over the parts; the parts stay for a table it cannot draw"
				usage={USAGE.table}
			>
				<TableWithPages />
			</WideSection>
			<WideSection title="Skeleton" note="One component, a preset per kit item" usage={USAGE.skeleton}>
				<Skeletons />
			</WideSection>
		</Layout>
	);
}

const demoHost = document.getElementById("demo");
if (!demoHost) throw new Error("kit demo: the page has no #demo");
createRoot(demoHost).render(<Demo />);

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	canDo,
	createWidget,
	defineManifest,
	defineProp,
	pickedValue,
	useData,
} from "widgetarium";
import {
	Button,
	ButtonLabel,
	cardClass,
	Calendar,
	Field,
	Icon,
	IconButton,
	List,
	Card,
	Popover,
	PopoverItem,
	Segmented,
	useSegmentedThumb,
} from "widgetarium/kit";
import type { Aka, Day, Text, VaultRecord } from "widgetarium";
import { dayOfRecord } from "@default/lib";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";

const ALL_RECORDS = 5000;

type MetricRecord = VaultRecord & {
	amount?: (number & Aka<"value" | "count" | "total" | "kept" | "score" | "done">) | null;
	date?: (Day & Aka<"created" | "day" | "when" | "on">) | null;
	note?: (Text & Aka<"text" | "comment" | "description" | "body">) | null;
};

type PeriodRow = { label?: Text | null; days?: number | null };

type Tone = "up" | "down" | "flat";
type Band = "wide" | "mid" | "narrow" | "floor";
type Point = { day: string; value: number };
type Spot = { x: number; y: number };
type Bar = { day: string; x: number; y: number; width: number; height: number; rx: number };
type Hovered = { at: number; left: number };
type Draft = { ref: string | null; day: string; sign: string; amount: string; note: string };

type Summary = {
	points: Point[];
	balance: Point[];
	total: number;
	today: number;
	percent: number | null;
	direction: Tone;
	tone: Tone;
	peak: number;
	low: number;
	avg: number;
	undated: number;
};

type ChartBox = {
	width: number;
	height: number;
	headRoom: number;
	footY: number;
	bleed: number;
	inkAt: number;
	inkFar: number;
	underTop: number;
};

const BANDS: Band[] = ["wide", "mid", "narrow", "floor"];
const BAND_READ_FROM = "--mt3-band";
const TIP_AT = "--mt3-tip-at";
const TIP_WIDE_BY = "--mt3-tip-wide-by";
const TIP_TALL_BY = "--mt3-tip-tall-by";
const FLAT_UNDER = 0.5;
const HEAD_ROOM_SHARE = 70 / 440;
const FOOT_SHARE = 380 / 440;
const BLEED_SHARE = 22 / 440;
const BAR_GAP_SHARE = 10 / 560;
const DEFAULT_DAYS = 30;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ARROWS: Record<Tone, string> = {
	up: "M10 15.4V5.5M5.7 9.8L10 5.5l4.3 4.3",
	down: "M10 4.6v9.9M5.7 10.2L10 14.5l4.3-4.3",
	flat: "M4.6 10h10.8M10.9 5.7L15.2 10l-4.3 4.3",
};

const PLUS = "M10 4.9v10.2M4.9 10h10.2";
const CARET = "M6.4 8.6l3.6 3.4 3.6-3.4";
const LIST_LINES = "M7.4 6.2h8M7.4 10h8M7.4 13.8h8";
const CLOSE_CROSS = "M6.4 6.4l7.2 7.2M13.6 6.4l-7.2 7.2";
const DELETE_BIN = "M4.8 6.4h10.4M8.2 6.4V4.9h3.6v1.5M6.4 6.4l0.7 8.4h5.8l0.7-8.4";
const WARN_TRIANGLE = "M10 3.6L17 16H3z";
const WARN_MARK = "M10 8.4v3.2M10 13.6v0.4";

const SIGNS = [
	{ value: "add", label: "Add" },
	{ value: "subtract", label: "Subtract" },
];

const ADD_TITLE = "Add a record";
const ADD_DESC = "One note lands in Metrics, named after the day and the minute.";
const LIST_TITLE = "All records";
const LIST_DESC = "Newest first. Editing one redraws the card behind this window.";
const AT_THE_ROOT = "Vault";
const NOTHING_TO_COMPARE = "new";
const WHO_FAILED = "[widgetarium] metric-total:";
const CANNOT_WRITE = "The record was not written, so the card still reads what it read before.";
const CANNOT_DELETE = "The record was not deleted, so it is still in the list.";
const CANNOT_KEEP_VIEW = "This card cannot remember which chart you picked, so it kept the one it was drawing.";
const CANNOT_KEEP_PERIOD = "This card cannot remember the period you picked, so it kept the one it was reading over.";

const countSaid = (count: number, folder: string) =>
	count === 1 ? `${count} record · ${folder}` : `${count} records · ${folder}`;

const undatedSaid = (count: number) =>
	count === 1
		? `${count} record carries no date and stands outside every number on the card`
		: `${count} records carry no date and stand outside every number on the card`;

const rounded = (one: number) => Math.round(one * 10) / 10;

function shiftedBy(iso: string, days: number): string {
	const at = dateOf(iso);
	return isoFrom(new Date(at.getFullYear(), at.getMonth(), at.getDate() + days));
}

function trimmedZeros(written: string): string {
	if (!written.includes(".")) return written;
	return written.replace(/0+$/, "").replace(/\.$/, "");
}

function compactOf(value: number): string {
	if (value < 0) return `\u2212${compactOf(Math.abs(value))}`;
	if (value < 1000) return String(Math.round(value));
	const thousands = value / 1000;
	const places = thousands >= 100 ? 0 : thousands >= 10 ? 1 : 2;
	return `${trimmedZeros(thousands.toFixed(places))}K`;
}

function percentSaid(percent: number | null): string {
	if (percent === null) return NOTHING_TO_COMPARE;
	return `${Math.abs(percent).toFixed(1)}%`;
}

function signedOf(value: number): string {
	if (value < 0) return compactOf(value);
	return `+${compactOf(value)}`;
}

function shortDaySaid(iso: string): string {
	const parts = iso.split("-");
	return `${parts[2] ?? ""} ${MONTHS[Number(parts[1]) - 1] ?? ""}`;
}

function longDaySaid(iso: string): string {
	return `${shortDaySaid(iso)}, ${iso.slice(0, 4)}`;
}

function dateOf(iso: string): Date {
	return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
}

function isoFrom(at: Date): string {
	const month = String(at.getMonth() + 1).padStart(2, "0");
	return `${at.getFullYear()}-${month}-${String(at.getDate()).padStart(2, "0")}`;
}

function folderSaid(path: string | undefined): string {
	const cut = (path ?? "").lastIndexOf("/");
	if (cut < 1) return AT_THE_ROOT;
	const holding = path?.slice(0, cut) ?? "";
	return holding.slice(holding.lastIndexOf("/") + 1);
}

function amountOf(record: MetricRecord): number {
	const read = Number(record.amount);
	return Number.isFinite(read) ? read : 0;
}

function pointsOf(records: readonly MetricRecord[], from: string, to: string): Point[] {
	const byDay = new Map<string, number>();
	for (const record of records) {
		const day = dayOfRecord(record);
		if (!day || day < from || day > to) continue;
		byDay.set(day, (byDay.get(day) ?? 0) + amountOf(record));
	}
	return [...byDay.entries()]
		.sort(([here], [there]) => (here < there ? -1 : 1))
		.map(([day, value]) => ({ day, value }));
}

function balanceByDay(records: readonly MetricRecord[], days: number, from: string): Point[] {
	const byDay = new Map<string, number>();
	let opening = 0;
	for (const record of records) {
		const day = dayOfRecord(record);
		if (!day) continue;
		if (day < from) {
			opening += amountOf(record);
			continue;
		}
		byDay.set(day, (byDay.get(day) ?? 0) + amountOf(record));
	}
	let running = opening;
	return Array.from({ length: Math.max(days, 1) }, (_unused, at) => {
		const day = shiftedBy(from, at);
		running += byDay.get(day) ?? 0;
		return { day, value: running };
	});
}

function sumOf(points: readonly Point[]): number {
	return points.reduce((kept, point) => kept + point.value, 0);
}

function directionOf(percent: number): Tone {
	if (Math.abs(percent) < FLAT_UNDER) return "flat";
	return percent > 0 ? "up" : "down";
}

function toneOf(direction: Tone, rising: string): Tone {
	if (direction === "flat") return "flat";
	return (direction === "up") === (rising !== "bad") ? "up" : "down";
}

function summarize(records: readonly MetricRecord[], days: number, today: string, rising: string): Summary {
	const points = pointsOf(records, shiftedBy(today, 1 - days), today);
	const before = pointsOf(records, shiftedBy(today, 1 - days * 2), shiftedBy(today, -days));
	const total = sumOf(points);
	const was = sumOf(before);
	const percent = was > 0 ? ((total - was) / was) * 100 : null;
	const direction = percent === null ? (total > 0 ? "up" : "flat") : directionOf(percent);
	const values = points.map((point) => point.value);
	return {
		points,
		balance: balanceByDay(records, days, shiftedBy(today, 1 - days)),
		total,
		today: points.find((point) => point.day === today)?.value ?? 0,
		percent,
		direction,
		tone: toneOf(direction, rising),
		peak: values.length > 0 ? Math.max(...values) : 0,
		low: values.length > 0 ? Math.min(...values) : 0,
		avg: values.length > 0 ? Math.round(total / values.length) : 0,
		undated: records.filter((record) => !dayOfRecord(record)).length,
	};
}

function bandOf(node: HTMLElement): Band {
	const said = getComputedStyle(node).getPropertyValue(BAND_READ_FROM).trim();
	return BANDS.find((one) => one === said) ?? "wide";
}

const WIDE_CHART = { width: 560, height: 440, inkAt: 0.22, inkFar: 0.52, underTop: 0.24 };
const NARROW_CHART = { width: 300, height: 300, inkAt: 0.24, inkFar: 0.56, underTop: 0.22 };

function chartOf(band: Band): ChartBox {
	const drawn = band === "wide" || band === "mid" ? WIDE_CHART : NARROW_CHART;
	return {
		...drawn,
		headRoom: drawn.height * HEAD_ROOM_SHARE,
		footY: drawn.height * FOOT_SHARE,
		bleed: drawn.height * BLEED_SHARE,
	};
}

function spotsOf(points: readonly Point[], box: ChartBox, days: number, from: string): Spot[] {
	const values = points.map((point) => point.value);
	const ceiling = Math.max(...values);
	const floor = Math.min(...values);
	const span = Math.max(ceiling - floor, 1);
	const last = Math.max(days - 1, 1);
	return points.map((point) => ({
		x: (slotOf(point.day, from) / last) * box.width,
		y: box.headRoom + ((ceiling - point.value) / span) * (box.footY - box.headRoom),
	}));
}

function stepsOf(spots: readonly Spot[]): number[] {
	const steps: number[] = [];
	for (let at = 1; at < spots.length; at += 1) {
		const here = spots[at] as Spot;
		const before = spots[at - 1] as Spot;
		steps.push((here.y - before.y) / Math.max(here.x - before.x, 0.0001));
	}
	return steps;
}

function slopeAt(steps: readonly number[], at: number): number {
	const before = steps[at - 1];
	const after = steps[at];
	if (before === undefined) return after ?? 0;
	if (after === undefined) return before;
	if (before * after <= 0) return 0;
	return (2 * before * after) / (before + after);
}

function pathThrough(spots: readonly Spot[]): string {
	const first = spots[0];
	if (!first) return "";
	const steps = stepsOf(spots);
	let written = `M${rounded(first.x)} ${rounded(first.y)}`;
	for (let at = 1; at < spots.length; at += 1) {
		const here = spots[at] as Spot;
		const before = spots[at - 1] as Spot;
		const third = (here.x - before.x) / 3;
		const out = rounded(before.y + slopeAt(steps, at - 1) * third);
		const into = rounded(here.y - slopeAt(steps, at) * third);
		written += ` C${rounded(before.x + third)} ${out} ${rounded(here.x - third)} ${into} ${rounded(here.x)} ${rounded(here.y)}`;
	}
	return written;
}

function areaUnder(line: string, box: ChartBox): string {
	return `${line} L${box.width} ${box.height} L0 ${box.height} Z`;
}

function slotOf(day: string, from: string): number {
	return Math.round((dateOf(day).getTime() - dateOf(from).getTime()) / 86400000);
}

function barsOf(points: readonly Point[], spots: readonly Spot[], box: ChartBox, days: number, from: string): Bar[] {
	const pitch = box.width / Math.max(days, 1);
	const gap = box.width * BAR_GAP_SHARE;
	const width = Math.max(pitch - gap, 1);
	return points.map((point, at) => {
		const spot = spots[at] as Spot;
		return {
			day: point.day,
			x: rounded(slotOf(point.day, from) * pitch + gap / 2),
			y: rounded(spot.y),
			width: rounded(width),
			height: rounded(box.height + box.bleed - spot.y),
			rx: rounded(width / 2),
		};
	});
}

function useBand(held: { current: HTMLElement | null }): Band {
	const [band, setBand] = useState<Band>("wide");
	useLayoutEffect(() => {
		const node = held.current;
		if (!node) return undefined;
		const read = () => setBand(bandOf(node));
		read();
		const watch = new ResizeObserver(read);
		watch.observe(node);
		return () => watch.disconnect();
	}, [held]);
	return band;
}

type StrokedProps = {
	part?: string | undefined;
	className: string;
	size: number;
	weight: number;
	join?: boolean;
	children: ReactNode;
};

function Stroked({ part, className, size, weight, join, children }: StrokedProps) {
	return (
		<svg
			data-part={part}
			className={`wg-kit-icon-glyph ${className}`}
			width={size}
			height={size}
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			style={{ strokeWidth: weight, strokeLinejoin: join ? "round" : "miter" }}
			aria-hidden="true"
		>
			{children}
		</svg>
	);
}

function ListGlyph({ part, className }: { part?: string; className: string }) {
	return (
		<Stroked part={part} className={className} size={17} weight={1.8}>
			<path d={LIST_LINES} />
			<circle cx="4.4" cy="6.2" r="0.9" fill="currentColor" stroke="none" />
			<circle cx="4.4" cy="10" r="0.9" fill="currentColor" stroke="none" />
			<circle cx="4.4" cy="13.8" r="0.9" fill="currentColor" stroke="none" />
		</Stroked>
	);
}

type ChartProps = {
	points: Point[];
	days: number;
	from: string;
	view: string;
	band: Band;
	ids: string;
	hovered: Hovered | null;
	onHover: (found: Hovered | null) => void;
};

function CurveInk({ spots, box, ids }: { spots: Spot[]; box: ChartBox; ids: string }) {
	if (spots.length < 2) return null;
	const line = pathThrough(spots);
	return (
		<>
			<path d={areaUnder(line, box)} fill={`url(#${ids}-under)`} />
			<path className="mt3-line" d={line} vectorEffect="non-scaling-stroke" />
		</>
	);
}

type BarsInkProps = {
	points: Point[];
	spots: Spot[];
	box: ChartBox;
	ids: string;
	at: number | null;
	days: number;
	from: string;
};

function BarsInk({ points, spots, box, ids, at, days, from }: BarsInkProps) {
	return (
		<>
			{barsOf(points, spots, box, days, from).map((bar, which) => (
				<rect
					key={bar.day}
					x={bar.x}
					y={bar.y}
					width={bar.width}
					height={bar.height}
					rx={bar.rx}
					fill={`url(#${ids}-bar-${which === at ? "strong" : "soft"})`}
				/>
			))}
		</>
	);
}

function Chart({ points, days, from, view, band, ids, hovered, onHover }: ChartProps) {
	const box = chartOf(band);
	const spots = spotsOf(points, box, days, from);

	const moved = (event: ReactPointerEvent<HTMLDivElement>) => {
		const node = event.currentTarget;
		const room = node.getBoundingClientRect();
		const share = (event.clientX - room.left) / Math.max(room.width, 1);
		const at = Math.min(points.length - 1, Math.max(0, Math.round(share * (points.length - 1))));
		const spot = spots[at];
		if (!spot) return;
		onHover({ at, left: node.offsetLeft + (spot.x / box.width) * node.clientWidth });
	};

	return (
		<div data-part="chart" className="mt3-chart" onPointerMove={moved} onPointerLeave={() => onHover(null)}>
			<svg viewBox={`0 0 ${box.width} ${box.height}`} preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<linearGradient id={`${ids}-ink-ramp`} className="mt3-ramp" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopOpacity="0" />
						<stop offset={box.inkAt} stopOpacity="0.3" />
						<stop offset={box.inkFar} stopOpacity="1" />
					</linearGradient>
					<mask id={`${ids}-ink-fade`}>
						<rect width={box.width} height={box.height} fill={`url(#${ids}-ink-ramp)`} />
					</mask>
					<linearGradient id={`${ids}-under`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity={box.underTop} />
						<stop offset="1" stopOpacity="0.015" />
					</linearGradient>
					<linearGradient id={`${ids}-bar-soft`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity="0.46" />
						<stop offset="1" stopOpacity="0.1" />
					</linearGradient>
					<linearGradient id={`${ids}-bar-strong`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity="1" />
						<stop offset="1" stopOpacity="0.4" />
					</linearGradient>
				</defs>

				<g mask={`url(#${ids}-ink-fade)`}>
					{view === "bars" ? (
						<BarsInk
							points={points}
							spots={spots}
							box={box}
							ids={ids}
							at={hovered?.at ?? null}
							days={days}
							from={from}
						/>
					) : (
						<CurveInk spots={spots} box={box} ids={ids} />
					)}
				</g>
			</svg>
		</div>
	);
}

function Tip({ point, unit, left }: { point: Point; unit: string; left: number }) {
	const held = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const node = held.current;
		if (!node) return;
		const room = node.getBoundingClientRect();
		node.style.setProperty(TIP_WIDE_BY, `${room.width}px`);
		node.style.setProperty(TIP_TALL_BY, `${room.height}px`);
	});

	return (
		<div ref={held} data-part="tip" className={`${cardClass({})} mt3-tip`} style={{ [TIP_AT]: `${left}px` }}>
			<div data-part="tip-value" className="mt3-tip-value">{`${compactOf(point.value)} ${unit}`}</div>
			<div data-part="tip-day" className="mt3-tip-day">
				{longDaySaid(point.day)}
			</div>
		</div>
	);
}

// TRADE-OFF: the kit's thumb hook, not its Segmented — an icon-only tab needs its own aria-label
function ViewToggle({ view, onView }: { view: string; onView: (picked: string) => void }) {
	const at = view === "bars" ? "bars" : "curve";
	const { listRef, thumbProps } = useSegmentedThumb(at, 2);

	return (
		<div className="wg-kit-seg is-s mt3-seg" ref={listRef} role="tablist">
			<span {...thumbProps} />
			<button
				type="button"
				role="tab"
				aria-selected={at === "curve"}
				aria-label="Curve"
				onClick={() => onView("curve")}
			>
				<Icon name="curve" size={16} className="mt3-seg-glyph" />
			</button>
			<button type="button" role="tab" aria-selected={at === "bars"} aria-label="Bars" onClick={() => onView("bars")}>
				<Icon name="bars" size={16} className="mt3-seg-glyph" />
			</button>
		</div>
	);
}

type HeadProps = {
	title: string;
	summary: Summary;
	label: string;
	days: number;
	view: string;
	rows: { ref: string; label: string }[];
	onView: (picked: string) => void;
	onPeriod: (ref: string) => void;
};

function PeriodPicker({ label, days, rows, onPeriod }: Omit<HeadProps, "title" | "summary" | "view" | "onView">) {
	return (
		<Popover
			className="mt3-periods"
			placement="below"
			trigger={
				<Button variant="ghost" size="s" className="mt3-period" data-part="period">
					<span className="mt3-period-long">{label}</span>
					<span className="mt3-period-short">{`${days}d`}</span>
					<Stroked part="period-caret" className="mt3-period-caret" size={16} weight={1.7} join>
						<path d={CARET} />
					</Stroked>
				</Button>
			}
		>
			{rows.map((row) => (
				<PopoverItem key={row.ref} onClick={() => onPeriod(row.ref)}>
					{row.label}
				</PopoverItem>
			))}
		</Popover>
	);
}

function Head({ title, summary, label, days, view, rows, onView, onPeriod }: HeadProps) {
	return (
		<div data-part="head" className="mt3-head">
			<div data-part="head-left" className="mt3-head-left">
				<span data-part="title" className="mt3-title">
					{title}
				</span>
				<ViewToggle view={view} onView={onView} />
			</div>
			<div data-part="head-right" className="mt3-head-right">
				<span data-part="trend" className="mt3-trend">
					<Stroked part="trend-arrow" className="mt3-trend-arrow" size={15} weight={2.1} join>
						<path d={ARROWS[summary.direction]} />
					</Stroked>
					{percentSaid(summary.percent)}
				</span>
				<PeriodPicker label={label} days={days} rows={rows} onPeriod={onPeriod} />
			</div>
		</div>
	);
}

type PlateProps = { name: string; label: string; value: string; isTone?: boolean };

function MetricPlate({ name, label, value, isTone }: PlateProps) {
	const worn = isTone ? `mt3-plate mt3-plate-${name} is-tone` : `mt3-plate mt3-plate-${name}`;
	return (
		<Card type="group" data-part={`plate-${name}`} className={worn}>
			<span data-part={`plate-${name}-value`} className="mt3-plate-value">
				{value}
			</span>
			<span data-part={`plate-${name}-label`} className="mt3-plate-label">
				{label}
			</span>
		</Card>
	);
}

function Plates({ summary }: { summary: Summary }) {
	return (
		<div data-part="plates" className="mt3-plates">
			<MetricPlate name="today" label="today" value={signedOf(summary.today)} isTone />
			<MetricPlate name="peak" label="peak" value={compactOf(summary.peak)} />
			<MetricPlate name="low" label="low" value={compactOf(summary.low)} />
			<MetricPlate name="avg" label="avg" value={compactOf(summary.avg)} />
		</div>
	);
}

type FootProps = { band: Band; canAdd: boolean; onAdd: () => void; onList: () => void };

function AddButton({ band, onAdd }: { band: Band; onAdd: () => void }) {
	const saysItself = band === "wide" || band === "mid";
	return (
		<Button
			variant="accent"
			size="s"
			className="mt3-add"
			data-part="add"
			aria-label={saysItself ? undefined : "Add record"}
			onClick={onAdd}
		>
			<Stroked part="add-icon" className="mt3-add-icon" size={17} weight={2}>
				<path d={PLUS} />
			</Stroked>
			{saysItself ? <ButtonLabel>Add record</ButtonLabel> : null}
		</Button>
	);
}

function Foot({ band, canAdd, onAdd, onList }: FootProps) {
	return (
		<div data-part="foot" className="mt3-foot">
			{canAdd ? <AddButton band={band} onAdd={onAdd} /> : null}
			<IconButton className="mt3-open-list" data-part="open-list" label="All records" onClick={onList}>
				<ListGlyph part="open-list-icon" className="mt3-list-icon" />
			</IconButton>
		</div>
	);
}

function CloseButton({ name, onClose }: { name: string; onClose: () => void }) {
	return (
		<IconButton size="xs" label="Close" className="wg-dialog-close" data-part={`${name}-close`} onClick={onClose}>
			<Stroked part={`${name}-close-icon`} className="mt3-close-icon" size={16} weight={1.8}>
				<path d={CLOSE_CROSS} />
			</Stroked>
		</IconButton>
	);
}

type AddDialogProps = {
	draft: Draft;
	unit: string;
	today: string;
	onDraft: (next: Draft) => void;
	onClose: () => void;
	onConfirm: () => void;
};

function AddDialog({ draft, unit, today, onDraft, onClose, onConfirm }: AddDialogProps) {
	return (
		<Dialog isOpen onClose={onClose}>
			<DialogContent className="mt3-add-dialog">
				<CloseButton name="add" onClose={onClose} />
				<DialogHeader data-part="add-head">
					<DialogTitle data-part="add-title">{ADD_TITLE}</DialogTitle>
					<DialogDescription data-part="add-desc">{ADD_DESC}</DialogDescription>
				</DialogHeader>
				<div data-part="add-body" className="mt3-add-body">
					{/* TRADE-OFF: the kit's six rows, ~39px taller than the artboard's five */}
					<Calendar
						className="mt3-calendar"
						selected={dateOf(draft.day)}
						today={dateOf(today)}
						onSelect={(day: Date) => onDraft({ ...draft, day: isoFrom(day) })}
					/>
					<div data-part="add-side" className="mt3-side">
						<span data-part="label-amount" className="mt3-label">
							Amount
						</span>
						<Segmented
							items={SIGNS}
							value={draft.sign}
							onChange={(sign: string) => onDraft({ ...draft, sign })}
							size="s"
							className="mt3-sign"
						/>
						<Field
							className="mt3-amount"
							type="number"
							value={draft.amount}
							onInput={(event: { currentTarget: HTMLInputElement }) =>
								onDraft({ ...draft, amount: event.currentTarget.value })
							}
							icon={
								<span data-part="amount-unit" className="mt3-amount-unit">
									{unit}
								</span>
							}
						/>
						<span data-part="label-note" className="mt3-label">
							Note
						</span>
						<div className="mt3-note">
							<textarea
								placeholder="Optional"
								value={draft.note}
								onInput={(event) => onDraft({ ...draft, note: event.currentTarget.value })}
							/>
						</div>
					</div>
				</div>
				<DialogFooter data-part="add-foot">
					<Button size="s" className="mt3-btn" data-part="cancel" onClick={onClose}>
						Cancel
					</Button>
					<Button size="s" variant="accent" className="mt3-btn" data-part="confirm" onClick={onConfirm}>
						Add record
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

type Listed = { ref: string; day: string; note: string; amount: number };

type Allowed = { canAdd: boolean; canEdit: boolean; canDelete: boolean };

type ListDialogProps = {
	listed: Listed[];
	count: number;
	folder: string;
	undated: number;
	allowed: Allowed;
	onClose: () => void;
	onAdd: () => void;
	onEdit: (row: Listed) => void;
	onDelete: (ref: string) => void;
};

type RecordActionsProps = {
	row: Listed;
	allowed: Allowed;
	onEdit: (row: Listed) => void;
	onDelete: (ref: string) => void;
};

function RecordActions({ row, allowed, onEdit, onDelete }: RecordActionsProps) {
	return (
		<span data-part="record-actions" className="mt3-record-actions">
			{allowed.canEdit ? (
				<IconButton
					size="s"
					variant="raised"
					data-part="record-edit"
					className="mt3-record-btn"
					label="Edit"
					onClick={() => onEdit(row)}
				>
					<Icon name="pencil" size={15} className="mt3-record-icon" />
				</IconButton>
			) : null}
			{allowed.canDelete ? (
				<IconButton
					size="s"
					variant="raised"
					data-part="record-delete"
					className="mt3-record-btn"
					label="Delete"
					onClick={() => onDelete(row.ref)}
				>
					<Stroked className="mt3-record-icon" size={15} weight={1.6} join>
						<path d={DELETE_BIN} />
					</Stroked>
				</IconButton>
			) : null}
		</span>
	);
}

function rowPartOf(at: number, total: number): string | undefined {
	if (at === 0) return "record";
	if (at === total - 1) return "record-last";
	return undefined;
}

function amountPartOf(at: number, downAt: number): string | undefined {
	if (at === 0) return "record-amount";
	if (at === downAt) return "record-down";
	return undefined;
}

function ListDialog({ listed, count, folder, undated, allowed, onClose, onAdd, onEdit, onDelete }: ListDialogProps) {
	const downAt = listed.findIndex((row) => row.amount < 0);
	return (
		<Dialog isOpen onClose={onClose}>
			<DialogContent className="mt3-list-dialog">
				<CloseButton name="list" onClose={onClose} />
				<DialogHeader data-part="list-head">
					<DialogTitle data-part="list-title">{LIST_TITLE}</DialogTitle>
					<DialogDescription data-part="list-desc">{LIST_DESC}</DialogDescription>
				</DialogHeader>
				<List data-part="records">
					{listed.map((row, at) => (
						<div key={row.ref} data-part={rowPartOf(at, listed.length)} className="mt3-record">
							<span data-part="record-date" className="mt3-record-date">
								{shortDaySaid(row.day)}
							</span>
							<span data-part="record-note" className="mt3-record-note">
								{row.note.length > 0 ? row.note : "—"}
							</span>
							<span
								data-part={amountPartOf(at, downAt)}
								className={`mt3-record-amount ${row.amount < 0 ? "is-down" : "is-up"}`}
							>
								{signedOf(row.amount)}
							</span>
							<RecordActions row={row} allowed={allowed} onEdit={onEdit} onDelete={onDelete} />
						</div>
					))}
				</List>
				{undated > 0 ? (
					<div data-part="undated" className="mt3-undated">
						<Stroked part="undated-icon" className="mt3-undated-icon" size={17} weight={1.7}>
							<path d={WARN_TRIANGLE} />
							<path d={WARN_MARK} />
						</Stroked>
						{undatedSaid(undated)}
					</div>
				) : null}
				<DialogFooter data-part="list-foot">
					<span data-part="list-count" className="mt3-list-count">
						{countSaid(count, folder)}
					</span>
					{allowed.canAdd ? (
						<Button size="s" variant="accent" className="mt3-btn mt3-list-add" data-part="list-add" onClick={onAdd}>
							<Stroked part="list-add-icon" className="mt3-list-add-icon" size={17} weight={2}>
								<path d={PLUS} />
							</Stroked>
							Add record
						</Button>
					) : null}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const emptyDraft = (day: string): Draft => ({ ref: null, day, sign: "add", amount: "", note: "" });

export const manifest = defineManifest({
	title: "Metric total",
	description: "A running total over a window, the curve or bars behind it, and the day's own reading.",
	keywords: [
		"metric",
		"total",
		"sum",
		"chart",
		"curve",
		"bars",
		"sparkline",
		"trend",
		"records",
		"amount",
		"period",
		"number",
	],
	role: "indicator",
	preview: {
		shot: { of: "218794189" },
		size: { w: 6, h: 5 },
		props: {
			title: { value: "Revenue" },
			unit: { value: "$" },
			records: {
				rows: [
					{ path: "Metrics/2026-08-25-1.md", date: "2026-08-25", amount: 40, note: "Client retainer" },
					{ path: "Metrics/2026-08-25-2.md", date: "2026-08-25", amount: -12, note: "Hosting" },
					{ path: "Metrics/2026-08-26-3.md", date: "2026-08-26", amount: -15, note: "Design tools" },
					{ path: "Metrics/2026-08-27-4.md", date: "2026-08-27", amount: 30, note: "Workshop fee" },
					{ path: "Metrics/2026-08-28-5.md", date: "2026-08-28", amount: 20, note: "Late invoice" },
					{ path: "Metrics/2026-08-28-6.md", date: "2026-08-28", amount: -8, note: "Domain renewal" },
					{ path: "Metrics/2026-08-29-7.md", date: "2026-08-29", amount: -25, note: "Contractor day" },
					{ path: "Metrics/2026-08-30-8.md", date: "2026-08-30", amount: 35, note: "Consulting call" },
					{ path: "Metrics/2026-08-31-9.md", date: "2026-08-31", amount: 45, note: "Retainer top up" },
					{ path: "Metrics/2026-09-01-10.md", date: "2026-09-01", amount: -20, note: "Office rent" },
					{ path: "Metrics/2026-09-02-11.md", date: "2026-09-02", amount: 30, note: "Template sale" },
					{ path: "Metrics/2026-09-02-12.md", date: "2026-09-02", amount: 14, note: "Template sale" },
					{ path: "Metrics/2026-09-03-13.md", date: "2026-09-03", amount: 15, note: "Support hours" },
					{ path: "Metrics/2026-09-04-14.md", date: "2026-09-04", amount: -35, note: "Hardware" },
					{ path: "Metrics/2026-09-05-15.md", date: "2026-09-05", amount: 25, note: "Audit session" },
					{ path: "Metrics/2026-09-06-16.md", date: "2026-09-06", amount: 20, note: "Template sale" },
					{ path: "Metrics/2026-09-07-17.md", date: "2026-09-07", amount: 60, note: "Onboarding project" },
					{ path: "Metrics/2026-09-07-18.md", date: "2026-09-07", amount: -18, note: "Travel" },
					{ path: "Metrics/2026-09-08-19.md", date: "2026-09-08", amount: -20, note: "Subscriptions" },
					{ path: "Metrics/2026-09-09-20.md", date: "2026-09-09", amount: 75, note: "Second milestone" },
					{ path: "Metrics/2026-09-09-21.md", date: "2026-09-09", amount: 22, note: "Template sale" },
					{ path: "Metrics/2026-09-10-22.md", date: "2026-09-10", amount: 40, note: "Review session" },
					{ path: "Metrics/2026-09-11-23.md", date: "2026-09-11", amount: -30, note: "Contractor day" },
					{ path: "Metrics/2026-09-12-24.md", date: "2026-09-12", amount: 85, note: "Final milestone" },
					{ path: "Metrics/2026-09-12-25.md", date: "2026-09-12", amount: 18, note: "Template sale" },
					{ path: "Metrics/2026-09-13-26.md", date: "2026-09-13", amount: 55, note: "New retainer" },
					{ path: "Metrics/2026-09-13-27.md", date: "2026-09-13", amount: 26, note: "Template sale" },
				],
			},
		},
	},
	props: {
		records: defineProp<MetricRecord[]>()({
			label: "Records",
			hint: "One note per reading. Each carries a date and an amount.",
			default: [],
			writes: ["create", "update", "remove"],
			describes: {
				amount: { type: "number", aka: ["value", "count", "total", "kept", "score", "done"] },
				date: { type: "date", aka: ["created", "day", "when", "on"] },
				note: { type: "text", aka: ["text", "comment", "description", "body"] },
			},
		}),
		title: defineProp<string>()({
			label: "What the number is",
			default: "Total",
		}),
		unit: defineProp<string>()({
			label: "Unit the amounts are in",
			default: "",
		}),
		rising: defineProp<string>()({
			label: "good · bad",
			hint: "Whether a rise reads as good or as bad.",
			default: "good",
		}),
		periods: defineProp<PeriodRow[]>()({
			label: "Periods",
			hint: "Every window the card can read over.",
			default: [
				{ label: "Past 7 days", days: 7 },
				{ label: "Past 30 days", days: 30 },
				{ label: "Past 90 days", days: 90 },
			],
			describes: {
				label: { label: "Label", type: "text", required: true },
				days: { label: "Days", type: "number", required: true },
			},
		}),
		periodPick: defineProp<string>()({
			label: "Picked period",
			of: "periods",
			field: "label",
			fallback: "first",
			writes: ["update"],
		}),
		period: defineProp<PeriodRow>()({
			label: "The period",
			picks: "periodPick",
			of: "periods",
		}),
		view: defineProp<string>()({
			label: "curve · bars",
			default: "curve",
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ records, title, unit, rising, periods, periodPick, period, view, host }) => {
	const surfaceRef = useRef<HTMLDivElement | null>(null);
	const band = useBand(surfaceRef);
	const ids = useId().replace(/:/g, "");

	const kept = useData(records.list, { limit: ALL_RECORDS }).data;
	const periodRows = useData(periods.list, { limit: ALL_RECORDS }).data;
	const shown = String(useData(title.get).data ?? "");
	const unitSaid = String(useData(unit.get).data ?? "");
	const risingSaid = String(useData(rising.get).data ?? "good");
	const picked = String(pickedValue(useData(periodPick.get).data) ?? "");
	const held = useData(period.get).data;
	const viewing = String(useData(view.get).data ?? "curve");

	const today = isoFrom(new Date());
	const days = Math.max(1, Number(held?.days ?? DEFAULT_DAYS));
	const label = String(held?.label ?? picked);
	const summary = summarize(kept, days, today, risingSaid);

	const allowed: Allowed = {
		canAdd: canDo(records.create),
		canEdit: canDo(records.update),
		canDelete: canDo(records.remove),
	};

	const [hovered, setHovered] = useState<Hovered | null>(null);
	const [asked, setAsked] = useState<string | null>(null);
	const [draft, setDraft] = useState<Draft>(() => emptyDraft(today));

	const listed: Listed[] = kept
		.filter((record) => dayOfRecord(record))
		.map((record) => ({
			ref: record.ref,
			day: dayOfRecord(record) ?? today,
			note: String(record.note ?? ""),
			amount: amountOf(record),
		}))
		.sort((here, there) => (here.day < there.day ? 1 : -1));

	const openAdd = () => {
		setDraft(emptyDraft(today));
		setAsked("add");
	};

	const editRow = (row: Listed) => {
		setDraft({
			ref: row.ref,
			day: row.day,
			sign: row.amount < 0 ? "subtract" : "add",
			amount: String(Math.abs(row.amount)),
			note: row.note,
		});
		setAsked("add");
	};

	const wrote = async (write: Promise<unknown>, said: string) => {
		try {
			await write;
			return true;
		} catch (failure) {
			host?.ui?.notify(said);
			console.error(`${WHO_FAILED} ${said}`, failure);
			return false;
		}
	};

	const confirmDraft = async () => {
		const amount = Number(draft.amount);
		if (!Number.isFinite(amount)) return;
		const signed = draft.sign === "subtract" ? -Math.abs(amount) : Math.abs(amount);
		const data = { date: draft.day, amount: signed, note: draft.note };
		const write = draft.ref ? records.update({ ref: draft.ref, data }) : records.create(data);
		if (await wrote(write, CANNOT_WRITE)) setAsked(null);
	};

	const point = hovered ? summary.balance[hovered.at] : undefined;

	return (
		<div data-part="root" className="mt3-root wg-metric" data-tone={summary.tone}>
			<div data-part="surface" className="mt3-surface" ref={surfaceRef}>
				<Chart
					points={summary.balance}
					days={days}
					from={shiftedBy(today, 1 - days)}
					view={viewing}
					band={band}
					ids={ids}
					hovered={hovered}
					onHover={setHovered}
				/>
				{point && hovered ? <Tip point={point} unit={unitSaid} left={hovered.left} /> : null}
				<div data-part="content" className="mt3-content">
					<Head
						title={shown}
						summary={summary}
						label={label}
						days={days}
						view={viewing}
						rows={periodRows.map((row) => ({ ref: row.ref, label: String(row.label ?? "") }))}
						onView={(next) => void wrote(view.update(next), CANNOT_KEEP_VIEW)}
						onPeriod={(next) => void wrote(periodPick.update(next), CANNOT_KEEP_PERIOD)}
					/>
					<div data-part="total" className="mt3-headline">
						{compactOf(summary.total)}
					</div>
					<Plates summary={summary} />
					<Foot band={band} canAdd={allowed.canAdd} onAdd={openAdd} onList={() => setAsked("list")} />
				</div>
			</div>
			{asked === "add" ? (
				<AddDialog
					draft={draft}
					unit={unitSaid}
					today={today}
					onDraft={setDraft}
					onClose={() => setAsked(null)}
					onConfirm={confirmDraft}
				/>
			) : null}
			{asked === "list" ? (
				<ListDialog
					listed={listed}
					count={kept.length}
					folder={folderSaid(kept[0]?.path)}
					undated={summary.undated}
					allowed={allowed}
					onClose={() => setAsked(null)}
					onAdd={openAdd}
					onEdit={editRow}
					onDelete={(ref) => void wrote(records.remove(ref), CANNOT_DELETE)}
				/>
			) : null}
		</div>
	);
});

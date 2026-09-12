import { canDo, createWidget, Dialog, DialogContent, DialogClose, DialogFooter, DialogHeader, DialogTitle, DialogDescription, flatRows, pickedValue, useData, WidgetRoot } from "widgetarium";
import type { Aka, CollectionGateway, CreateAction, Day, GetAction, ListAction, RemoveAction, Text, UpdateAction, ValueGateway, VaultRecord } from "widgetarium";
import { useState } from "react";
import type { ReactNode } from "react";
import { Button, ButtonLabel, Calendar, Field, Icon, IconButton, Popover, PopoverItem, Segmented } from "widgetarium/kit";
import { amountOf, areaUnder, barsOf, baselineOf, dateOf, dayOfRecord, emptyDraft, formatCompact, formatPercent, formatSigned, isoOf, leftOutLine, pathThrough, platesOf, readableDay, spotsOf, summarize, tipShare, writeDraft } from "@default/lib";
import type { ChartBox, MetricPoint, MetricSpan, MetricSummary } from "@default/lib";

type MetricRecord = VaultRecord & {
	amount?: (number & Aka<"value" | "count" | "total" | "sum" | "qty" | "delta">) | null;
	date?: (Day & Aka<"day" | "when" | "on" | "created">) | null;
	note?: (Text & Aka<"label" | "comment" | "memo" | "description">) | null;
};

type PeriodRow = { label?: string; days?: number };

type Writes = {
	list: ListAction;
	create?: CreateAction;
	update?: UpdateAction;
	remove?: RemoveAction;
};

type MetricProps = {
	records: CollectionGateway<MetricRecord, Writes>;
	title: ValueGateway<string>;
	unit: ValueGateway<string>;
	rising: ValueGateway<string>;
	periods: CollectionGateway<PeriodRow, { list: ListAction }>;
	periodPick: ValueGateway<string, { get: GetAction; update?: UpdateAction }>;
	period: ValueGateway<PeriodRow, { get: GetAction }>;
	view: ValueGateway<string, { get: GetAction; update?: UpdateAction }>;
};

type Draft = { date: string; amount: string; note: string };

type Form = { today: string; unit: string; draft: Draft; onDraft: (next: Draft) => void; failure: string };

export default createWidget(function MetricTotal(props: MetricProps) {
	const [isAdding, setAdding] = useState(false);
	const [isListing, setListing] = useState(false);
	const [isPicking, setPicking] = useState(false);
	const [hovered, setHovered] = useState(-1);
	const [failure, setFailure] = useState("");
	const today = isoOf(new Date());
	const [draft, setDraft] = useState(() => emptyDraft(today));
	const read = useReading(props, today);
	const point = read.summary.points[hovered];
	const form: Form = { today, unit: read.unit, draft, onDraft: setDraft, failure };

	const save = async () => {
		const refusal = await writeDraft(props.records, draft);
		setFailure(refusal);
		if (refusal) return;
		setDraft(emptyDraft(today));
		setAdding(false);
	};

	const shell = (children: ReactNode) => (
		<WidgetRoot className="wg-metric" data-tone={read.summary.tone} style={{ "--wg-metric-turn": TONE_TURNS[read.summary.tone] }}>
			{children}
		</WidgetRoot>
	);

	const said = saidInstead(read);
	if (said) {
		return shell(
			<div className="mt-empty">
				<span className="mt-title">{read.heading}</span>
				<span className="mt-empty-note">{said}</span>
				{canDo(props.records.create) ? (
					<Button size="s" variant="accent" onClick={() => setAdding(true)}>
						<Icon name="plus" size={15} />
						<ButtonLabel>Add record</ButtonLabel>
					</Button>
				) : null}
				<AddDialog isOpen={isAdding} onOpenChange={setAdding} form={form} onSave={() => void save()} />
			</div>,
		);
	}

	const periodTrigger = (
		<Button size="s" variant="plain" className="mt-period" aria-label="Change the period">
			<ButtonLabel>{read.picked || `${read.days}d`}</ButtonLabel>
			<Icon name="chevron" size={14} />
		</Button>
	);

	return shell(
		<>
			<Chart points={read.summary.points} span={{ floor: read.summary.floor, ceiling: read.summary.ceiling }} view={read.shownAs} hovered={hovered} onHover={setHovered} />

			{point ? (
				<div className="mt-tip" style={{ insetInlineStart: `calc(${CHART_INSET}% + ${tipShare(hovered, read.summary.points.length) * (100 - CHART_INSET)}%)`, top: "22%" }}>
					<div className="mt-tip-value">{read.unit ? `${formatCompact(point.value)} ${read.unit}` : formatCompact(point.value)}</div>
					<div className="mt-tip-day">{readableDay(point.day)}</div>
				</div>
			) : null}

			<div className="mt-content">
				<div className="mt-head">
					<div className="mt-head-side">
						<span className="mt-title">{read.heading}</span>
						<span className="mt-seg">
							<Segmented size="s" items={VIEWS} value={read.shownAs} onChange={(next: string) => void props.view.update(next)} />
						</span>
					</div>
					<div className="mt-head-side">
						<span className="mt-trend">
							<Icon name="arrow-up" size={15} className="mt-arrow" />
							{read.summary.percent === null ? "new" : formatPercent(read.summary.percent)}
						</span>
						<Popover trigger={periodTrigger} isOpen={isPicking} onOpenChange={setPicking}>
							{read.periodRows.map((row) => (
								<PopoverItem key={row.ref} checked={row.label === read.picked} onClick={() => void props.periodPick.update(row.ref)}>
									{row.label}
								</PopoverItem>
							))}
						</Popover>
					</div>
				</div>

				<div className="mt-total">{formatCompact(read.summary.total)}</div>

				<div className="mt-plates">
					{platesOf(read.summary).map((plate) => (
						<div className={`mt-plate${plate.isTone ? " is-tone" : ""}${plate.isWide ? " is-wide" : ""}`} key={plate.label}>
							<span className="mt-plate-value">{plate.value}</span>
							<span className="mt-plate-label">{plate.label}</span>
						</div>
					))}
				</div>

				<div className="mt-foot">
					{canDo(props.records.create) ? (
						<Button size="s" variant="accent" onClick={() => setAdding(true)}>
							<Icon name="plus" size={15} />
							<ButtonLabel className="mt-add-label">Add record</ButtonLabel>
						</Button>
					) : null}
					<IconButton size="s" label="All records" onClick={() => setListing(true)}>
						<Icon name="menu" size={15} />
					</IconButton>
				</div>
			</div>

			<AddDialog isOpen={isAdding} onOpenChange={setAdding} form={form} onSave={() => void save()} />
			<RecordsDialog isOpen={isListing} onOpenChange={setListing} rows={read.rows} summary={read.summary} onRemove={canDo(props.records.remove) ? (ref) => void props.records.remove(ref) : null} />
		</>,
	);
}, {
	props: {
		records: {
			label: "Records",
			default: { path: "Metrics" },
		},
		title: {
			type: "text",
			label: "Title",
			default: { value: "Total" },
		},
		unit: {
			type: "text",
			label: "Unit",
			hint: "What one record counts. It is written after the number in the chart's tooltip.",
			default: { value: "" },
		},
		rising: {
			type: "text",
			label: "good · bad · neither",
			hint: "Whether a rising number is a good thing. Spending that climbs is not green.",
			default: { value: "good" },
		},
		periods: {
			label: "Periods",
			item: {
				fields: [
					{ key: "label", label: "Name", type: "text" },
					{ key: "days", label: "Days", type: "number" },
				],
			},
			default: {
				value: [
					{ id: "p30", label: "Past 30 days", days: 30 },
					{ id: "p14", label: "Past 14 days", days: 14 },
					{ id: "p7", label: "Past 7 days", days: 7 },
				],
			},
		},
		periodPick: {
			label: "Which period",
			of: "periods",
			field: "label",
			fallback: "first",
		},
		period: {
			label: "Period",
			picks: "periodPick",
			of: "periods",
		},
		view: {
			type: "text",
			label: "curve · bars",
			default: { value: "curve" },
		},
	},
});

function Chart({ points, span, view, hovered, onHover }: { points: MetricPoint[]; span: MetricSpan; view: string; hovered: number; onHover: (at: number) => void }) {

	const follow = (event: { currentTarget: Element; clientX: number }) => {
		const room = event.currentTarget.getBoundingClientRect();
		if (!room.width) return;
		const share = (event.clientX - room.left) / room.width;
		onHover(Math.min(points.length - 1, Math.max(0, Math.round(share * (points.length - 1)))));
	};

	return (
		<div className="mt-chart">
			<svg viewBox={`0 0 ${CHART_BOX.width} ${CHART_BOX.height}`} preserveAspectRatio="none" onPointerMove={follow} onPointerLeave={() => onHover(-1)}>
				{chartInk()}
				<rect width={CHART_BOX.width} height={CHART_BOX.height} fill="url(#mt-wash)" />
				<g mask="url(#mt-dot-fade)">
					<rect width={CHART_BOX.width} height={CHART_BOX.height} fill="url(#mt-dots)" />
				</g>
				<g mask="url(#mt-ink-fade)">{view === "bars" || points.length < 2 ? drawnBars(points, span, hovered) : drawnCurve(points, span)}</g>
			</svg>
		</div>
	);
}

function AddDialog({ isOpen, onOpenChange, form, onSave }: { isOpen: boolean; onOpenChange: (next: boolean) => void; form: Form; onSave: () => void }) {
	const { draft } = form;

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="wg-metric" width="34rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>Add a record</DialogTitle>
					<DialogDescription>One note lands in the bound folder, named after the day it belongs to.</DialogDescription>
				</DialogHeader>
				<div className="mt-form">
					<Calendar selected={dateOf(draft.date)} today={dateOf(form.today)} onSelect={(when: Date) => form.onDraft({ ...draft, date: isoOf(when) })} />
					<div className="mt-form-side">
						<span className="mt-form-label">Amount</span>
						<Field value={draft.amount} placeholder={form.unit || "How much"} onInput={(next: string) => form.onDraft({ ...draft, amount: next })} />
						<span className="mt-form-label">Note</span>
						<Field value={draft.note} placeholder="Optional" onInput={(next: string) => form.onDraft({ ...draft, note: next })} />
						{form.failure ? <span className="mt-left-out">{form.failure}</span> : null}
					</div>
				</div>
				<DialogFooter>
					<Button size="s" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button size="s" variant="accent" onClick={onSave}>
						Add record
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function RecordsDialog({ isOpen, onOpenChange, rows, summary, onRemove }: { isOpen: boolean; onOpenChange: (next: boolean) => void; rows: (MetricRecord & { ref: string })[]; summary: MetricSummary; onRemove: ((ref: string) => void) | null }) {
	const newestFirst = [...rows].sort((one, other) => String(dayOfRecord(other) ?? "").localeCompare(String(dayOfRecord(one) ?? "")));
	const leftOut = leftOutLine(summary);

	return (
		<Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="wg-metric" width="34rem">
				<DialogClose />
				<DialogHeader>
					<DialogTitle>All records</DialogTitle>
					<DialogDescription>Newest first. Removing one redraws the card behind this window.</DialogDescription>
				</DialogHeader>
				<div className="mt-rows">
					{newestFirst.map((row) => (
						<div className="mt-row" key={row.ref}>
							<span className="mt-row-day">{dayOfRecord(row) ?? "no date"}</span>
							<span className="mt-row-note">{row.note || row.name}</span>
							<span className="mt-row-amount">{amountOf(row) === null ? "—" : formatSigned(Number(amountOf(row)))}</span>
							{onRemove ? (
								<IconButton size="s" label="Delete" onClick={() => onRemove(row.ref)}>
									<Icon name="archive" size={15} />
								</IconButton>
							) : null}
						</div>
					))}
				</div>
				{leftOut ? <span className="mt-left-out">{leftOut}</span> : null}
			</DialogContent>
		</Dialog>
	);
}

function chartInk() {
	return (
		<defs>
			<pattern id="mt-dots" width="14" height="14" patternUnits="userSpaceOnUse">
				<circle className="mt-dot" cx="1" cy="1" r="1" />
			</pattern>
			<linearGradient id="mt-wash" x1="1" y1="0" x2="0" y2="0">
				<stop offset="0" stopColor="var(--wg-metric-tone)" stopOpacity="0.13" />
				<stop offset="0.82" stopColor="var(--wg-metric-tone)" stopOpacity="0" />
			</linearGradient>
			<linearGradient id="mt-dot-ramp" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor="#ffffff" stopOpacity="0" />
				<stop offset="0.55" stopColor="#ffffff" stopOpacity="1" />
			</linearGradient>
			<mask id="mt-dot-fade">
				<rect width={CHART_BOX.width} height={CHART_BOX.height} fill="url(#mt-dot-ramp)" />
			</mask>
			<linearGradient id="mt-ink-ramp" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor="#ffffff" stopOpacity="0" />
				<stop offset="0.22" stopColor="#ffffff" stopOpacity="0.3" />
				<stop offset="0.52" stopColor="#ffffff" stopOpacity="1" />
			</linearGradient>
			<mask id="mt-ink-fade">
				<rect width={CHART_BOX.width} height={CHART_BOX.height} fill="url(#mt-ink-ramp)" />
			</mask>
			<linearGradient id="mt-under" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="var(--wg-metric-tone)" stopOpacity="0.24" />
				<stop offset="1" stopColor="var(--wg-metric-tone)" stopOpacity="0.015" />
			</linearGradient>
			<linearGradient id="mt-bar-soft" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="var(--wg-metric-tone)" stopOpacity="0.46" />
				<stop offset="1" stopColor="var(--wg-metric-tone)" stopOpacity="0.1" />
			</linearGradient>
			<linearGradient id="mt-bar-strong" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="var(--wg-metric-tone)" stopOpacity="1" />
				<stop offset="1" stopColor="var(--wg-metric-tone)" stopOpacity="0.4" />
			</linearGradient>
		</defs>
	);
}

function useReading(props: MetricProps, today: string) {
	const listed = useData(props.records.list);
	const chosen = useData(props.period.get).data ?? {};
	const days = Math.max(1, Number(chosen.days) || DEFAULT_DAYS);
	const rows = flatRows(listed.rows);
	const asked = String(useData(props.view.get).data ?? "curve");

	return {
		listed,
		rows,
		days,
		periodRows: flatRows(useData(props.periods.list).rows),
		picked: pickedValue(useData(props.periodPick.get).data),
		shownAs: asked === "bars" ? "bars" : "curve",
		heading: String(useData(props.title.get).data ?? "Total"),
		unit: String(useData(props.unit.get).data ?? ""),
		summary: summarize(rows, days, today, String(useData(props.rising.get).data ?? "good")),
	};
}

function saidInstead(read: ReturnType<typeof useReading>) {
	if (read.listed.failure) return NOTHING_READ;
	if (read.listed.isLoading) return "";
	if (read.rows.length === 0) return NOTHING_BOUND;
	return read.summary.unreadable === read.rows.length ? NOTHING_NUMERIC : "";
}

function drawnBars(points: MetricPoint[], span: MetricSpan, hovered: number) {
	return barsOf(points, span, CHART_BOX).map((bar, at) => (
		<rect key={bar.day} x={bar.x} y={bar.y} width={bar.width} height={bar.height} rx={bar.rx} fill={at === hovered ? "url(#mt-bar-strong)" : "url(#mt-bar-soft)"} />
	));
}

function drawnCurve(points: MetricPoint[], span: MetricSpan) {
	const spots = spotsOf(points, span, CHART_BOX);
	return (
		<>
			<path d={areaUnder(spots, baselineOf(span, CHART_BOX))} fill="url(#mt-under)" />
			<path d={pathThrough(spots)} fill="none" stroke="var(--wg-metric-tone)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
		</>
	);
}

const CHART_BOX: ChartBox = { width: 560, height: 440, headRoom: 44, barShare: 0.66, bleed: 24 };
const CHART_INSET = 26;
const DEFAULT_DAYS = 30;

const TONE_TURNS = { up: "0deg", down: "180deg", flat: "90deg" };
const VIEWS = [
	{ value: "curve", label: <Icon name="curve" size={15} /> },
	{ value: "bars", label: <Icon name="bars" size={15} /> },
];

const NOTHING_BOUND = "Point this widget at a folder of records in its settings, then add the first one.";
const NOTHING_READ = "That folder could not be read.";
const NOTHING_NUMERIC = "Nothing in that folder carries a number this widget can read as an amount.";

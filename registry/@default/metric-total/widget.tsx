import {
	ICrudGateway,
	IHost,
	IListGateway,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
	type Row,
} from "widgetarium";
import { dayOfRecord } from "@default/lib";
import { useId, useRef, useState } from "react";
import { AddDialog } from "./add-dialog";
import { Chart } from "./chart";
import { dateOf, isoFrom } from "./days";
import { Foot } from "./foot";
import { Head } from "./head";
import { ListDialog } from "./list-dialog";
import { compactOf } from "./numbers";
import { Plates } from "./plates";
import { Tip } from "./tip";
import type { Allowed, Hovered, Listed, MetricProps, Point, Summary, Tone } from "./types";
import { useBand } from "./use-band";
import { useEntryDialog } from "./use-entry-dialog";
import { writtenOrNotified } from "./written";

const ALL_RECORDS = 5000;

const MetricSchema = VaultRecordSchema.extend({
	amount: z
		.number()
		.nullable()
		.exactOptional()
		.meta({ aka: ["value", "count", "total", "kept", "score", "done"] }),
	date: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["created", "day", "when", "on"] }),
	note: z
		.string()
		.nullable()
		.exactOptional()
		.meta({ aka: ["text", "comment", "description", "body"] }),
});

type MetricRecord = z.infer<typeof MetricSchema>;

const PeriodRowSchema = z.object({
	label: z.string().nullable().exactOptional(),
	days: z.number().nullable().exactOptional(),
});

const FLAT_UNDER = 0.5;

const DEFAULT_DAYS = 30;

const AT_THE_ROOT = "Vault";

const CANNOT_DELETE = "The record was not deleted, so it is still in the list.";
const CANNOT_KEEP_VIEW = "This card cannot remember which chart you picked, so it kept the one it was drawing.";
const CANNOT_KEEP_PERIOD = "This card cannot remember the period you picked, so it kept the one it was reading over.";

function shiftedBy(iso: string, days: number): string {
	const at = dateOf(iso);
	return isoFrom(new Date(at.getFullYear(), at.getMonth(), at.getDate() + days));
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

export const MetricTotal = createWidget({
	inject: {
		records: ICrudGateway.of(MetricSchema),
		title: IValueGateway.of(z.string().default("Total")).pick("get"),
		unit: IValueGateway.of(z.string().default("")).pick("get"),
		rising: IValueGateway.of(z.string().default("good")).pick("get"),
		periods: IListGateway.of(PeriodRowSchema, {
			default: [
				{ label: "Past 7 days", days: 7 },
				{ label: "Past 30 days", days: 30 },
				{ label: "Past 90 days", days: 90 },
			],
		}),
		periodPick: IValueGateway.of(z.unknown()).pick("get", "update"),
		period: IValueGateway.of(PeriodRowSchema.nullable()).pick("get"),
		view: IValueGateway.of(z.string().default("curve")).pick("get", "update"),
		host: IHost,
	},
	draw: ({ records, title, unit, rising, periods, periodPick, period, view, host }) => {
		const surfaceRef = useRef<HTMLDivElement | null>(null);
		const band = useBand(surfaceRef);
		const ids = useId().replace(/:/g, "");

		const kept = useData(records.list, { limit: ALL_RECORDS }).data;
		const periodRows = useData(periods.list, { limit: ALL_RECORDS }).data;
		const picked = String(pickedValue(periodPick.value) ?? "");

		const today = isoFrom(new Date());
		const days = Math.max(1, Number(period?.days ?? DEFAULT_DAYS));
		const label = String(period?.label ?? picked);
		const summary = summarize(kept, days, today, rising);

		const allowed = allowedOn(records);
		const [hovered, setHovered] = useState<Hovered | null>(null);
		const { asked, setAsked, draft, setDraft, openAdd, editRow, confirmDraft } = useEntryDialog(today, records, host);
		const wrote = (write: Promise<unknown>, said: string) => writtenOrNotified(host, write, said);

		const point = hovered ? summary.balance[hovered.at] : undefined;

		return (
			<div data-part="root" className="mt3-root wg-metric" data-tone={summary.tone}>
				<div data-part="surface" className="mt3-surface" ref={surfaceRef}>
					<Chart
						points={summary.balance}
						days={days}
						from={shiftedBy(today, 1 - days)}
						view={view.value}
						band={band}
						ids={ids}
						hovered={hovered}
						onHover={setHovered}
					/>
					{point && hovered ? <Tip point={point} unit={unit} left={hovered.left} /> : null}
					<div data-part="content" className="mt3-content">
						<Head
							title={title}
							summary={summary}
							label={label}
							days={days}
							view={view.value}
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
						unit={unit}
						today={today}
						onDraft={setDraft}
						onClose={() => setAsked(null)}
						onConfirm={confirmDraft}
					/>
				) : null}
				{asked === "list" ? (
					<ListDialog
						listed={listedOf(kept, today)}
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
	},
});

function allowedOn(records: MetricProps["records"]): Allowed {
	return {
		canAdd: canDo(records.create),
		canEdit: canDo(records.update),
		canDelete: canDo(records.remove),
	};
}

function listedOf(kept: readonly Row<MetricRecord>[], today: string): Listed[] {
	return kept
		.filter((record) => dayOfRecord(record))
		.map((record) => ({
			ref: record.ref,
			day: dayOfRecord(record) ?? today,
			note: String(record.note ?? ""),
			amount: amountOf(record),
		}))
		.sort((here, there) => (here.day < there.day ? 1 : -1));
}

export const metadata = defineMetadata(MetricTotal, {
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
		records: {
			label: "Records",
			hint: "One note per reading. Each carries a date and an amount.",
			describes: {
				amount: { type: "number" },
				date: { type: "date" },
				note: { type: "text" },
			},
		},
		title: {
			label: "What the number is",
		},
		unit: {
			label: "Unit the amounts are in",
		},
		rising: {
			label: "good · bad",
			hint: "Whether a rise reads as good or as bad.",
		},
		periods: {
			label: "Periods",
			hint: "Every window the card can read over.",
			describes: {
				label: { label: "Label", type: "text", required: true },
				days: { label: "Days", type: "number", required: true },
			},
		},
		periodPick: {
			label: "Picked period",
			source: {
				implementation: "@core/selection",
				fields: { rows: "periods", field: "label", whenNothingPicked: "first" },
			},
		},
		period: {
			label: "The period",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "periods", picked: "periodPick", field: "label", whenNothingPicked: "first" },
			},
		},
		view: {
			label: "curve · bars",
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: 420, preferredHeight: "auto", at: [{ belowPx: 520, preferredWidth: "full" }] },
});

export default MetricTotal;

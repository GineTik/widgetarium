import {
	ICommand,
	IHost,
	IQuery,
	RecordRefSchema,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
	type CommandAnswer,
} from "widgetarium";
import { useId, useRef } from "react";
import { allowedOf } from "./allowed-of";
import { isoFrom } from "./days";
import { EntryDialogs } from "./entry-dialogs";
import { Foot } from "./foot";
import { Head } from "./head";
import { HoverChart } from "./hover-chart";
import { compactOf } from "./numbers";
import { Plates } from "./plates";
import { shiftBy, summarize } from "./summary";
import { useBand } from "./use-band";
import { useEntryDialog } from "./use-entry-dialog";
import { writeOrNotify } from "./write-or-notify";

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

export type MetricRecord = z.infer<typeof MetricSchema>;

const PeriodRowSchema = z.object({
	label: z.string().nullable().exactOptional(),
	days: z.number().nullable().exactOptional(),
});

const DEFAULT_DAYS = 30;

const CANNOT_DELETE = "The record was not deleted, so it is still in the list.";
const CANNOT_KEEP_VIEW = "This card cannot remember which chart you picked, so it kept the one it was drawing.";
const CANNOT_KEEP_PERIOD = "This card cannot remember the period you picked, so it kept the one it was reading over.";

export const MetricTotal = createWidget({
	inject: {
		getRecords: IQuery.expects(z.array(MetricSchema)),
		createRecord: ICommand.sends(MetricSchema.extend({ id: z.uuid() })),
		updateRecord: ICommand.sends(MetricSchema.partial().extend({ ref: RecordRefSchema })),
		removeRecord: ICommand.sends(z.object({ ref: RecordRefSchema })),
		getTitle: IQuery.expects(z.string().default("Total")),
		getUnit: IQuery.expects(z.string().default("")),
		getRising: IQuery.expects(z.enum(["good", "bad"]).default("good")),
		getPeriods: IQuery.expects(
			z.array(PeriodRowSchema).default([
				{ label: "Past 7 days", days: 7 },
				{ label: "Past 30 days", days: 30 },
				{ label: "Past 90 days", days: 90 },
			]),
		),
		getPeriodPick: IQuery.expects(z.unknown()),
		selectPeriod: ICommand.sends(z.unknown()),
		getPeriod: IQuery.expects(PeriodRowSchema.nullable()),
		getView: IQuery.expects(z.enum(["curve", "bars"]).default("curve")),
		setView: ICommand.sends(z.enum(["curve", "bars"])),
		host: IHost,
	},
	draw: ({
		getRecords,
		createRecord,
		updateRecord,
		removeRecord,
		getTitle: title,
		getUnit: unit,
		getRising: rising,
		getPeriods,
		getPeriodPick: periodPick,
		selectPeriod,
		getPeriod: period,
		getView: view,
		setView,
		host,
	}) => {
		const surfaceRef = useRef<HTMLDivElement | null>(null);
		const band = useBand(surfaceRef);
		const ids = useId().replace(/:/g, "");

		const kept = useData(getRecords, { limit: ALL_RECORDS }).data;
		const periodRows = useData(getPeriods, { limit: ALL_RECORDS }).data;
		const picked = String(pickedValue(periodPick) ?? "");

		const today = isoFrom(new Date());
		const days = Math.max(1, Number(period?.days ?? DEFAULT_DAYS));
		const label = String(period?.label ?? picked);
		const summary = summarize(kept, days, today, rising);

		const allowed = allowedOf({ createRecord, updateRecord, removeRecord });
		const entry = useEntryDialog(today, { createRecord, updateRecord }, host);
		const wrote = (write: Promise<CommandAnswer>, said: string) => writeOrNotify(host, write, said);

		return (
			<div data-part="root" className="mt3-root wg-metric" data-tone={summary.tone}>
				<div data-part="surface" className="mt3-surface" ref={surfaceRef}>
					<HoverChart
						points={summary.balance}
						days={days}
						from={shiftBy(today, 1 - days)}
						view={view}
						band={band}
						ids={ids}
						unit={unit}
					/>
					<div data-part="content" className="mt3-content">
						<Head
							title={title}
							summary={summary}
							label={label}
							days={days}
							view={view}
							rows={periodRows.map((row) => ({ ref: row.ref, label: String(row.label ?? "") }))}
							onView={(next) => void wrote(setView(next), CANNOT_KEEP_VIEW)}
							onPeriod={(next) => void wrote(selectPeriod(next), CANNOT_KEEP_PERIOD)}
						/>
						<div data-part="total" className="mt3-headline">
							{compactOf(summary.total)}
						</div>
						<Plates summary={summary} />
						<Foot band={band} canAdd={allowed.canAdd} onAdd={entry.openAdd} onList={() => entry.setAsked("list")} />
					</div>
				</div>
				<EntryDialogs
					entry={entry}
					unit={unit}
					today={today}
					kept={kept}
					undated={summary.undated}
					allowed={allowed}
					onDelete={(ref) => void wrote(removeRecord({ ref }), CANNOT_DELETE)}
				/>
			</div>
		);
	},
});

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
			getTitle: { value: "Revenue" },
			getUnit: { value: "$" },
			getRecords: {
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
		getRecords: {
			aka: ["records"],
			label: "Records",
			hint: "One note per reading. Each carries a date and an amount.",
			describes: {
				amount: { type: "number" },
				date: { type: "date" },
				note: { type: "text" },
			},
		},
		createRecord: {
			label: "Add a record",
			source: { implementation: "@core/rows-create", fields: { target: "getRecords" } },
		},
		updateRecord: {
			label: "Change a record",
			source: { implementation: "@core/rows-update", fields: { target: "getRecords" } },
		},
		removeRecord: {
			label: "Delete a record",
			source: { implementation: "@core/rows-remove", fields: { target: "getRecords" } },
		},
		getTitle: {
			aka: ["title"],
			label: "What the number is",
		},
		getUnit: {
			aka: ["unit"],
			label: "Unit the amounts are in",
		},
		getRising: {
			aka: ["rising"],
			label: "A rise reads as",
			options: [
				{ value: "good", label: "Good" },
				{ value: "bad", label: "Bad" },
			],
		},
		getPeriods: {
			aka: ["periods"],
			label: "Periods",
			hint: "Every window the card can read over.",
			describes: {
				label: { label: "Label", type: "text", required: true },
				days: { label: "Days", type: "number", required: true },
			},
		},
		getPeriodPick: {
			aka: ["periodPick"],
			label: "Picked period",
			source: {
				implementation: "@core/selection",
				fields: { rows: "getPeriods", field: "label", whenNothingPicked: "first" },
			},
		},
		selectPeriod: {
			label: "Pick a period",
			source: { implementation: "@core/value-set", fields: { target: "getPeriodPick" } },
		},
		getPeriod: {
			aka: ["period"],
			label: "The period",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "getPeriods", picked: "getPeriodPick", field: "label", whenNothingPicked: "first" },
			},
		},
		getView: {
			aka: ["view"],
			label: "Drawn as",
			options: [
				{ value: "curve", label: "A curve" },
				{ value: "bars", label: "Bars" },
			],
		},
		setView: {
			label: "Switch the chart",
			source: { implementation: "@core/value-set", fields: { target: "getView" } },
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: 420, preferredHeight: "auto", at: [{ belowPx: 520, preferredWidth: "full" }] },
});

export default MetricTotal;

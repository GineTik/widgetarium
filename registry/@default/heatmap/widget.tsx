import {
	INavigator,
	IQuery,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
} from "widgetarium";
import { readLog } from "@default/lib";
import { CELL } from "./grid-geometry";
import { YearGrid } from "./year-grid";

const ALL_DAYS = 2000;

const STYLE = `
.habit-heatmap {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.hh-months {
	flex: none;
	position: relative;
	height: 1.4em;
	font-size: var(--font-ui-smaller, 12px);
	line-height: 1.4em;
	color: var(--text-faint);
}

.hh-month {
	position: absolute;
	top: 0;
	overflow: hidden;
	white-space: nowrap;
}

.hh-grid {
	flex: none;
	display: block;
	width: 100%;
	height: auto;
}

.hh-cell {
	fill: var(--wg-kit-fill-hover);
}

.hh-cell.is-done {
	fill: var(--wg-kit-accent);
	cursor: pointer;
}

.hh-cell.is-today {
	stroke: var(--text-muted);
	stroke-width: 1px;
	vector-effect: non-scaling-stroke;
}

.hh-empty {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}
`;

const DayNoteSchema = VaultRecordSchema.extend({
	path: z.string(),
	name: z.string(),
	days: z
		.array(z.string())
		.nullable()
		.optional()
		.meta({ aka: ["entries", "dates", "log", "checkins"] }),
	done: z
		.number()
		.nullable()
		.optional()
		.meta({ aka: ["kept", "value", "count", "steps", "amount", "score"] }),
});

const SQUARE_CORNER = 2.5;

const HeatmapWidget = createWidget({
	inject: {
		log: IQuery.of(z.array(DayNoteSchema)),
		pick: IQuery.of(z.unknown()),
		year: IQuery.of(z.number().default(0)),
		isRound: IQuery.of(z.boolean().default(false)),
		isWeekStartingMonday: IQuery.of(z.boolean().default(true)),
		navigator: INavigator,
	},
	draw: ({ pick, year, isRound, isWeekStartingMonday, log, navigator }) => {
		const rows = useData(log, { limit: ALL_DAYS }).data;

		if (rows.length === 0) {
			return (
				<div className="habit-heatmap">
					<style>{STYLE}</style>
					<p className="hh-empty">Point this widget at a folder of habit notes, or a folder of daily notes.</p>
				</div>
			);
		}

		return (
			<div className="habit-heatmap">
				<style>{STYLE}</style>
				<YearGrid
					log={readLog(rows, { pick: pickedValue(pick) })}
					year={year > 0 ? year : new Date().getFullYear()}
					cornerRadius={isRound ? CELL / 2 : SQUARE_CORNER}
					isMondayFirst={isWeekStartingMonday !== false}
					navigator={navigator}
				/>
			</div>
		);
	},
});

export const metadata = defineMetadata(HeatmapWidget, {
	title: "Heatmap",
	description: "A year of squares: every day you kept a habit, in one glance.",
	keywords: [
		"heatmap",
		"habit",
		"streak",
		"year",
		"calendar",
		"grid",
		"tracker",
		"daily",
		"consistency",
		"squares",
		"github",
		"log",
	],
	preview: {
		size: { w: 7, h: 3 },
		props: {
			log: {
				rows: [
					{
						path: "preview/exercise.md",
						title: "Exercise",
						props: {
							title: "Exercise",
							entries: [
								"2026-01-01",
								"2026-01-05",
								"2026-01-07",
								"2026-01-12",
								"2026-01-16",
								"2026-01-20",
								"2026-01-21",
								"2026-01-22",
								"2026-01-29",
								"2026-02-01",
								"2026-02-10",
								"2026-02-12",
								"2026-02-15",
								"2026-02-17",
								"2026-02-18",
								"2026-02-24",
								"2026-02-25",
								"2026-02-26",
								"2026-03-01",
								"2026-03-02",
								"2026-03-05",
								"2026-03-09",
								"2026-03-14",
								"2026-03-18",
								"2026-03-20",
								"2026-03-21",
								"2026-03-23",
								"2026-03-25",
								"2026-03-26",
								"2026-04-07",
								"2026-04-08",
								"2026-04-16",
								"2026-04-17",
								"2026-04-18",
								"2026-04-19",
								"2026-04-22",
								"2026-04-27",
								"2026-05-01",
								"2026-05-07",
								"2026-05-08",
								"2026-05-12",
								"2026-05-16",
								"2026-05-18",
								"2026-05-22",
								"2026-05-23",
								"2026-05-24",
								"2026-05-25",
								"2026-05-27",
								"2026-05-28",
								"2026-05-29",
								"2026-06-05",
								"2026-06-09",
								"2026-06-19",
								"2026-06-23",
								"2026-06-25",
								"2026-06-29",
								"2026-07-07",
								"2026-07-13",
								"2026-07-18",
								"2026-07-19",
								"2026-07-22",
								"2026-07-23",
								"2026-07-25",
								"2026-07-31",
								"2026-08-04",
								"2026-08-07",
								"2026-08-16",
								"2026-08-17",
								"2026-08-18",
								"2026-08-22",
								"2026-08-23",
								"2026-08-26",
							],
						},
					},
					{
						path: "preview/reading.md",
						title: "Reading",
						props: {
							title: "Reading",
							entries: [
								"2026-02-10",
								"2026-02-12",
								"2026-02-13",
								"2026-02-15",
								"2026-02-16",
								"2026-02-18",
								"2026-02-23",
								"2026-02-25",
								"2026-03-02",
								"2026-03-04",
								"2026-03-05",
								"2026-03-06",
								"2026-03-07",
								"2026-03-10",
								"2026-03-12",
								"2026-03-13",
								"2026-03-15",
								"2026-03-23",
								"2026-03-24",
								"2026-03-26",
								"2026-03-29",
								"2026-04-04",
								"2026-04-10",
								"2026-04-11",
								"2026-04-22",
								"2026-04-26",
								"2026-04-29",
								"2026-04-30",
								"2026-05-05",
								"2026-05-07",
								"2026-05-10",
								"2026-05-12",
								"2026-05-17",
								"2026-05-18",
								"2026-05-22",
								"2026-05-30",
								"2026-06-01",
								"2026-06-04",
								"2026-06-05",
								"2026-06-06",
								"2026-06-11",
								"2026-06-14",
								"2026-06-18",
								"2026-06-20",
								"2026-06-23",
								"2026-06-25",
								"2026-06-29",
								"2026-07-01",
								"2026-07-05",
								"2026-07-07",
								"2026-07-09",
								"2026-07-12",
								"2026-07-13",
								"2026-07-15",
								"2026-07-20",
								"2026-07-21",
								"2026-08-02",
								"2026-08-03",
								"2026-08-12",
								"2026-08-15",
								"2026-08-22",
							],
						},
					},
				],
			},
		},
		shot: { of: "181870122" },
	},
	props: {
		log: {
			label: "Log",
			describes: {
				days: { type: "date", many: true },
				done: { type: "number" },
			},
		},
		pick: {
			label: "Which habit",
			hint: "One habit only. Nothing picked draws all of them.",
			source: { implementation: "@core/selection", fields: { rows: "log", field: "name" } },
		},
		year: { label: "Year, or 0 for this one" },
		isRound: { label: "Round cells instead of square", design: true },
		isWeekStartingMonday: { label: "Weeks start on Monday" },
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 320 },
});

export default HeatmapWidget;

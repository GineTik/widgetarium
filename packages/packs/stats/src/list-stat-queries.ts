import { z } from "zod";
import type { Query, RowsResult } from "@widgetarium/core/gateway/contract.js";
import { rowOf } from "@widgetarium/core/gateway/create.js";
import { IQuery } from "@widgetarium/core/gateway/queries.js";
import {
	DEFAULT_DATE_FIELD,
	STAT_ALGORITHMS,
	STAT_COMPARISONS,
	STAT_WINDOWS,
	statOf,
	todayIso,
} from "@widgetarium/core/gateway/stats.js";
import type { StatQuery } from "@widgetarium/core/gateway/stats.js";
import { PropRefSchema } from "@widgetarium/core/engine/prop-ref.js";
import type { ImplementationPorts } from "@widgetarium/core/engine/packs.js";
import { breakdownOf, seriesOf } from "./aggregate.js";
import type { Point, Share } from "./aggregate.js";
import { rowsAt, watchRows } from "./rows-read.js";

const MeasureSchema = z.enum(["count", "sum", "average"]);

export const NumberFieldsSchema = z.object({
	rows: PropRefSchema.meta({ pick: "collection" }).optional(),
	algorithm: z.enum(STAT_ALGORITHMS).optional(),
	field: z.string().optional(),
	date: z.string().optional(),
	window: z.enum(STAT_WINDOWS).optional(),
	compare: z.enum(STAT_COMPARISONS).optional(),
});

export const SeriesFieldsSchema = z.object({
	rows: PropRefSchema.meta({ pick: "collection" }).optional(),
	date: z.string().optional(),
	bucket: z.enum(["day", "week", "month"]).optional(),
	measure: MeasureSchema.optional(),
	field: z.string().optional(),
});

export const BreakdownFieldsSchema = z.object({
	rows: PropRefSchema.meta({ pick: "collection" }).optional(),
	groupBy: z.string().optional(),
	measure: MeasureSchema.optional(),
	field: z.string().optional(),
	top: z.number().optional(),
});

export const StreakFieldsSchema = z.object({
	rows: PropRefSchema.meta({ pick: "collection" }).optional(),
	date: z.string().optional(),
});

export const PointSchema = z.object({ date: z.string(), value: z.number() });
export const ShareSchema = z.object({ label: z.string(), value: z.number(), share: z.number() });
export const StreakSchema = z.object({ current: z.number(), best: z.number() });

type NumberFields = z.infer<typeof NumberFieldsSchema>;
type SeriesFields = z.infer<typeof SeriesFieldsSchema>;
type BreakdownFields = z.infer<typeof BreakdownFieldsSchema>;
type StreakFields = z.infer<typeof StreakFieldsSchema>;
type Streak = z.infer<typeof StreakSchema>;

const PAGE_UNASKED = 100;

export class NumberQuery extends IQuery.returns(z.number().nullable()) {
	constructor(
		readonly fields: NumberFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return watchRows(this.ports, this.fields.rows, changed);
	}

	async get(): Promise<number | null> {
		const { rows, algorithm, field, date, window, compare } = this.fields;
		const query: StatQuery = {
			...(algorithm ? { algorithm } : {}),
			...(field ? { field } : {}),
			...(date ? { date } : {}),
			...(window ? { window } : {}),
			...(compare ? { compare } : {}),
		};
		return statOf(await rowsAt(this.ports, rows), query, todayIso());
	}
}

export class SeriesQuery extends IQuery.returns(z.array(PointSchema)) {
	constructor(
		readonly fields: SeriesFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return watchRows(this.ports, this.fields.rows, changed);
	}

	async list(query?: Query): Promise<RowsResult<Point>> {
		const { date, bucket, measure, field } = this.fields;
		const rows = await rowsAt(this.ports, this.fields.rows);
		const points = seriesOf(rows, date || DEFAULT_DATE_FIELD, bucket ?? "day", measure ?? "count", field ?? "");
		return pageOf(
			points.map((point) => rowOf<Point>(point, point.date)),
			query,
		);
	}
}

export class BreakdownQuery extends IQuery.returns(z.array(ShareSchema)) {
	constructor(
		readonly fields: BreakdownFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return watchRows(this.ports, this.fields.rows, changed);
	}

	async list(query?: Query): Promise<RowsResult<Share>> {
		const { groupBy, measure, field, top } = this.fields;
		const rows = await rowsAt(this.ports, this.fields.rows);
		const shares = breakdownOf(rows, groupBy ?? "", measure ?? "count", field ?? "", top ?? 0);
		return pageOf(
			shares.map((share) => rowOf<Share>(share, share.label)),
			query,
		);
	}
}

export class StreakQuery extends IQuery.returns(StreakSchema) {
	constructor(
		readonly fields: StreakFields,
		readonly ports: ImplementationPorts,
	) {
		super();
	}

	override subscribe(changed: () => void): () => void {
		return watchRows(this.ports, this.fields.rows, changed);
	}

	async get(): Promise<Streak> {
		const rows = await rowsAt(this.ports, this.fields.rows);
		const date = this.fields.date || DEFAULT_DATE_FIELD;
		const today = todayIso();
		return {
			current: statOf(rows, { algorithm: "streak", date }, today) ?? 0,
			best: statOf(rows, { algorithm: "best-streak", date }, today) ?? 0,
		};
	}
}

function pageOf<T>(rows: ReturnType<typeof rowOf<T>>[], query: Query | undefined): RowsResult<T> {
	const offset = query?.offset ?? 0;
	return { rows: rows.slice(offset, offset + (query?.limit ?? PAGE_UNASKED)), total: rows.length };
}

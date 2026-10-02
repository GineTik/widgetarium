import { isObject } from "@widgetarium/core/engine/is-object.js";

export type Bucket = "day" | "week" | "month";

export type Measure = "count" | "sum" | "average";

export interface Point {
	readonly date: string;
	readonly value: number;
}

export interface Share {
	readonly label: string;
	readonly value: number;
	readonly share: number;
}

const A_DAY = /\d{4}-\d{2}-\d{2}/;
const NOTHING = "(none)";

export function seriesOf(
	rows: readonly unknown[],
	dateField: string,
	bucket: Bucket,
	measure: Measure,
	field: string,
): Point[] {
	const groups = new Map<string, unknown[]>();
	for (const row of rows)
		for (const day of daysIn(fieldOf(row, dateField))) {
			const key = bucketOf(day, bucket);
			groups.set(key, [...(groups.get(key) ?? []), row]);
		}
	return [...groups.entries()]
		.sort(([one], [other]) => one.localeCompare(other))
		.map(([date, held]) => ({ date, value: measureOf(held, measure, field) }));
}

export function breakdownOf(
	rows: readonly unknown[],
	groupBy: string,
	measure: Measure,
	field: string,
	top: number,
): Share[] {
	const groups = new Map<string, unknown[]>();
	for (const row of rows)
		for (const label of labelsIn(fieldOf(row, groupBy))) groups.set(label, [...(groups.get(label) ?? []), row]);
	const measured = [...groups.entries()].map(([label, held]) => ({ label, value: measureOf(held, measure, field) }));
	const whole = measured.reduce((sum, entry) => sum + entry.value, 0);
	return measured
		.sort((one, other) => other.value - one.value || one.label.localeCompare(other.label))
		.slice(0, top > 0 ? top : measured.length)
		.map((entry) => ({ ...entry, share: whole === 0 ? 0 : Math.round((entry.value / whole) * 1000) / 1000 }));
}

function measureOf(rows: readonly unknown[], measure: Measure, field: string): number {
	if (measure === "count") return rows.length;
	const numbers = rows.map((row) => Number(fieldOf(row, field))).filter((held) => Number.isFinite(held));
	const sum = numbers.reduce((total, held) => total + held, 0);
	if (measure === "sum") return sum;
	return numbers.length === 0 ? 0 : Math.round((sum / numbers.length) * 10) / 10;
}

function fieldOf(row: unknown, field: string): unknown {
	if (!isObject(row)) return undefined;
	if (field in row) return row[field];
	const props = row["props"];
	return isObject(props) ? props[field] : undefined;
}

function daysIn(held: unknown): string[] {
	const all = Array.isArray(held) ? held : [held];
	return all.flatMap((day) => A_DAY.exec(String(day ?? ""))?.[0] ?? []);
}

function labelsIn(held: unknown): string[] {
	const all = Array.isArray(held) ? held : [held];
	const labels = all.map((label) => (label === null || label === undefined || label === "" ? NOTHING : String(label)));
	return labels.length === 0 ? [NOTHING] : labels;
}

function bucketOf(day: string, bucket: Bucket): string {
	if (bucket === "month") return `${day.slice(0, 7)}-01`;
	if (bucket === "day") return day;
	const date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
	return date.toISOString().slice(0, 10);
}

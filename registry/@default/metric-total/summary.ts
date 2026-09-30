import { dayOfRecord } from "@default/lib";
import { dateOf, isoFrom } from "./days";
import type { Point, Rising, Summary, Tone } from "./types";

type Amounted = { amount?: number | null | undefined };

const FLAT_UNDER = 0.5;

export function summarize(records: readonly Amounted[], days: number, today: string, rising: Rising): Summary {
	const points = pointsOf(records, shiftBy(today, 1 - days), today);
	const before = pointsOf(records, shiftBy(today, 1 - days * 2), shiftBy(today, -days));
	const total = sumOf(points);
	const was = sumOf(before);
	const percent = was > 0 ? ((total - was) / was) * 100 : null;
	const direction = percent === null ? (total > 0 ? "up" : "flat") : directionOf(percent);
	const values = points.map((point) => point.value);
	return {
		points,
		balance: balanceByDay(records, days, shiftBy(today, 1 - days)),
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

export function shiftBy(iso: string, days: number): string {
	const at = dateOf(iso);
	return isoFrom(new Date(at.getFullYear(), at.getMonth(), at.getDate() + days));
}

export function amountOf(record: Amounted): number {
	const read = Number(record.amount);
	return Number.isFinite(read) ? read : 0;
}

function pointsOf(records: readonly Amounted[], from: string, to: string): Point[] {
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

function balanceByDay(records: readonly Amounted[], days: number, from: string): Point[] {
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
		const day = shiftBy(from, at);
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

function toneOf(direction: Tone, rising: Rising): Tone {
	if (direction === "flat") return "flat";
	return (direction === "up") === (rising === "good") ? "up" : "down";
}

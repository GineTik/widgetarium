import { dayOfRecord } from "@default/lib";
import type { Row } from "widgetarium";
import { amountOf } from "./summary";
import type { Listed } from "./types";
import type { MetricRecord } from "./widget";

export function listedOf(kept: readonly Row<MetricRecord>[], today: string): Listed[] {
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

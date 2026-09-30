import { createContext, useContext } from "react";
import type { Context, ReactNode } from "react";
import { isRecord } from "../utils/is-record";

export interface ChartConfigEntry {
	readonly label?: ReactNode;
	readonly icon?: string;
	readonly color?: number | string;
}

export type ChartConfig = Readonly<Record<string, ChartConfigEntry>>;

export interface ChartItem {
	readonly value?: unknown;
	readonly name?: unknown;
	readonly dataKey?: unknown;
	readonly type?: unknown;
	readonly color?: string | undefined;
	readonly payload?: unknown;
}

export interface HeldChart {
	readonly config: ChartConfig;
}

export const ChartContext: Context<HeldChart | null> = createContext<HeldChart | null>(null);

export function useChart(): HeldChart {
	const chart = useContext(ChartContext);
	if (!chart) throw new Error("a chart part stands outside a ChartContainer");
	return chart;
}

export function firstKey(...candidates: unknown[]): string {
	return String(candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? "value");
}

export function entryOf(config: ChartConfig, item: unknown, key: string): ChartConfigEntry | undefined {
	const named = [fieldOf(item, key), fieldOf(fieldOf(item, "payload"), key)].find(
		(held): held is string => typeof held === "string",
	);
	return configEntry(config, named ?? key) ?? configEntry(config, key);
}

export function fieldOf(held: unknown, key: string): unknown {
	return isRecord(held) ? held[key] : undefined;
}

export function drawableOf(held: unknown): string | number | null {
	return typeof held === "string" || typeof held === "number" ? held : null;
}

function configEntry(config: ChartConfig, key: string): ChartConfigEntry | undefined {
	return Object.hasOwn(config, key) ? config[key] : undefined;
}

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type ChartConfig = Record<string, { label?: ReactNode; icon?: string; color?: number | string }>;

export const ChartContext = createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
	const chart = useContext(ChartContext);
	if (!chart) throw new Error("a chart part stands outside a ChartContainer");
	return chart;
}

export function firstKey(...candidates: unknown[]): string {
	return String(candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? "value");
}

export function entryOf(config: ChartConfig, item, key: string) {
	const named = [item?.[key], item?.payload?.[key]].find((held) => typeof held === "string");
	return config[named ?? key] ?? config[key];
}

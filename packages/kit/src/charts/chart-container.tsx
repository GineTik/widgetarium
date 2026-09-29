import { createElement as h } from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INITIAL_SIZE } from "../constants/charts";
import type { LooseProps } from "../types";
import { chartColorOf, seriesColorName } from "../utils/chart-colors";
import { cn } from "../utils/cn";
import { ChartContext } from "./chart-context";
import type { ChartConfig } from "./chart-context";

export const ChartTooltip = Tooltip;

export const ChartLegend = Legend;

export function ChartContainer({ config = {}, className: cls, style, children, ...props }: LooseProps) {
	return (
		<ChartContext.Provider value={{ config }}>
			<div className={cn("wg-kit-chart", cls)} style={{ ...seriesInks(config), ...style }} {...props}>
				{h(ResponsiveContainer, { initialDimension: CHART_INITIAL_SIZE, children })}
			</div>
		</ChartContext.Provider>
	);
}

function seriesInks(config: ChartConfig) {
	return Object.fromEntries(
		Object.entries(config).map(([key, entry], place) => [seriesColorName(key), chartColorOf(entry?.color, place)]),
	);
}

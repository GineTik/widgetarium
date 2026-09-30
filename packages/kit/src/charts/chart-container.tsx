import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_INITIAL_SIZE } from "../constants/charts";
import { chartColorOf, seriesColorName } from "../utils/chart-colors";
import { cn } from "../utils/cn";
import type { StyleProp, TokenStyle } from "../utils/token-style";
import { ChartContext } from "./chart-context";
import type { ChartConfig } from "./chart-context";

export interface ChartContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly config?: ChartConfig;
	readonly style?: StyleProp | undefined;
}

export const ChartTooltip = Tooltip;

export const ChartLegend = Legend;

export function ChartContainer({
	config = {},
	className: cls,
	style,
	children,
	...props
}: ChartContainerProps): ReactElement {
	const inked: TokenStyle = { ...seriesInks(config), ...style };
	return (
		<ChartContext.Provider value={{ config }}>
			<div className={cn("wg-kit-chart", cls)} style={inked} {...props}>
				<ResponsiveContainer initialDimension={CHART_INITIAL_SIZE}>{children}</ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
}

function seriesInks(config: ChartConfig): TokenStyle {
	const inks: Record<`--${string}`, string> = {};
	Object.entries(config).forEach(([key, entry], place) => {
		inks[seriesColorName(key)] = chartColorOf(entry.color, place);
	});
	return inks;
}

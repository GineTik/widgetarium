import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import type { TokenStyle } from "../utils/token-style";
import { drawableOf, entryOf, firstKey, useChart } from "./chart-context";
import type { ChartConfig, ChartItem } from "./chart-context";

export interface ChartLegendContentProps {
	readonly payload?: readonly ChartItem[] | undefined;
	readonly verticalAlign?: "top" | "middle" | "bottom" | undefined;
	readonly hideIcon?: boolean;
	readonly nameKey?: string | undefined;
	readonly className?: string | undefined;
}

interface LegendItemAsk {
	readonly config: ChartConfig;
	readonly item: ChartItem;
	readonly nameKey: string | undefined;
	readonly hideIcon: boolean;
}

const LEGEND_ICON_PX = 12;

export function ChartLegendContent({
	payload,
	verticalAlign = "bottom",
	hideIcon = false,
	nameKey,
	className: cls,
}: ChartLegendContentProps): ReactElement | null {
	const { config } = useChart();
	if (!payload?.length) return null;
	return (
		<div className={cn("wg-kit-chart-legend", cls)} data-side={verticalAlign === "top" ? "top" : "bottom"}>
			{payload.filter((item) => item.type !== "none").map((item) => legendItemOf({ config, item, nameKey, hideIcon }))}
		</div>
	);
}

function legendItemOf({ config, item, nameKey, hideIcon }: LegendItemAsk): ReactElement {
	const entry = entryOf(config, item, firstKey(nameKey, item.dataKey));
	const mark: TokenStyle = { "--wg-kit-chart-mark": item.color };
	return (
		<span key={String(item.value)} className="wg-kit-chart-legend-item">
			{!hideIcon && entry?.icon ? (
				<Icon name={entry.icon} size={LEGEND_ICON_PX} />
			) : (
				<i className="wg-kit-chart-mark" data-indicator="dot" style={mark} />
			)}
			{entry?.label ?? drawableOf(item.value)}
		</span>
	);
}

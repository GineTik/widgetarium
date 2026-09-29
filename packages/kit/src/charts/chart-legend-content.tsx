import { createElement as h } from "react";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cn } from "../utils/cn";
import { entryOf, firstKey, useChart } from "./chart-context";

export function ChartLegendContent({
	payload,
	verticalAlign = "bottom",
	hideIcon = false,
	nameKey,
	className: cls,
}: LooseProps) {
	const { config } = useChart();
	if (!payload?.length) return null;
	return (
		<div className={cn("wg-kit-chart-legend", cls)} data-side={verticalAlign === "top" ? "top" : "bottom"}>
			{payload
				.filter((item) => item.type !== "none")
				.map((item) => {
					const entry = entryOf(config, item, firstKey(nameKey, item.dataKey));
					return (
						<span key={String(item.value)} className="wg-kit-chart-legend-item">
							{!hideIcon && entry?.icon ? (
								<Icon name={entry.icon} size={12} />
							) : (
								<i className="wg-kit-chart-mark" data-indicator="dot" style={{ "--wg-kit-chart-mark": item.color }} />
							)}
							{entry?.label ?? item.value}
						</span>
					);
				})}
		</div>
	);
}

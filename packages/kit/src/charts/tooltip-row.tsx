import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { entryOf, firstKey, useChart } from "./chart-context";
import { FormattedRow } from "./formatted-row";
import { TooltipMark } from "./tooltip-mark";
import { TooltipValue } from "./tooltip-value";

export function TooltipRow({ item, index, nameKey, formatter, mark }: LooseProps) {
	const { config } = useChart();
	if (formatter && item.value !== undefined && item.name)
		return <FormattedRow item={item} index={index} formatter={formatter} />;
	const entry = entryOf(config, item, firstKey(nameKey, item.name, item.dataKey));
	return (
		<div className="wg-kit-chart-tip-row">
			<TooltipMark mark={mark} ink={item.payload?.fill ?? item.color} />
			<span className="wg-kit-chart-tip-name">{entry?.label ?? item.name}</span>
			<TooltipValue value={item.value} />
		</div>
	);
}

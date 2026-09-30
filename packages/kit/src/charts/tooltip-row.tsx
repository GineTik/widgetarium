import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TooltipIndicator } from "../constants/charts";
import { drawableOf, entryOf, fieldOf, firstKey, useChart } from "./chart-context";
import type { ChartItem } from "./chart-context";
import { FormattedRow } from "./formatted-row";
import type { TooltipFormatter } from "./formatted-row";
import { TooltipMark } from "./tooltip-mark";
import { TooltipValue } from "./tooltip-value";

export interface TooltipRowProps {
	readonly item: ChartItem;
	readonly index: number;
	readonly nameKey?: string | undefined;
	readonly formatter?: TooltipFormatter | undefined;
	readonly mark: TooltipIndicator | null;
}

export function TooltipRow({ item, index, nameKey, formatter, mark }: TooltipRowProps): ReactElement {
	const { config } = useChart();
	if (formatter && item.value !== undefined && item.name)
		return <FormattedRow item={item} index={index} formatter={formatter} />;
	const entry = entryOf(config, item, firstKey(nameKey, item.name, item.dataKey));
	return (
		<div className="wg-kit-chart-tip-row">
			<TooltipMark mark={mark} ink={fieldOf(item.payload, "fill") ?? item.color} />
			<span className="wg-kit-chart-tip-name">{entry?.label ?? drawableOf(item.name)}</span>
			<TooltipValue value={item.value} />
		</div>
	);
}

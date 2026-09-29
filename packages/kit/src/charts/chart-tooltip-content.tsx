import { createElement as h } from "react";
import { TOOLTIP_INDICATORS } from "../constants/charts";
import type { LooseProps } from "../types";
import { glassClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import { entryOf, firstKey, useChart } from "./chart-context";
import type { ChartConfig } from "./chart-context";
import { TooltipHeading } from "./tooltip-heading";
import { TooltipRow } from "./tooltip-row";

const TOOLTIP_INDICATOR_WORD = {
	kind: "tooltip indicator",
	allowed: TOOLTIP_INDICATORS,
	fallback: TOOLTIP_INDICATORS[0],
};

export function ChartTooltipContent({
	active,
	payload,
	label,
	labelFormatter,
	formatter,
	hideLabel,
	hideIndicator,
	indicator,
	nameKey,
	labelKey,
	className: cls,
}: LooseProps) {
	const { config } = useChart();
	if (!active || !payload?.length) return null;
	const mark = hideIndicator ? null : wornWord(indicator, TOOLTIP_INDICATOR_WORD);
	return (
		<div className={cn(glassClass(), "wg-kit-chart-tip", cls)}>
			<TooltipHeading heading={hideLabel ? null : headingOf({ config, payload, label, labelFormatter, labelKey })} />
			{payload
				.filter((item) => item.type !== "none")
				.map((item, index) => (
					<TooltipRow
						key={String(item.dataKey ?? index)}
						item={item}
						index={index}
						nameKey={nameKey}
						formatter={formatter}
						mark={mark}
					/>
				))}
		</div>
	);
}

function headingOf({ config, payload, label, labelFormatter, labelKey }) {
	const said = saidHeading(config, payload[0], label, labelKey);
	if (labelFormatter) return labelFormatter(said, payload);
	return said === undefined || said === "" ? null : said;
}

function saidHeading(config: ChartConfig, first, label, labelKey) {
	if (!labelKey && typeof label === "string") return config[label]?.label ?? label;
	return entryOf(config, first, firstKey(labelKey, first?.dataKey, first?.name))?.label;
}

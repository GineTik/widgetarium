import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { TOOLTIP_INDICATORS } from "../constants/charts";
import type { TooltipIndicator } from "../constants/charts";
import { glassClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";
import type { WordChoice } from "../utils/surface";
import { entryOf, firstKey, useChart } from "./chart-context";
import type { ChartConfig, ChartItem } from "./chart-context";
import type { TooltipFormatter } from "./formatted-row";
import { TooltipHeading } from "./tooltip-heading";
import { TooltipRow } from "./tooltip-row";

export type LabelFormatter = (label: ReactNode, payload: readonly ChartItem[]) => ReactNode;

export interface ChartTooltipContentProps {
	readonly active?: boolean | undefined;
	readonly payload?: readonly ChartItem[] | undefined;
	readonly label?: unknown;
	readonly labelFormatter?: LabelFormatter | undefined;
	readonly formatter?: TooltipFormatter | undefined;
	readonly hideLabel?: boolean | undefined;
	readonly hideIndicator?: boolean | undefined;
	readonly indicator?: TooltipIndicator | undefined;
	readonly nameKey?: string | undefined;
	readonly labelKey?: string | undefined;
	readonly className?: string | undefined;
}

interface HeadingAsk {
	readonly config: ChartConfig;
	readonly payload: readonly ChartItem[];
	readonly label: unknown;
	readonly labelFormatter: LabelFormatter | undefined;
	readonly labelKey: string | undefined;
}

const TOOLTIP_INDICATOR_WORD: WordChoice<TooltipIndicator> = {
	kind: "tooltip indicator",
	allowed: TOOLTIP_INDICATORS,
	fallback: "dot",
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
}: ChartTooltipContentProps): ReactElement | null {
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

function headingOf({ config, payload, label, labelFormatter, labelKey }: HeadingAsk): ReactNode {
	const said = saidHeading(config, payload[0], label, labelKey);
	if (labelFormatter) return labelFormatter(said, payload);
	return said === undefined || said === "" ? null : said;
}

function saidHeading(
	config: ChartConfig,
	first: ChartItem | undefined,
	label: unknown,
	labelKey: string | undefined,
): ReactNode {
	if (!labelKey && typeof label === "string")
		return (Object.hasOwn(config, label) ? config[label]?.label : undefined) ?? label;
	return entryOf(config, first, firstKey(labelKey, first?.dataKey, first?.name))?.label;
}

import { createContext, createElement as h, useContext } from "react";
import type { ComponentType, ReactNode } from "react";
import {
	Area as RechartsArea,
	Bar as RechartsBar,
	Funnel as RechartsFunnel,
	Legend,
	Line as RechartsLine,
	Pie as RechartsPie,
	Radar as RechartsRadar,
	RadialBar as RechartsRadialBar,
	ResponsiveContainer,
	Scatter as RechartsScatter,
	Tooltip,
} from "recharts";
import { CHART_INITIAL_SIZE, TOOLTIP_INDICATORS } from "../constants/charts";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { chartColorOf, seriesColorName } from "../utils/chart-colors";
import { glassClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { wornWord } from "../utils/surface";

export type ChartConfig = Record<string, { label?: ReactNode; icon?: string; color?: number | string }>;

const ChartContext = createContext<{ config: ChartConfig } | null>(null);

const TOOLTIP_INDICATOR_WORD = {
	kind: "tooltip indicator",
	allowed: TOOLTIP_INDICATORS,
	fallback: TOOLTIP_INDICATORS[0],
};

export function useChart() {
	const chart = useContext(ChartContext);
	if (!chart) throw new Error("a chart part stands outside a ChartContainer");
	return chart;
}

export const Area = withoutLoadMotion(RechartsArea, "Area");
export const Bar = withoutLoadMotion(RechartsBar, "Bar");
export const Line = withoutLoadMotion(RechartsLine, "Line");
export const Pie = withoutLoadMotion(RechartsPie, "Pie");
export const Radar = withoutLoadMotion(RechartsRadar, "Radar");
export const RadialBar = withoutLoadMotion(RechartsRadialBar, "RadialBar");
export const Scatter = withoutLoadMotion(RechartsScatter, "Scatter");
export const Funnel = withoutLoadMotion(RechartsFunnel, "Funnel");

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

function withoutLoadMotion<P extends object>(Mark: ComponentType<P>, name: string) {
	function Still({ isAnimationActive = false, ...props }: P & { isAnimationActive?: boolean }) {
		return h(Mark, { isAnimationActive, ...props } as P);
	}
	Still.displayName = name;
	return Still;
}

function TooltipHeading({ heading }: LooseProps) {
	if (heading === null) return null;
	return <div className="wg-kit-chart-tip-label">{heading}</div>;
}

function TooltipRow({ item, index, nameKey, formatter, mark }: LooseProps) {
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

function FormattedRow({ item, index, formatter }: LooseProps) {
	return <div className="wg-kit-chart-tip-row">{formatter(item.value, item.name, item, index, item.payload)}</div>;
}

function TooltipMark({ mark, ink }: LooseProps) {
	if (mark === null) return null;
	return <i className="wg-kit-chart-mark" data-indicator={mark} style={{ "--wg-kit-chart-mark": ink }} />;
}

function TooltipValue({ value }: LooseProps) {
	if (value === undefined) return null;
	return (
		<span className="wg-kit-chart-tip-value">{typeof value === "number" ? value.toLocaleString() : String(value)}</span>
	);
}

function seriesInks(config: ChartConfig) {
	return Object.fromEntries(
		Object.entries(config).map(([key, entry], place) => [seriesColorName(key), chartColorOf(entry?.color, place)]),
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

function firstKey(...candidates: unknown[]): string {
	return String(candidates.find((candidate) => candidate !== undefined && candidate !== null) ?? "value");
}

function entryOf(config: ChartConfig, item, key: string) {
	const named = [item?.[key], item?.payload?.[key]].find((held) => typeof held === "string");
	return config[named ?? key] ?? config[key];
}

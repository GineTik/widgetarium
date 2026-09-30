import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { ChartItem } from "./chart-context";

export type TooltipFormatter = (
	value: unknown,
	name: unknown,
	item: ChartItem,
	index: number,
	payload: unknown,
) => ReactNode;

export interface FormattedRowProps {
	readonly item: ChartItem;
	readonly index: number;
	readonly formatter: TooltipFormatter;
}

export function FormattedRow({ item, index, formatter }: FormattedRowProps): ReactElement {
	return <div className="wg-kit-chart-tip-row">{formatter(item.value, item.name, item, index, item.payload)}</div>;
}

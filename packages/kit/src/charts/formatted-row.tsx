import { createElement as h } from "react";
import type { LooseProps } from "../types";

export function FormattedRow({ item, index, formatter }: LooseProps) {
	return <div className="wg-kit-chart-tip-row">{formatter(item.value, item.name, item, index, item.payload)}</div>;
}

import { createElement as h } from "react";
import type { LooseProps } from "../types";

export function TooltipValue({ value }: LooseProps) {
	if (value === undefined) return null;
	return (
		<span className="wg-kit-chart-tip-value">{typeof value === "number" ? value.toLocaleString() : String(value)}</span>
	);
}

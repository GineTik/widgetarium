import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface TooltipValueProps {
	readonly value: unknown;
}

export function TooltipValue({ value }: TooltipValueProps): ReactElement | null {
	if (value === undefined) return null;
	return (
		<span className="wg-kit-chart-tip-value">{typeof value === "number" ? value.toLocaleString() : String(value)}</span>
	);
}

import { createElement as h } from "react";
import type { LooseProps } from "../types";

export function TooltipHeading({ heading }: LooseProps) {
	if (heading === null) return null;
	return <div className="wg-kit-chart-tip-label">{heading}</div>;
}

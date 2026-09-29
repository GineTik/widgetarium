import { createElement as h } from "react";
import type { LooseProps } from "../types";

export function TooltipMark({ mark, ink }: LooseProps) {
	if (mark === null) return null;
	return <i className="wg-kit-chart-mark" data-indicator={mark} style={{ "--wg-kit-chart-mark": ink }} />;
}

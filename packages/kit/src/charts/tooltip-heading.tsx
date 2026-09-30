import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface TooltipHeadingProps {
	readonly heading: ReactNode;
}

export function TooltipHeading({ heading }: TooltipHeadingProps): ReactElement | null {
	if (heading === null) return null;
	return <div className="wg-kit-chart-tip-label">{heading}</div>;
}

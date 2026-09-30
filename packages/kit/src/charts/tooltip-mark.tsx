import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TooltipIndicator } from "../constants/charts";
import type { TokenStyle } from "../utils/token-style";

export interface TooltipMarkProps {
	readonly mark: TooltipIndicator | null;
	readonly ink: unknown;
}

export function TooltipMark({ mark, ink }: TooltipMarkProps): ReactElement | null {
	if (mark === null) return null;
	const inked: TokenStyle = { "--wg-kit-chart-mark": typeof ink === "string" ? ink : undefined };
	return <i className="wg-kit-chart-mark" data-indicator={mark} style={inked} />;
}

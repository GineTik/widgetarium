import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { TOOLTIP_DELAY_MS, TOOLTIP_SKIP_DELAY_MS } from "../constants/overlays";
import { TooltipTimingContext } from "./tooltip-context";

export interface TooltipProviderProps {
	readonly delayDuration?: number | undefined;
	readonly skipDelayDuration?: number | undefined;
	readonly children?: ReactNode;
}

export function TooltipProvider({
	delayDuration = TOOLTIP_DELAY_MS,
	skipDelayDuration = TOOLTIP_SKIP_DELAY_MS,
	children,
}: TooltipProviderProps): ReactElement {
	const lastClosedAt = useRef(0);
	return (
		<TooltipTimingContext.Provider value={{ delayDuration, skipDelayDuration, lastClosedAt }}>
			{children}
		</TooltipTimingContext.Provider>
	);
}

import { createElement as h, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import { HOVER_GRACE_MS } from "../constants/overlays";
import { useHoverLayer } from "../hooks/use-hover-layer";
import { TooltipContext, TooltipTimingContext, openDelayOf } from "./tooltip-context";

export { TooltipProvider } from "./tooltip-provider";
export { TooltipTrigger } from "./tooltip-trigger";
export { TooltipContent } from "./tooltip-content";
export type { TooltipProviderProps } from "./tooltip-provider";
export type { TooltipTriggerProps } from "./tooltip-trigger";
export type { TooltipContentProps } from "./tooltip-content";

export interface TooltipProps {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly delayDuration?: number | undefined;
	readonly children?: ReactNode;
}

export function Tooltip({ open, defaultOpen, onOpenChange, delayDuration, children }: TooltipProps): ReactElement {
	const timing = useContext(TooltipTimingContext);
	const tooltip = useHoverLayer({
		open,
		defaultOpen,
		onOpenChange: (next) => {
			if (!next) timing.lastClosedAt.current = Date.now();
			onOpenChange?.(next);
		},
		openDelay: () => openDelayOf(timing, delayDuration),
		closeDelay: HOVER_GRACE_MS,
	});
	return <TooltipContext.Provider value={tooltip}>{children}</TooltipContext.Provider>;
}

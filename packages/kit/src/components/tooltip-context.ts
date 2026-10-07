import { createContext, useContext } from "react";
import type { Context, RefObject } from "react";
import { TOOLTIP_DELAY_MS, TOOLTIP_SKIP_DELAY_MS } from "../constants/overlays";
import type { HoverLayer } from "../hooks/use-hover-layer";

export interface TooltipTiming {
	readonly delayDuration: number;
	readonly skipDelayDuration: number;
	readonly lastClosedAt: RefObject<number>;
}

export const TooltipTimingContext: Context<TooltipTiming> = createContext<TooltipTiming>({
	delayDuration: TOOLTIP_DELAY_MS,
	skipDelayDuration: TOOLTIP_SKIP_DELAY_MS,
	lastClosedAt: { current: 0 },
});

export const TooltipContext: Context<HoverLayer | null> = createContext<HoverLayer | null>(null);

export function useTooltip(): HoverLayer {
	const tooltip = useContext(TooltipContext);
	if (!tooltip) throw new Error("a tooltip part stands outside a Tooltip");
	return tooltip;
}

export function openDelayOf(timing: TooltipTiming, delayDuration: number | undefined): number {
	const isWarm = Date.now() - timing.lastClosedAt.current < timing.skipDelayDuration;
	return isWarm ? 0 : (delayDuration ?? timing.delayDuration);
}

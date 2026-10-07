import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useHoverContent } from "../hooks/use-hover-content";
import { cn } from "../utils/cn";
import { hoverContentHandlers } from "../utils/hover-trigger";
import { FloatingPanel } from "./floating-panel";
import { useTooltip } from "./tooltip-context";

export interface TooltipContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
}

const TOOLTIP_OFFSET_PX = 6;

export function TooltipContent({
	side = "top",
	align = "center",
	sideOffset = TOOLTIP_OFFSET_PX,
	alignOffset = 0,
	className,
	...rest
}: TooltipContentProps): ReactElement | null {
	const tooltip = useTooltip();
	const { panelRef, isMounted } = useHoverContent(tooltip, { side, align, sideOffset, alignOffset });
	if (!isMounted) return null;
	return (
		<FloatingPanel
			role="tooltip"
			id={tooltip.contentId}
			{...rest}
			{...hoverContentHandlers(tooltip, rest)}
			isOpen={tooltip.isOpen}
			panelRef={panelRef}
			data-slot="tooltip-content"
			className={cn("wg-kit-tooltip", className)}
		/>
	);
}

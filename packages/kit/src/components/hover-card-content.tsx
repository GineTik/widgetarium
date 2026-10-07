import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { DEFAULT_SIDE_OFFSET } from "../constants/popover";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useHoverContent } from "../hooks/use-hover-content";
import { cn } from "../utils/cn";
import { hoverContentHandlers } from "../utils/hover-trigger";
import { FloatingPanel } from "./floating-panel";
import { useHoverCard } from "./hover-card-context";

export interface HoverCardContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
}

export function HoverCardContent({
	side = "bottom",
	align = "center",
	sideOffset = DEFAULT_SIDE_OFFSET,
	alignOffset = 0,
	className,
	...rest
}: HoverCardContentProps): ReactElement | null {
	const card = useHoverCard();
	const { panelRef, isMounted } = useHoverContent(card, { side, align, sideOffset, alignOffset });
	if (!isMounted) return null;
	return (
		<FloatingPanel
			id={card.contentId}
			{...rest}
			{...hoverContentHandlers(card, rest)}
			isOpen={card.isOpen}
			panelRef={panelRef}
			data-slot="hover-card-content"
			className={cn("wg-kit-hover-card", className)}
		/>
	);
}

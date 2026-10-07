import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { HOVER_CARD_CLOSE_MS, HOVER_CARD_OPEN_MS } from "../constants/overlays";
import { useHoverLayer } from "../hooks/use-hover-layer";
import { HoverCardContext } from "./hover-card-context";

export { HoverCardTrigger } from "./hover-card-trigger";
export { HoverCardContent } from "./hover-card-content";
export type { HoverCardTriggerProps } from "./hover-card-trigger";
export type { HoverCardContentProps } from "./hover-card-content";

export interface HoverCardProps {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly openDelay?: number | undefined;
	readonly closeDelay?: number | undefined;
	readonly children?: ReactNode;
}

export function HoverCard({
	open,
	defaultOpen,
	onOpenChange,
	openDelay = HOVER_CARD_OPEN_MS,
	closeDelay = HOVER_CARD_CLOSE_MS,
	children,
}: HoverCardProps): ReactElement {
	const card = useHoverLayer({ open, defaultOpen, onOpenChange, openDelay: () => openDelay, closeDelay });
	return <HoverCardContext.Provider value={card}>{children}</HoverCardContext.Provider>;
}

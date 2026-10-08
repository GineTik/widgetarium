import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import type { PopoverAlign, PopoverSide } from "../constants/popover";
import { useAsksPlacement } from "../hooks/use-asks-placement";
import { portalLayer } from "../utils/portal-layer";
import { usePopover } from "./popover-context";
import { PopoverPanel } from "./popover-panel";

export interface PopoverContentProps {
	readonly side?: PopoverSide | undefined;
	readonly align?: PopoverAlign | undefined;
	readonly sideOffset?: number | undefined;
	readonly alignOffset?: number | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function PopoverContent({ children, className, ...placement }: PopoverContentProps): ReactElement {
	const popover = usePopover();
	const held = useRef<ReactNode>(null);
	if (popover.isOpen) held.current = children;
	useAsksPlacement({ ...placement, askPlacement: popover.askPlacement });
	const panel = (
		<PopoverPanel popover={popover} className={className}>
			{popover.shown ? held.current : null}
		</PopoverPanel>
	);
	if (!popover.isPortaled) return panel;
	return createPortal(panel, portalLayer());
}

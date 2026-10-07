import { createElement as h } from "react";
import type { HTMLAttributes, ReactPortal, Ref } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";
import { dataStateOf } from "./popover-context";

export interface FloatingPanelProps extends HTMLAttributes<HTMLDivElement> {
	readonly isOpen: boolean;
	readonly panelRef: Ref<HTMLDivElement>;
	readonly "data-slot": string;
}

export function FloatingPanel({ isOpen, panelRef, className, children, ...rest }: FloatingPanelProps): ReactPortal {
	return createPortal(
		<div
			{...rest}
			ref={panelRef}
			className={cn("wg-kit-float", className)}
			data-state={dataStateOf(isOpen)}
			data-wg-overlay=""
		>
			{children}
		</div>,
		portalLayer(),
	);
}

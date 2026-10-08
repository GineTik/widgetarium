import { createElement as h, useRef } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useDismissLayer } from "../hooks/use-dismiss-layer";
import { cn } from "../utils/cn";
import { portalLayer } from "../utils/portal-layer";

export interface CommandMenuOverlayProps {
	readonly isOpen: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly isPortaled?: boolean | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function CommandMenuOverlay({
	isOpen,
	onClose,
	isPortaled = true,
	children,
	className: cls,
}: CommandMenuOverlayProps): ReactElement | null {
	const overlayRef = useRef<HTMLDivElement>(null);
	useDismissLayer({
		isOpen,
		holds: (node) => Boolean(overlayRef.current?.contains(node)),
		onEscape: () => onClose?.(),
		escapeReach: isPortaled ? "document" : "within",
	});
	if (!isOpen) return null;
	const layer = (
		<div
			ref={overlayRef}
			className={cn("wg-kit-command-overlay", !isPortaled && "is-inline", cls)}
			onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}
		>
			{children}
		</div>
	);
	return isPortaled ? createPortal(layer, portalLayer()) : layer;
}

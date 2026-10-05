import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
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
	if (!isOpen) return null;
	const layer = (
		<div
			className={cn("wg-kit-command-overlay", !isPortaled && "is-inline", cls)}
			onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}
			onKeyDown={(event) => event.key === "Escape" && onClose?.()}
		>
			{children}
		</div>
	);
	return isPortaled ? createPortal(layer, portalLayer()) : layer;
}

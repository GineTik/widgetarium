import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayLayer } from "../hooks/use-overlay-layer";
import { cn } from "../utils/cn";

export interface DialogLayerProps {
	readonly isOpen: boolean;
	readonly onClose?: (() => void) | undefined;
	readonly size?: "s" | "m" | undefined;
	readonly slot?: string | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function DialogLayer({
	isOpen,
	onClose,
	size = "m",
	slot,
	className,
	children,
}: DialogLayerProps): ReactElement | null {
	const { anchorRef, layer, isScoped } = useOverlayLayer(isOpen);
	if (!isOpen) return null;
	const overlay = (
		<div
			className={cn("wg-kit-dialog-overlay", isScoped && "is-scoped")}
			onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}
			onKeyDown={(event) => event.key === "Escape" && onClose?.()}
		>
			<div
				className={cn("wg-kit-dialog", size === "s" && "is-s", className)}
				role="dialog"
				aria-modal="true"
				data-slot={slot}
			>
				{children}
			</div>
		</div>
	);
	return (
		<>
			<span ref={anchorRef} hidden />
			{layer ? createPortal(overlay, layer) : null}
		</>
	);
}

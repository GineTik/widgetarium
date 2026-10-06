import { createElement as h, Fragment } from "react";
import type { ReactElement, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayLayer } from "../hooks/use-overlay-layer";
import { cn } from "../utils/cn";
import { DialogHead } from "./dialog-head";

export interface DialogProps {
	readonly isOpen: boolean;
	readonly title?: ReactNode;
	readonly onClose?: (() => void) | undefined;
	readonly actions?: ReactNode;
	readonly size?: "s" | "m" | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function Dialog({
	isOpen,
	title,
	onClose,
	actions,
	size = "m",
	children,
	className: cls,
}: DialogProps): ReactElement | null {
	const { anchorRef, layer, isScoped } = useOverlayLayer(isOpen);
	if (!isOpen) return null;
	const overlay = (
		<div
			className={cn("wg-kit-dialog-overlay", isScoped && "is-scoped")}
			onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}
			onKeyDown={(event) => event.key === "Escape" && onClose?.()}
		>
			<div className={cn("wg-kit-dialog", size === "s" && "is-s", cls)} role="dialog" aria-modal="true">
				<DialogHead title={title} onClose={onClose} />
				{children}
				{actions ? <footer className="wg-kit-dialog-actions">{actions}</footer> : null}
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

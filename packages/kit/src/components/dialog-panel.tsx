import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { DialogHead } from "./dialog-head";
import { DialogLayer } from "./dialog-layer";

export interface DialogPanelProps {
	readonly isOpen: boolean;
	readonly title?: ReactNode;
	readonly onClose?: (() => void) | undefined;
	readonly actions?: ReactNode;
	readonly size?: "s" | "m" | undefined;
	readonly children?: ReactNode;
	readonly className?: string | undefined;
}

export function DialogPanel({
	isOpen,
	title,
	onClose,
	actions,
	size,
	children,
	className,
}: DialogPanelProps): ReactElement {
	return (
		<DialogLayer isOpen={isOpen} onClose={onClose} size={size} className={className}>
			<DialogHead title={title} onClose={onClose} />
			{children}
			{actions ? <footer className="wg-kit-dialog-actions">{actions}</footer> : null}
		</DialogLayer>
	);
}

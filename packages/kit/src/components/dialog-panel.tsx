import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { dialogClass } from "../utils/class-names";
import type { DialogSize } from "../utils/class-names";
import { DialogContext } from "./dialog-context";
import type { DialogState } from "./dialog-context";
import { DialogHead } from "./dialog-head";
import { ModalLayer } from "./modal-layer";

export interface DialogPanelProps {
	readonly isOpen: boolean;
	readonly title?: ReactNode;
	readonly onClose?: (() => void) | undefined;
	readonly actions?: ReactNode;
	readonly size?: DialogSize | undefined;
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
		<DialogContext.Provider value={dialogStateOf(isOpen, onClose)}>
			<ModalLayer kind="dialog" closesOnScrim={true} className={dialogClass({ size, className })}>
				<DialogHead title={title} onClose={onClose} />
				{children}
				{actions ? <footer className="wg-kit-dialog-actions">{actions}</footer> : null}
			</ModalLayer>
		</DialogContext.Provider>
	);
}

function dialogStateOf(isOpen: boolean, onClose: (() => void) | undefined): DialogState {
	return {
		isOpen,
		setOpen: (open) => {
			if (!open) onClose?.();
		},
	};
}

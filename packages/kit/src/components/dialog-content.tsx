import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { dialogClass } from "../utils/class-names";
import type { DialogSize } from "../utils/class-names";
import { ModalCloseButton } from "./modal-close-button";
import { ModalLayer } from "./modal-layer";

export interface DialogContentProps {
	readonly showCloseButton?: boolean | undefined;
	readonly size?: DialogSize | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

export function DialogContent({ showCloseButton = true, size, className, children }: DialogContentProps): ReactElement {
	return (
		<ModalLayer kind="dialog" closesOnScrim={true} className={dialogClass({ size, className })}>
			{children}
			{showCloseButton ? <ModalCloseButton /> : null}
		</ModalLayer>
	);
}

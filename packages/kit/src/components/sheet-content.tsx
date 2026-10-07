import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { ModalCloseButton } from "./modal-close-button";
import { ModalLayer } from "./modal-layer";
import type { ModalSide } from "./modal-layer";

export interface SheetContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly side?: ModalSide | undefined;
	readonly showCloseButton?: boolean | undefined;
}

export function SheetContent({
	side = "right",
	showCloseButton = true,
	children,
	...rest
}: SheetContentProps): ReactElement {
	return (
		<ModalLayer kind="sheet" side={side} closesOnScrim={true} {...rest}>
			{children}
			{showCloseButton ? <ModalCloseButton /> : null}
		</ModalLayer>
	);
}

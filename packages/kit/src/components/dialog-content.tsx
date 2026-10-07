import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Icon } from "../icons/icon";
import { useDialog } from "./dialog-context";
import { DialogLayer } from "./dialog-layer";
import { IconButton } from "./icon-button";

export interface DialogContentProps {
	readonly showCloseButton?: boolean | undefined;
	readonly size?: "s" | "m" | undefined;
	readonly className?: string | undefined;
	readonly children?: ReactNode;
}

const CLOSE_LABEL = "Close";

export function DialogContent({
	showCloseButton = true,
	size,
	className,
	children,
}: DialogContentProps): ReactElement | null {
	const { isOpen, setOpen } = useDialog();
	const close = (): void => setOpen(false);
	return (
		<DialogLayer isOpen={isOpen} onClose={close} size={size} slot="dialog-content" className={className}>
			{children}
			{showCloseButton ? (
				<IconButton variant="ghost" size="s" label={CLOSE_LABEL} className="wg-kit-dialog-close" onClick={close}>
					<Icon name="x" />
				</IconButton>
			) : null}
		</DialogLayer>
	);
}

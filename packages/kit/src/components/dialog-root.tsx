import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOpenState } from "../hooks/use-open-state";
import { DialogContext } from "./dialog-context";

export interface DialogRootProps {
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly children?: ReactNode;
}

export function DialogRoot({ open, defaultOpen = false, onOpenChange, children }: DialogRootProps): ReactElement {
	const [isOpen, setOpen] = useOpenState({ open, defaultOpen, onOpenChange });
	return <DialogContext.Provider value={{ isOpen, setOpen }}>{children}</DialogContext.Provider>;
}

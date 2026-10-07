import { createContext, useContext } from "react";
import type { Context } from "react";

export interface DialogState {
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
}

export const DialogContext: Context<DialogState | null> = createContext<DialogState | null>(null);

export function useDialog(): DialogState {
	const dialog = useContext(DialogContext);
	if (!dialog) throw new Error("a dialog part stands outside a Dialog");
	return dialog;
}

import { createContext } from "react";
import type { Context } from "react";

export interface DialogStateValue {
	readonly close: () => void;
}

export const DialogState: Context<DialogStateValue | null> = createContext<DialogStateValue | null>(null);

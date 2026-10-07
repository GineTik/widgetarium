import { createContext } from "react";
import type { Context } from "react";

export interface ScrollAreaState {
	readonly wantAcross: (isWanted: boolean) => void;
}

export const ScrollAreaContext: Context<ScrollAreaState | null> = createContext<ScrollAreaState | null>(null);

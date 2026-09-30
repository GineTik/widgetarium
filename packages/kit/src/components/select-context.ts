import { createContext, useContext } from "react";
import type { Context, ReactNode } from "react";

export interface SelectState {
	readonly selected: unknown;
	readonly choose: (value: unknown) => void;
	readonly labels: ReadonlyMap<unknown, ReactNode>;
}

export const SelectContext: Context<SelectState | null> = createContext<SelectState | null>(null);

export function useSelect(): SelectState {
	const select = useContext(SelectContext);
	if (!select) throw new Error("a select part stands outside a Select");
	return select;
}

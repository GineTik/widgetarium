import { createContext, useContext } from "react";
import type { Context } from "react";

export interface ToggleGroupState {
	readonly pressed: readonly string[];
	readonly toggle: (value: string) => void;
	readonly disabled: boolean;
}

export const ToggleGroupContext: Context<ToggleGroupState | null> = createContext<ToggleGroupState | null>(null);

export function useToggleGroup(): ToggleGroupState {
	const group = useContext(ToggleGroupContext);
	if (!group) throw new Error("a toggle group item stands outside a ToggleGroup");
	return group;
}

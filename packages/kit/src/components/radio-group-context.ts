import { createContext, useContext } from "react";
import type { Context } from "react";

export interface RadioGroupState {
	readonly value: string;
	readonly choose: (value: string) => void;
	readonly disabled: boolean;
}

export const RadioGroupContext: Context<RadioGroupState | null> = createContext<RadioGroupState | null>(null);

export function useRadioGroup(): RadioGroupState {
	const group = useContext(RadioGroupContext);
	if (!group) throw new Error("a radio group item stands outside a RadioGroup");
	return group;
}

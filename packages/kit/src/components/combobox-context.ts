import { createContext, useContext } from "react";
import type { Context } from "react";

export interface ComboboxState {
	readonly isMultiple: boolean;
	readonly disabled: boolean;
	readonly isOpen: boolean;
	readonly setOpen: (open: boolean) => void;
	readonly inputText: string;
	readonly type: (text: string) => void;
	readonly selected: readonly unknown[];
	readonly isSelected: (value: unknown) => boolean;
	readonly choose: (value: unknown) => void;
	readonly remove: (value: unknown) => void;
	readonly clear: () => void;
	readonly stringOf: (item: unknown) => string;
	readonly hasItems: boolean;
	readonly filtered: readonly unknown[];
	readonly isEmpty: boolean;
	readonly matches: (text: string) => boolean;
	readonly highlighted: string | null;
	readonly highlight: (key: string | null) => void;
	readonly listId: string;
}

export const ComboboxContext: Context<ComboboxState | null> = createContext<ComboboxState | null>(null);

export function useCombobox(): ComboboxState {
	const combobox = useContext(ComboboxContext);
	if (!combobox) throw new Error("a combobox part stands outside a Combobox");
	return combobox;
}

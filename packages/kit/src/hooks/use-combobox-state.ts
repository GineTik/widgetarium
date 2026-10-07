import { useId, useState } from "react";
import type { ComboboxState } from "../components/combobox-context";
import { matchesQuery } from "../utils/combobox";
import { useControllableState } from "./use-controllable-state";

export interface ComboboxAsk {
	readonly isMultiple: boolean;
	readonly items: readonly unknown[] | undefined;
	readonly childValues: readonly unknown[];
	readonly stringOf: (item: unknown) => string;
	readonly selected: readonly unknown[] | undefined;
	readonly defaultSelected: readonly unknown[];
	readonly onSelectedChange: (next: readonly unknown[]) => void;
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly autoHighlight: boolean;
	readonly disabled: boolean;
}

export function useComboboxState(ask: ComboboxAsk): ComboboxState {
	const { isMultiple, stringOf } = ask;
	const [selected, setSelected] = useControllableState({
		prop: ask.selected,
		defaultProp: ask.defaultSelected,
		onChange: ask.onSelectedChange,
	});
	const [isOpen, setOpenHeld] = useControllableState({
		prop: ask.open,
		defaultProp: ask.defaultOpen,
		onChange: ask.onOpenChange,
	});
	const [query, setQuery] = useState<string | null>(null);
	const [highlighted, highlight] = useState<string | null>(null);
	const listId = useId();
	const asked = query ?? "";
	const matches = (text: string): boolean => matchesQuery(text, asked);
	const filtered = (ask.items ?? []).filter((item) => matches(stringOf(item)));
	const isSelected = (value: unknown): boolean => selected.some((one) => stringOf(one) === stringOf(value));
	const selectedWithout = (value: unknown): readonly unknown[] =>
		selected.filter((one) => stringOf(one) !== stringOf(value));
	const setOpen = (open: boolean): void => {
		if (!open) setQuery(null);
		setOpenHeld(open);
	};
	const firstLabel = selected[0] === undefined ? "" : stringOf(selected[0]);
	return {
		isMultiple,
		disabled: ask.disabled,
		isOpen,
		setOpen,
		inputText: query ?? (isMultiple ? "" : firstLabel),
		type: (text) => {
			setQuery(text);
			setOpenHeld(true);
			const first = ask.items ? ask.items.find((item) => matchesQuery(stringOf(item), text)) : undefined;
			highlight(ask.autoHighlight && first !== undefined ? stringOf(first) : null);
		},
		selected,
		isSelected,
		choose: (value) => {
			setQuery(null);
			if (!isMultiple) {
				setSelected([value]);
				setOpenHeld(false);
				return;
			}
			setSelected(isSelected(value) ? selectedWithout(value) : [...selected, value]);
		},
		remove: (value) => setSelected(selectedWithout(value)),
		clear: () => {
			setQuery(null);
			setSelected([]);
		},
		stringOf,
		hasItems: ask.items !== undefined,
		filtered,
		isEmpty: ask.items ? filtered.length === 0 : !ask.childValues.some((value) => matches(stringOf(value))),
		matches,
		highlighted,
		highlight,
		listId,
	};
}

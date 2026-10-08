import type { ComboboxState } from "../components/combobox-context";
import { matchesQuery } from "../utils/combobox";
import { useComboboxParts } from "./use-combobox-parts";
import type { Catalogue, ComboboxAsk, ComboboxParts } from "./use-combobox-parts";

export type { ComboboxAsk } from "./use-combobox-parts";

interface ToggleAsk<T> {
	readonly catalogue: Catalogue<T>;
	readonly selected: readonly T[];
	readonly key: string;
	readonly item: T;
}

type SelectionMoves = Pick<ComboboxState, "selectedKeys" | "isSelected" | "choose" | "remove" | "clear">;

type QueryMoves = Pick<ComboboxState, "setOpen" | "inputText" | "type" | "filteredItems" | "isEmpty" | "matches">;

export function useComboboxState<T>(ask: ComboboxAsk<T>): ComboboxState {
	const parts = useComboboxParts(ask);
	return { ...selectionMovesOf(parts), ...queryMovesOf(parts), ...lookupOf(parts) };
}

function lookupOf<T>(parts: ComboboxParts<T>): Omit<ComboboxState, keyof SelectionMoves | keyof QueryMoves> {
	const { ask, catalogue } = parts;
	return {
		isMultiple: ask.isMultiple,
		disabled: ask.disabled,
		hasItems: ask.hasItems,
		isOpen: parts.isOpen,
		selectedItems: parts.selected,
		keyOf: (value) => catalogue.byItem.get(value)?.key ?? null,
		labelOf: (key) => catalogue.byKey.get(key)?.label ?? "",
		highlighted: parts.highlighted,
		highlight: parts.highlight,
		listId: parts.listId,
	};
}

function selectionMovesOf<T>(parts: ComboboxParts<T>): SelectionMoves {
	const selectedKeys = parts.catalogue.selected.map((entry) => entry.key);
	return {
		selectedKeys,
		isSelected: (key) => isKeyChosen(parts.catalogue, key),
		choose: (key) => chooseKey(parts, key),
		remove: (key) => parts.setSelected(keptWithout(parts.catalogue, key)),
		clear: () => {
			parts.setQuery(null);
			parts.setSelected([]);
		},
	};
}

function chooseKey<T>(
	{ ask, catalogue, selected, setSelected, setQuery, setOpenHeld }: ComboboxParts<T>,
	key: string,
): void {
	const entry = catalogue.byKey.get(key);
	if (!entry) return;
	setQuery(null);
	if (ask.isMultiple) return setSelected(toggledIn({ catalogue, selected, key, item: entry.item }));
	setSelected([entry.item]);
	setOpenHeld(false);
}

function toggledIn<T>({ catalogue, selected, key, item }: ToggleAsk<T>): readonly T[] {
	if (isKeyChosen(catalogue, key)) return keptWithout(catalogue, key);
	return [...selected, item];
}

function isKeyChosen<T>(catalogue: Catalogue<T>, key: string): boolean {
	return catalogue.selected.some((entry) => entry.key === key);
}

function keptWithout<T>(catalogue: Catalogue<T>, key: string): T[] {
	return catalogue.selected.flatMap((entry) => (entry.key === key ? [] : [entry.item]));
}

function queryMovesOf<T>(parts: ComboboxParts<T>): QueryMoves {
	const { ask, query } = parts;
	const matches = (text: string): boolean => matchesQuery(text, query ?? "");
	const matching = parts.catalogue.known.filter((entry) => matches(entry.label));
	return {
		matches,
		setOpen: (open) => setOpenClearing(parts, open),
		inputText: query ?? inputTextOf(parts),
		type: (text) => typeQuery(parts, text),
		filteredItems: ask.hasItems ? matching.map((entry) => entry.item) : [],
		isEmpty: matching.length === 0,
	};
}

function setOpenClearing<T>({ setQuery, setOpenHeld }: ComboboxParts<T>, open: boolean): void {
	if (!open) setQuery(null);
	setOpenHeld(open);
}

function inputTextOf<T>({ ask, catalogue }: ComboboxParts<T>): string {
	if (ask.isMultiple) return "";
	return catalogue.selected[0]?.label ?? "";
}

function typeQuery<T>(parts: ComboboxParts<T>, text: string): void {
	parts.setQuery(text);
	parts.setOpenHeld(true);
	parts.highlight(firstMatchKeyOf(parts, text));
}

function firstMatchKeyOf<T>({ ask, catalogue }: ComboboxParts<T>, text: string): string | null {
	if (!ask.autoHighlight || !ask.hasItems) return null;
	return catalogue.known.find((entry) => matchesQuery(entry.label, text))?.key ?? null;
}

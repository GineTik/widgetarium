import { useId, useState } from "react";
import type { ComboboxState } from "../components/combobox-context";
import { entriesOf, matchesQuery } from "../utils/combobox";
import type { ComboboxEntry, ItemNaming } from "../utils/combobox";
import { useControllableState } from "./use-controllable-state";

export interface ComboboxAsk<T> {
	readonly isMultiple: boolean;
	readonly known: readonly T[];
	readonly hasItems: boolean;
	readonly naming: ItemNaming<T>;
	readonly selected: readonly T[] | undefined;
	readonly defaultSelected: readonly T[];
	readonly onSelectedChange: (next: readonly T[]) => void;
	readonly open?: boolean | undefined;
	readonly defaultOpen: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly autoHighlight: boolean;
	readonly disabled: boolean;
}

interface Catalogue<T> {
	readonly known: readonly ComboboxEntry<T>[];
	readonly selected: readonly ComboboxEntry<T>[];
	readonly byKey: ReadonlyMap<string, ComboboxEntry<T>>;
	readonly byItem: ReadonlyMap<unknown, ComboboxEntry<T>>;
}

interface MovesAsk<T> {
	readonly isMultiple: boolean;
	readonly catalogue: Catalogue<T>;
	readonly selected: readonly T[];
	readonly setSelected: (next: readonly T[]) => void;
	readonly setQuery: (query: string | null) => void;
	readonly setOpenHeld: (open: boolean) => void;
}

type SelectionMoves = Pick<ComboboxState, "selectedKeys" | "isSelected" | "choose" | "remove" | "clear">;

export function useComboboxState<T>(ask: ComboboxAsk<T>): ComboboxState {
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
	const catalogue = catalogueOf(ask, selected);
	const matches = (text: string): boolean => matchesQuery(text, query ?? "");
	const matching = catalogue.known.filter((entry) => matches(entry.label));
	const moves = selectionMovesOf({
		isMultiple: ask.isMultiple,
		catalogue,
		selected,
		setSelected,
		setQuery,
		setOpenHeld,
	});
	return {
		...moves,
		isMultiple: ask.isMultiple,
		disabled: ask.disabled,
		isOpen,
		setOpen: (open) => {
			if (!open) setQuery(null);
			setOpenHeld(open);
		},
		inputText: query ?? (ask.isMultiple ? "" : (catalogue.selected[0]?.label ?? "")),
		type: (text) => {
			setQuery(text);
			setOpenHeld(true);
			const first = catalogue.known.find((entry) => matchesQuery(entry.label, text));
			highlight(ask.autoHighlight && ask.hasItems && first ? first.key : null);
		},
		selectedItems: selected,
		keyOf: (value) => catalogue.byItem.get(value)?.key ?? null,
		labelOf: (key) => catalogue.byKey.get(key)?.label ?? "",
		hasItems: ask.hasItems,
		filteredItems: ask.hasItems ? matching.map((entry) => entry.item) : [],
		isEmpty: matching.length === 0,
		matches,
		highlighted,
		highlight,
		listId,
	};
}

function selectionMovesOf<T>({
	isMultiple,
	catalogue,
	selected,
	setSelected,
	setQuery,
	setOpenHeld,
}: MovesAsk<T>): SelectionMoves {
	const selectedKeys = catalogue.selected.map((entry) => entry.key);
	const isSelected = (key: string): boolean => selectedKeys.includes(key);
	const keptWithout = (key: string): T[] =>
		catalogue.selected.flatMap((entry) => (entry.key === key ? [] : [entry.item]));
	return {
		selectedKeys,
		isSelected,
		choose: (key) => {
			const entry = catalogue.byKey.get(key);
			if (!entry) return;
			setQuery(null);
			if (isMultiple) return setSelected(isSelected(key) ? keptWithout(key) : [...selected, entry.item]);
			setSelected([entry.item]);
			setOpenHeld(false);
		},
		remove: (key) => setSelected(keptWithout(key)),
		clear: () => {
			setQuery(null);
			setSelected([]);
		},
	};
}

function catalogueOf<T>(ask: ComboboxAsk<T>, selected: readonly T[]): Catalogue<T> {
	const known = entriesOf(ask.known, ask.naming);
	const chosen = entriesOf(selected, ask.naming);
	const every = [...known, ...chosen];
	return {
		known,
		selected: chosen,
		byKey: new Map(every.map((entry) => [entry.key, entry])),
		byItem: new Map(every.map((entry) => [entry.item, entry])),
	};
}

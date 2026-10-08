import { useId, useState } from "react";
import { entriesOf } from "../utils/combobox";
import type { ComboboxEntry, ItemNaming } from "../utils/combobox";
import { useComboboxOpen } from "./use-combobox-open";
import type { ComboboxOpenAsk } from "./use-combobox-open";
import { useControllableState } from "./use-controllable-state";

export interface ComboboxAsk<T> extends ComboboxOpenAsk {
	readonly isMultiple: boolean;
	readonly known: readonly T[];
	readonly hasItems: boolean;
	readonly naming: ItemNaming<T>;
	readonly selected: readonly T[] | undefined;
	readonly defaultSelected: readonly T[];
	readonly onSelectedChange: (next: readonly T[]) => void;
	readonly autoHighlight: boolean;
	readonly disabled: boolean;
}

export interface Catalogue<T> {
	readonly known: readonly ComboboxEntry<T>[];
	readonly selected: readonly ComboboxEntry<T>[];
	readonly byKey: ReadonlyMap<string, ComboboxEntry<T>>;
	readonly byItem: ReadonlyMap<unknown, ComboboxEntry<T>>;
}

export interface ComboboxParts<T> {
	readonly ask: ComboboxAsk<T>;
	readonly catalogue: Catalogue<T>;
	readonly selected: readonly T[];
	readonly setSelected: (next: readonly T[]) => void;
	readonly isOpen: boolean;
	readonly setOpenHeld: (open: boolean) => void;
	readonly query: string | null;
	readonly setQuery: (query: string | null) => void;
	readonly highlighted: string | null;
	readonly highlight: (key: string | null) => void;
	readonly listId: string;
}

export function useComboboxParts<T>(ask: ComboboxAsk<T>): ComboboxParts<T> {
	const [selected, setSelected] = useControllableState({
		prop: ask.selected,
		defaultProp: ask.defaultSelected,
		onChange: ask.onSelectedChange,
	});
	const [isOpen, setOpenHeld] = useComboboxOpen(ask);
	const [query, setQuery] = useState<string | null>(null);
	const [highlighted, highlight] = useState<string | null>(null);
	const listId = useId();
	const held = { selected, setSelected, isOpen, setOpenHeld, query, setQuery, highlighted, highlight, listId };
	return { ...held, ask, catalogue: catalogueOf(ask, selected) };
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

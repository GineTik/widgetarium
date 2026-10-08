import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useComboboxState } from "../hooks/use-combobox-state";
import { itemValuesIn } from "../utils/combobox";
import type { ItemGuard } from "../utils/combobox";
import { ComboboxContext } from "./combobox-context";
import { isComboboxItem } from "./combobox-item";
import { Popover } from "./popover";

export { ComboboxInput } from "./combobox-input";
export { ComboboxContent } from "./combobox-content";
export { ComboboxList } from "./combobox-list";
export { ComboboxItem } from "./combobox-item";
export { ComboboxEmpty } from "./combobox-empty";
export { ComboboxGroup, ComboboxLabel, ComboboxSeparator } from "./combobox-parts";
export { ComboboxChips } from "./combobox-chips";
export { ComboboxChip } from "./combobox-chip";
export { ComboboxChipsInput } from "./combobox-chips-input";
export { ComboboxValue } from "./combobox-value";
export { ComboboxTrigger } from "./combobox-trigger";
export type { ComboboxInputProps } from "./combobox-input";
export type { ComboboxItemProps } from "./combobox-item";
export type { ComboboxListProps } from "./combobox-list";
export type { ComboboxChipProps } from "./combobox-chip";
export type { ComboboxValueProps } from "./combobox-value";

interface ComboboxBaseProps<T> {
	readonly itemToStringValue?: ((item: T) => string) | undefined;
	readonly itemToStringLabel?: ((item: T) => string) | undefined;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly autoHighlight?: boolean | undefined;
	readonly disabled?: boolean | undefined;
	readonly children?: ReactNode;
}

interface ComboboxItemsSource<T> {
	readonly items: readonly T[];
	readonly isItem?: ItemGuard<T> | undefined;
}

interface ComboboxGuardSource<T> {
	readonly items?: undefined;
	readonly isItem: ItemGuard<T>;
}

export interface ComboboxSingleSelection<T> {
	readonly multiple?: false | undefined;
	readonly value?: T | null | undefined;
	readonly defaultValue?: T | null | undefined;
	readonly onValueChange?: ((value: T | null) => void) | undefined;
}

export interface ComboboxMultipleSelection<T> {
	readonly multiple: true;
	readonly value?: readonly T[] | undefined;
	readonly defaultValue?: readonly T[] | undefined;
	readonly onValueChange?: ((value: T[]) => void) | undefined;
}

type ComboboxSelection<T> = ComboboxSingleSelection<T> | ComboboxMultipleSelection<T>;

export type ComboboxProps<T> = ComboboxBaseProps<T> &
	(ComboboxItemsSource<T> | ComboboxGuardSource<T>) &
	ComboboxSelection<T>;

export function Combobox<T = string>(props: ComboboxProps<T>): ReactElement {
	const combobox = useComboboxState({
		isMultiple: props.multiple === true,
		known: knownIn(props, props.children),
		hasItems: props.items !== undefined,
		naming: { keyOf: props.itemToStringValue, labelOf: props.itemToStringLabel },
		selected: selectedIn(props),
		defaultSelected: defaultSelectedIn(props),
		onSelectedChange: (next) => notifySelectedChange(props, next),
		open: props.open,
		defaultOpen: props.defaultOpen ?? false,
		onOpenChange: props.onOpenChange,
		autoHighlight: props.autoHighlight ?? false,
		disabled: props.disabled ?? false,
	});
	return (
		<ComboboxContext.Provider value={combobox}>
			<Popover open={combobox.isOpen} onOpenChange={combobox.setOpen} placement="below">
				{props.children}
			</Popover>
		</ComboboxContext.Provider>
	);
}

function knownIn<T>(source: ComboboxItemsSource<T> | ComboboxGuardSource<T>, children: ReactNode): readonly T[] {
	if (source.items !== undefined) return source.items;
	// TRADE-OFF: items are counted by walking the tree, so one wrapped in a component of the caller's is not counted for ComboboxEmpty
	return itemValuesIn(children, isComboboxItem).filter(source.isItem);
}

function selectedIn<T>(props: ComboboxSelection<T>): readonly T[] | undefined {
	if (props.multiple === true) return props.value;
	return props.value === undefined ? undefined : listOf(props.value);
}

function defaultSelectedIn<T>(props: ComboboxSelection<T>): readonly T[] {
	if (props.multiple === true) return props.defaultValue ?? [];
	return listOf(props.defaultValue);
}

function listOf<T>(value: T | null | undefined): readonly T[] {
	return value === null || value === undefined ? [] : [value];
}

function notifySelectedChange<T>(props: ComboboxSelection<T>, next: readonly T[]): void {
	if (props.multiple === true) return props.onValueChange?.([...next]);
	props.onValueChange?.(next[0] ?? null);
}

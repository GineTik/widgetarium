import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useComboboxState } from "../hooks/use-combobox-state";
import { asCallerItems, itemValuesIn, stringOfItem } from "../utils/combobox";
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
	readonly items?: readonly T[] | undefined;
	readonly itemToStringValue?: ((item: T) => string) | undefined;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean | undefined;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly autoHighlight?: boolean | undefined;
	readonly disabled?: boolean | undefined;
	readonly children?: ReactNode;
}

export interface ComboboxSingleProps<T> extends ComboboxBaseProps<T> {
	readonly multiple?: false | undefined;
	readonly value?: T | null | undefined;
	readonly defaultValue?: T | null | undefined;
	readonly onValueChange?: ((value: T | null) => void) | undefined;
}

export interface ComboboxMultipleProps<T> extends ComboboxBaseProps<T> {
	readonly multiple: true;
	readonly value?: readonly T[] | undefined;
	readonly defaultValue?: readonly T[] | undefined;
	readonly onValueChange?: ((value: T[]) => void) | undefined;
}

export type ComboboxProps<T> = ComboboxSingleProps<T> | ComboboxMultipleProps<T>;

export function Combobox<T = string>(props: ComboboxProps<T>): ReactElement {
	const stringOf = (item: unknown): string => {
		const [typed] = asCallerItems<T>([item]);
		return props.itemToStringValue && typed !== undefined ? props.itemToStringValue(typed) : stringOfItem(item);
	};
	const combobox = useComboboxState({
		isMultiple: props.multiple === true,
		items: props.items,
		// TRADE-OFF: items are counted by walking the tree, so one wrapped in a component of the caller's is not counted for ComboboxEmpty
		childValues: props.items ? [] : itemValuesIn(props.children, isComboboxItem),
		stringOf,
		selected: selectedOf(props.value),
		defaultSelected: selectedOf(props.defaultValue) ?? [],
		onSelectedChange: (next) => reportSelected(props, next),
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

function selectedOf(value: unknown): readonly unknown[] | undefined {
	if (value === undefined) return undefined;
	if (value === null) return [];
	return Array.isArray(value) ? value : [value];
}

function reportSelected<T>(props: ComboboxProps<T>, next: readonly unknown[]): void {
	const typed = asCallerItems<T>(next);
	if (props.multiple === true) props.onValueChange?.(typed);
	else props.onValueChange?.(typed[0] ?? null);
}

import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement, ReactNode } from "react";
import { cn } from "../utils/cn";
import { drawEach, isText } from "../utils/combobox";
import type { ItemGuard, ItemsRender } from "../utils/combobox";
import { useCombobox } from "./combobox-context";

type ComboboxListBase = Omit<HTMLAttributes<HTMLDivElement>, "children">;

interface ComboboxTextListProps extends ComboboxListBase {
	readonly isItem?: undefined;
	readonly children?: ItemsRender<string>;
}

interface ComboboxTypedListProps<T> extends ComboboxListBase {
	readonly isItem: ItemGuard<T>;
	readonly children?: ItemsRender<T>;
}

export type ComboboxListProps<T> = ComboboxTextListProps | ComboboxTypedListProps<T>;

export function ComboboxList<T = string>(props: ComboboxListProps<T>): ReactElement {
	const { className, children: _children, isItem: _isItem, ...rest } = props;
	const combobox = useCombobox();
	return (
		<div
			role="listbox"
			id={combobox.listId}
			aria-multiselectable={combobox.isMultiple || undefined}
			data-slot="combobox-list"
			data-empty={combobox.isEmpty ? "" : undefined}
			{...rest}
			className={cn("wg-kit-combobox-list", className)}
		>
			{drawnItemsOf(props, combobox.filteredItems)}
		</div>
	);
}

function drawnItemsOf<T>(props: ComboboxListProps<T>, items: readonly unknown[]): ReactNode {
	if (props.isItem) return drawEach(items.filter(props.isItem), props.children);
	return drawEach(items.filter(isText), props.children);
}

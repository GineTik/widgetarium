import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { isText } from "../utils/combobox";
import type { ItemGuard } from "../utils/combobox";
import { useCombobox } from "./combobox-context";

type ValuesRender<X> = ReactNode | ((values: X[]) => ReactNode);

interface ComboboxValueBase {
	readonly placeholder?: ReactNode;
}

interface ComboboxTextValueProps extends ComboboxValueBase {
	readonly isItem?: undefined;
	readonly children?: ValuesRender<string>;
}

interface ComboboxTypedValueProps<T> extends ComboboxValueBase {
	readonly isItem: ItemGuard<T>;
	readonly children?: ValuesRender<T>;
}

export type ComboboxValueProps<T> = ComboboxTextValueProps | ComboboxTypedValueProps<T>;

export function ComboboxValue<T = string>(props: ComboboxValueProps<T>): ReactElement {
	const combobox = useCombobox();
	const shown = combobox.selectedKeys.map(combobox.labelOf).join(", ");
	const drawn = drawnValuesOf(props, combobox.selectedItems) ?? (shown || props.placeholder);
	return (
		<span data-slot="combobox-value" data-placeholder={shown === "" ? "" : undefined} className="wg-kit-combobox-value">
			{drawn}
		</span>
	);
}

function drawnValuesOf<T>(props: ComboboxValueProps<T>, selected: readonly unknown[]): ReactNode {
	if (props.isItem) return drawValues(selected.filter(props.isItem), props.children);
	return drawValues(selected.filter(isText), props.children);
}

function drawValues<X>(values: X[], render: ValuesRender<X>): ReactNode {
	return typeof render === "function" ? render(values) : render;
}

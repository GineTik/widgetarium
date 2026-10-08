import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { optionIdOf } from "../utils/combobox";
import { warnOnce } from "../utils/surface";
import { useCombobox } from "./combobox-context";

export interface ComboboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	readonly value: unknown;
	readonly disabled?: boolean | undefined;
}

const TICK_PX = 16;

export function ComboboxItem({
	value,
	disabled,
	className,
	children,
	...rest
}: ComboboxItemProps): ReactElement | null {
	const combobox = useCombobox();
	const key = combobox.keyOf(value);
	if (key === null) {
		warnOnce("a ComboboxItem's value is neither in the Combobox's items nor passes its isItem, so it is not drawn");
		return null;
	}
	if (!combobox.hasItems && !combobox.matches(combobox.labelOf(key))) return null;
	const isSelected = combobox.isSelected(key);
	return (
		<div
			role="option"
			id={optionIdOf(combobox.listId, key)}
			data-slot="combobox-item"
			data-key={key}
			aria-selected={isSelected}
			aria-disabled={disabled || undefined}
			data-disabled={disabled ? "" : undefined}
			data-selected={isSelected ? "" : undefined}
			data-highlighted={combobox.highlighted === key ? "" : undefined}
			{...rest}
			className={cn("wg-kit-combobox-item", className)}
			onPointerEnter={(event) => {
				rest.onPointerEnter?.(event);
				combobox.highlight(key);
			}}
			onMouseDown={(event) => {
				rest.onMouseDown?.(event);
				event.preventDefault();
			}}
			onClick={(event) => {
				rest.onClick?.(event);
				if (!disabled) combobox.choose(key);
			}}
		>
			{children}
			{isSelected ? <Icon name="tick" size={TICK_PX} className="wg-kit-combobox-tick" /> : null}
		</div>
	);
}

export function isComboboxItem(type: unknown): boolean {
	return type === ComboboxItem;
}

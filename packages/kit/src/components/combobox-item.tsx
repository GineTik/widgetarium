import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { optionIdOf } from "../utils/combobox";
import { warnOnce } from "../utils/surface";
import { useCombobox } from "./combobox-context";
import type { ComboboxState } from "./combobox-context";

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
			{...optionMarksOf({ disabled, isSelected, isHighlighted: combobox.highlighted === key })}
			{...rest}
			{...pressesOf({ own: rest, combobox, itemKey: key, disabled })}
			className={cn("wg-kit-combobox-item", className)}
		>
			{children}
			{isSelected ? <Icon name="tick" size={TICK_PX} className="wg-kit-combobox-tick" /> : null}
		</div>
	);
}

export function isComboboxItem(type: unknown): boolean {
	return type === ComboboxItem;
}

interface OptionMarksAsk {
	readonly disabled: boolean | undefined;
	readonly isSelected: boolean;
	readonly isHighlighted: boolean;
}

function optionMarksOf({ disabled, isSelected, isHighlighted }: OptionMarksAsk): HTMLAttributes<HTMLDivElement> {
	return {
		"aria-disabled": disabled || undefined,
		...markIf("data-disabled", disabled),
		...markIf("data-selected", isSelected),
		...markIf("data-highlighted", isHighlighted),
	};
}

function markIf(attribute: string, isOn: boolean | undefined): Readonly<Record<string, string>> {
	if (!isOn) return {};
	return { [attribute]: "" };
}

interface PressesAsk {
	readonly own: ItemPresses;
	readonly combobox: ComboboxState;
	readonly itemKey: string;
	readonly disabled: boolean | undefined;
}

type ItemPresses = Pick<HTMLAttributes<HTMLDivElement>, "onPointerEnter" | "onMouseDown" | "onClick">;

function pressesOf({ own, combobox, itemKey, disabled }: PressesAsk): ItemPresses {
	return {
		onPointerEnter: (event) => {
			own.onPointerEnter?.(event);
			combobox.highlight(itemKey);
		},
		onMouseDown: (event) => {
			own.onMouseDown?.(event);
			event.preventDefault();
		},
		onClick: (event) => {
			own.onClick?.(event);
			if (!disabled) combobox.choose(itemKey);
		},
	};
}

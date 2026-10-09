import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useCheckToggle } from "../hooks/use-check-toggle";
import type { CheckedState } from "../hooks/use-check-toggle";
import { Icon } from "../icons/icon";
import { MenuIndicatedItem } from "./menu-indicated-item";
import type { IndicatedKind } from "./menu-indicated-item";

export type { CheckedState } from "../hooks/use-check-toggle";

export interface MenuCheckboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect" | "defaultChecked"> {
	readonly checked?: CheckedState | undefined;
	readonly defaultChecked?: CheckedState | undefined;
	readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly inset?: boolean | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

const INDICATOR_PX = 16;

export function MenuCheckboxItem({
	checked,
	defaultChecked,
	onCheckedChange,
	onSelect,
	...item
}: MenuCheckboxItemProps): ReactElement {
	const [isChecked, toggle] = useCheckToggle({ checked, defaultChecked, onCheckedChange, onSelect });
	return <MenuIndicatedItem {...item} kind={checkboxKindOf(isChecked)} onSelect={toggle} />;
}

function checkboxKindOf(checked: CheckedState): IndicatedKind {
	return {
		role: "menuitemcheckbox",
		part: "checkbox-item",
		marks: { "aria-checked": checked === "indeterminate" ? "mixed" : checked, "data-state": checkedWord(checked) },
		indicator: checked === false ? null : <Icon name={indicatorOf(checked)} size={INDICATOR_PX} />,
	};
}

function indicatorOf(checked: CheckedState): string {
	return checked === true ? "tick" : "minus";
}

function checkedWord(checked: CheckedState): string {
	if (checked === "indeterminate") return "indeterminate";
	return checked ? "checked" : "unchecked";
}

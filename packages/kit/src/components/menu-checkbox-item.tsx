import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";
import { menuItemHandlers, menuItemMarks } from "../utils/menu-item";
import { useMenu } from "./menu-context";

export type CheckedState = boolean | "indeterminate";

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
	defaultChecked = false,
	onCheckedChange,
	disabled,
	inset,
	onSelect,
	className,
	children,
	...rest
}: MenuCheckboxItemProps): ReactElement {
	const menu = useMenu();
	const [isChecked, setChecked] = useControllableState<CheckedState>({ prop: checked, defaultProp: defaultChecked });
	const toggle = (event: Event): void => {
		const next = isChecked !== true;
		setChecked(next);
		onCheckedChange?.(next);
		onSelect?.(event);
	};
	return (
		<div
			role="menuitemcheckbox"
			aria-checked={isChecked === "indeterminate" ? "mixed" : isChecked}
			data-state={checkedWord(isChecked)}
			{...rest}
			{...menuItemMarks(menu, { part: "checkbox-item", inset, disabled })}
			{...menuItemHandlers(menu, { disabled, onSelect: toggle, theirs: rest })}
			className={cn("wg-kit-menu-item is-indicated", className)}
		>
			<span className="wg-kit-menu-indicator">
				{isChecked === false ? null : <Icon name={indicatorOf(isChecked)} size={INDICATOR_PX} />}
			</span>
			{children}
		</div>
	);
}

function indicatorOf(checked: CheckedState): string {
	return checked === true ? "check" : "minus";
}

function checkedWord(checked: CheckedState): string {
	if (checked === "indeterminate") return "indeterminate";
	return checked ? "checked" : "unchecked";
}

import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { menuItemHandlers, menuItemMarks } from "../utils/menu-item";
import { useMenu, useMenuRadio } from "./menu-context";

export interface MenuRadioItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	readonly value: string;
	readonly disabled?: boolean | undefined;
	readonly inset?: boolean | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

export function MenuRadioItem({
	value,
	disabled,
	inset,
	onSelect,
	className,
	children,
	...rest
}: MenuRadioItemProps): ReactElement {
	const menu = useMenu();
	const radio = useMenuRadio();
	const isPicked = radio.value === value;
	const pick = (event: Event): void => {
		radio.setValue(value);
		onSelect?.(event);
	};
	return (
		<div
			role="menuitemradio"
			aria-checked={isPicked}
			data-state={isPicked ? "checked" : "unchecked"}
			{...rest}
			{...menuItemMarks(menu, { part: "radio-item", inset, disabled })}
			{...menuItemHandlers(menu, { disabled, onSelect: pick, theirs: rest })}
			className={cn("wg-kit-menu-item is-indicated", className)}
		>
			<span className="wg-kit-menu-indicator">{isPicked ? <span className="wg-kit-menu-dot" /> : null}</span>
			{children}
		</div>
	);
}

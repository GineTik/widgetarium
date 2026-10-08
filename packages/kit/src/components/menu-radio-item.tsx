import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useMenuRadio } from "./menu-context";
import { MenuIndicatedItem } from "./menu-indicated-item";
import type { IndicatedKind } from "./menu-indicated-item";

export interface MenuRadioItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
	readonly value: string;
	readonly disabled?: boolean | undefined;
	readonly inset?: boolean | undefined;
	readonly onSelect?: ((event: Event) => void) | undefined;
}

export function MenuRadioItem({ value, onSelect, ...item }: MenuRadioItemProps): ReactElement {
	const radio = useMenuRadio();
	const isPicked = radio.value === value;
	const pick = (event: Event): void => {
		radio.setValue(value);
		onSelect?.(event);
	};
	return <MenuIndicatedItem {...item} kind={radioKindOf(isPicked)} onSelect={pick} />;
}

function radioKindOf(isPicked: boolean): IndicatedKind {
	return {
		role: "menuitemradio",
		part: "radio-item",
		marks: { "aria-checked": isPicked, "data-state": isPicked ? "checked" : "unchecked" },
		indicator: isPicked ? <span className="wg-kit-menu-dot" /> : null,
	};
}

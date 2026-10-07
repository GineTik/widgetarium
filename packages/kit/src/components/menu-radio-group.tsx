import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { MenuRadioContext, menuSlot, useMenu } from "./menu-context";

export interface MenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

export function MenuRadioGroup({ value, defaultValue, onValueChange, ...rest }: MenuRadioGroupProps): ReactElement {
	const menu = useMenu();
	const [picked, setPicked] = useControllableState<string | undefined>({
		prop: value,
		defaultProp: defaultValue,
		onChange: (next) => {
			if (next !== undefined) onValueChange?.(next);
		},
	});
	return (
		<MenuRadioContext.Provider value={{ value: picked, setValue: setPicked }}>
			<div role="group" data-slot={menuSlot(menu, "radio-group")} {...rest} />
		</MenuRadioContext.Provider>
	);
}

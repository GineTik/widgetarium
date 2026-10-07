import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { useToggleGroup } from "./toggle-group-context";

export interface ToggleGroupItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
	readonly value: string;
}

export function ToggleGroupItem({ value, disabled, ...rest }: ToggleGroupItemProps): ReactElement {
	const group = useToggleGroup();
	const isOn = group.pressed.includes(value);
	return (
		<button
			type="button"
			data-slot="toggle-group-item"
			{...rest}
			aria-pressed={isOn}
			data-state={isOn ? "on" : "off"}
			disabled={disabled || group.disabled}
			onClick={(event) => {
				rest.onClick?.(event);
				group.toggle(value);
			}}
		/>
	);
}

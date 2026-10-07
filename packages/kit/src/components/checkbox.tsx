import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface CheckboxProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
	readonly checked?: boolean | undefined;
	readonly defaultChecked?: boolean | undefined;
	readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
	readonly label?: string | undefined;
}

const TICK_PX = 16;

export function Checkbox({
	checked,
	defaultChecked = false,
	onCheckedChange,
	label,
	className,
	...rest
}: CheckboxProps): ReactElement {
	const [isChecked, setChecked] = useControllableState({
		prop: checked,
		defaultProp: defaultChecked,
		onChange: onCheckedChange,
	});
	const look = {
		"data-slot": "checkbox",
		"data-state": isChecked ? "checked" : "unchecked",
		className: cn("wg-kit-check", className),
	};
	const tick = isChecked ? <Icon name="tick" size={TICK_PX} /> : null;
	if (isReadOnly(checked, onCheckedChange)) return <span {...look} aria-hidden="true" children={tick} />;
	return (
		<button
			{...rest}
			{...look}
			type="button"
			role="checkbox"
			aria-checked={isChecked}
			aria-label={label ?? rest["aria-label"]}
			data-disabled={rest.disabled ? "" : undefined}
			onClick={(event) => {
				rest.onClick?.(event);
				setChecked(!isChecked);
			}}
			children={tick}
		/>
	);
}

function isReadOnly(checked: boolean | undefined, onCheckedChange: CheckboxProps["onCheckedChange"]): boolean {
	return checked !== undefined && onCheckedChange === undefined;
}

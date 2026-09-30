import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";

export interface SwitchProps {
	readonly checked?: boolean | undefined;
	readonly defaultChecked?: boolean;
	readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
	readonly onChange?: ((checked: boolean) => void) | undefined;
	readonly disabled?: boolean | undefined;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
}

export function Switch({
	checked,
	defaultChecked = false,
	onCheckedChange,
	onChange,
	disabled,
	label,
	className: cls,
}: SwitchProps): ReactElement {
	const [isOn, setOn] = useControllableState({
		prop: checked === undefined ? undefined : Boolean(checked),
		defaultProp: defaultChecked,
		onChange: (next) => {
			onCheckedChange?.(next);
			onChange?.(next);
		},
	});
	return (
		<button
			type="button"
			role="switch"
			aria-checked={isOn}
			aria-label={label}
			data-state={isOn ? "checked" : "unchecked"}
			data-disabled={disabled ? "" : undefined}
			disabled={disabled}
			className={cn("wg-kit-switch", cls)}
			onClick={() => setOn(!isOn)}
		/>
	);
}

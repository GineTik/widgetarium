import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";

export function Switch({
	checked,
	defaultChecked = false,
	onCheckedChange,
	onChange,
	disabled,
	label,
	className: cls,
}: LooseProps) {
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
			aria-checked={String(isOn)}
			aria-label={label}
			data-state={isOn ? "checked" : "unchecked"}
			data-disabled={disabled ? "" : undefined}
			disabled={disabled}
			className={cn("wg-kit-switch", cls)}
			onClick={() => setOn(!isOn)}
		/>
	);
}

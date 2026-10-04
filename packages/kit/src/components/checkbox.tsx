import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "../icons/icon";
import { cn } from "../utils/cn";

export interface CheckboxProps {
	readonly checked: boolean;
	readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
}

export function Checkbox({ checked, onCheckedChange, label, className: cls }: CheckboxProps): ReactElement {
	const look = { className: cn("wg-kit-check", cls), "data-state": checked ? "checked" : "unchecked" };
	const tick = checked ? <Icon name="tick" size={16} /> : null;
	if (!onCheckedChange) return <span {...look} aria-hidden="true" children={tick} />;
	return (
		<button
			{...look}
			type="button"
			role="checkbox"
			aria-checked={checked}
			aria-label={label}
			onClick={() => onCheckedChange(!checked)}
			children={tick}
		/>
	);
}

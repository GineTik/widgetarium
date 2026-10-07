import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";

export type ToggleVariant = "default" | "outline";

export type ToggleSize = "default" | "sm" | "lg";

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
	readonly pressed?: boolean | undefined;
	readonly defaultPressed?: boolean | undefined;
	readonly onPressedChange?: ((pressed: boolean) => void) | undefined;
	readonly variant?: ToggleVariant | undefined;
	readonly size?: ToggleSize | undefined;
}

const SIZE_CLASS: Readonly<Record<ToggleSize, string>> = { default: "", sm: "is-s", lg: "is-l" };

export function Toggle({
	pressed,
	defaultPressed = false,
	onPressedChange,
	variant = "default",
	size = "default",
	className,
	...rest
}: ToggleProps): ReactElement {
	const [isOn, setOn] = useControllableState({ prop: pressed, defaultProp: defaultPressed, onChange: onPressedChange });
	return (
		<button
			type="button"
			data-slot="toggle"
			{...rest}
			aria-pressed={isOn}
			data-state={isOn ? "on" : "off"}
			data-variant={variant}
			data-size={size}
			data-disabled={rest.disabled ? "" : undefined}
			className={cn("wg-kit-toggle", SIZE_CLASS[size], variant === "outline" && "is-outline", className)}
			onClick={(event) => {
				rest.onClick?.(event);
				if (!event.defaultPrevented) setOn(!isOn);
			}}
		/>
	);
}

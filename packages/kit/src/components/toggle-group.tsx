import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { cn } from "../utils/cn";
import { ToggleGroupContext } from "./toggle-group-context";

export { ToggleGroupItem } from "./toggle-group-item";
export type { ToggleGroupItemProps } from "./toggle-group-item";

interface ToggleGroupLook extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> {
	readonly disabled?: boolean | undefined;
	readonly variant?: "default" | "outline" | undefined;
	readonly size?: "default" | "sm" | "lg" | undefined;
}

interface SingleToggleGroupProps extends ToggleGroupLook {
	readonly type?: "single" | undefined;
	readonly value?: string | undefined;
	readonly defaultValue?: string | undefined;
	readonly onValueChange?: ((value: string) => void) | undefined;
}

interface MultipleToggleGroupProps extends ToggleGroupLook {
	readonly type: "multiple";
	readonly value?: readonly string[] | undefined;
	readonly defaultValue?: readonly string[] | undefined;
	readonly onValueChange?: ((value: string[]) => void) | undefined;
}

export type ToggleGroupProps = SingleToggleGroupProps | MultipleToggleGroupProps;

const SIZE_CLASS = { default: "", sm: "is-s", lg: "is-l" };

export function ToggleGroup(props: ToggleGroupProps): ReactElement {
	const {
		type = "single",
		value,
		defaultValue,
		onValueChange,
		disabled = false,
		variant = "default",
		size = "default",
		className,
		children,
		...rest
	} = props;
	const [pressed, setPressed] = useControllableState<readonly string[]>({
		prop: pressedOf(value),
		defaultProp: pressedOf(defaultValue) ?? [],
		onChange: (next) => answer(props, next),
	});
	const toggle = (item: string): void => setPressed(toggled(type, pressed, item));
	return (
		<ToggleGroupContext.Provider value={{ pressed, toggle, disabled }}>
			<div
				role="group"
				data-slot="toggle-group"
				{...rest}
				data-variant={variant}
				data-size={size}
				className={cn("wg-kit-seg", "is-toggle", SIZE_CLASS[size], variant === "outline" && "is-outline", className)}
			>
				{children}
			</div>
		</ToggleGroupContext.Provider>
	);
}

function pressedOf(value: string | readonly string[] | undefined): readonly string[] | undefined {
	if (value === undefined) return undefined;
	if (typeof value === "string") return value === "" ? [] : [value];
	return value;
}

function toggled(type: "single" | "multiple", pressed: readonly string[], value: string): readonly string[] {
	const isPressed = pressed.includes(value);
	if (type === "single") return isPressed ? [] : [value];
	return isPressed ? pressed.filter((one) => one !== value) : [...pressed, value];
}

function answer(props: ToggleGroupProps, pressed: readonly string[]): void {
	if (props.type === "multiple") props.onValueChange?.([...pressed]);
	else props.onValueChange?.(pressed[0] ?? "");
}

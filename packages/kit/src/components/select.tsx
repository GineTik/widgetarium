import { Children, createElement as h, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import type { PlacementName } from "../constants/popover";
import { useControllableState } from "../hooks/use-controllable-state";
import { Popover } from "./popover";
import { SelectContext } from "./select-context";
import { SelectItem } from "./select-item";

export { SelectContent } from "./select-content";
export { SelectItem } from "./select-item";
export { SelectTrigger } from "./select-trigger";
export { SelectValue } from "./select-value";
export type { SelectContentProps } from "./select-content";
export type { SelectItemProps } from "./select-item";
export type { SelectTriggerProps } from "./select-trigger";
export type { SelectValueProps } from "./select-value";

export interface SelectProps {
	readonly value?: unknown;
	readonly defaultValue?: unknown;
	readonly onValueChange?: ((value: unknown) => void) | undefined;
	readonly open?: boolean | undefined;
	readonly defaultOpen?: boolean;
	readonly onOpenChange?: ((open: boolean) => void) | undefined;
	readonly placement?: PlacementName;
	readonly isPortaled?: boolean;
	readonly children?: ReactNode;
}

export function Select({
	value,
	defaultValue,
	onValueChange,
	open,
	defaultOpen = false,
	onOpenChange,
	placement = "below",
	isPortaled = false,
	children,
}: SelectProps): ReactElement {
	const [selected, setSelected] = useControllableState<unknown>({
		prop: value,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const choose = (next: unknown): void => {
		setSelected(next);
		setOpen(false);
	};
	return (
		<SelectContext.Provider value={{ selected, choose, labels: labelsIn(children, new Map()) }}>
			<Popover open={isOpen} onOpenChange={setOpen} placement={placement} isPortaled={isPortaled}>
				{children}
			</Popover>
		</SelectContext.Provider>
	);
}

function labelsIn(children: ReactNode, found: Map<unknown, ReactNode>): Map<unknown, ReactNode> {
	Children.forEach(children, (child) => {
		if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
		if (child.type === SelectItem) found.set(child.props.value, child.props.children);
		else labelsIn(child.props.children, found);
	});
	return found;
}

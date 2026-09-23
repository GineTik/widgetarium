import { Children, createContext, createElement as h, isValidElement, useContext } from "react";
import type { ReactNode } from "react";
import { useControllableState } from "../hooks/use-controllable-state";
import { Icon } from "../icons/icon";
import type { LooseProps } from "../types";
import { cx } from "../utils/cx";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverItem, PopoverTrigger } from "./popover";

const SelectContext = createContext(null);

function useSelect() {
	const select = useContext(SelectContext);
	if (!select) throw new Error("a select part stands outside a Select");
	return select;
}

export function Select({
	value,
	defaultValue,
	onValueChange,
	open,
	defaultOpen = false,
	onOpenChange,
	placement = "below",
	children,
}: LooseProps) {
	const [selected, setSelected] = useControllableState({
		prop: value,
		defaultProp: defaultValue,
		onChange: onValueChange,
	});
	const [isOpen, setOpen] = useControllableState({ prop: open, defaultProp: defaultOpen, onChange: onOpenChange });
	const choose = (next) => {
		setSelected(next);
		setOpen(false);
	};
	return (
		<SelectContext.Provider value={{ selected, choose, labels: labelsIn(children) }}>
			<Popover open={isOpen} onOpenChange={setOpen} placement={placement}>
				{children}
			</Popover>
		</SelectContext.Provider>
	);
}

export function SelectTrigger({ asChild = false, children, className: cls, ...props }: LooseProps) {
	if (asChild)
		return (
			<PopoverTrigger asChild aria-haspopup="listbox" {...props}>
				{children}
			</PopoverTrigger>
		);
	return (
		<PopoverTrigger asChild aria-haspopup="listbox">
			<Button {...props} className={cx("wg-kit-select-trigger", cls)}>
				{children}
				<Icon name="chevron-down" size={16} className="wg-kit-select-chevron" />
			</Button>
		</PopoverTrigger>
	);
}

export function SelectValue({ placeholder, className: cls }: LooseProps) {
	const { selected, labels } = useSelect();
	const isChosen = labels.has(selected);
	return (
		<span className={cx("wg-kit-select-value", cls)} data-placeholder={isChosen ? undefined : ""}>
			{isChosen ? labels.get(selected) : placeholder}
		</span>
	);
}

export function SelectContent({ className: cls, children }: LooseProps) {
	return (
		<PopoverContent className={cx("wg-kit-select-content", cls)}>
			<div role="listbox">{children}</div>
		</PopoverContent>
	);
}

export function SelectItem({ value, disabled, className: cls, children }: LooseProps) {
	const { selected, choose } = useSelect();
	const isChosen = Object.is(selected, value);
	return (
		<PopoverItem
			role="option"
			aria-selected={String(isChosen)}
			checked={isChosen}
			disabled={disabled}
			className={cx("wg-kit-select-item", cls)}
			onClick={() => choose(value)}
		>
			{children}
		</PopoverItem>
	);
}

function labelsIn(children: ReactNode, found = new Map()) {
	Children.forEach(children, (child) => {
		if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
		if (child.type === SelectItem) found.set(child.props.value, child.props.children);
		else labelsIn(child.props.children, found);
	});
	return found;
}

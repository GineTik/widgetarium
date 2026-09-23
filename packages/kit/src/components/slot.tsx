import { Children, cloneElement, createElement as h, Fragment, isValidElement } from "react";
import type { ReactElement, ReactNode, Ref } from "react";
import type { LooseProps } from "../types";
import { domPropsOf } from "../utils/dom-props";

export function Slot({ children, ...slotProps }: LooseProps) {
	const childArray = Children.toArray(children);
	const slottable = childArray.find(isSlottable) as ReactElement<{ children?: ReactNode }> | undefined;
	if (!slottable) return <SlotClone {...slotProps} children={children} />;
	const slotted = slottable.props.children;
	if (!isValidElement<{ children?: ReactNode }>(slotted)) return null;
	const around = childArray.map((child) => (child === slottable ? slotted.props.children : child));
	return <SlotClone {...slotProps}>{cloneElement(slotted, undefined, ...around)}</SlotClone>;
}

export function Slottable({ children }: { children?: ReactNode }) {
	return <>{children}</>;
}

export function slotted(tag: string, classOf: (props: LooseProps) => string, name: string) {
	function Part({ asChild = false, children, ...props }: LooseProps) {
		const Comp = asChild ? Slot : tag;
		return (
			<Comp {...domPropsOf(props)} className={classOf(props)}>
				{children}
			</Comp>
		);
	}
	Part.displayName = name;
	return Part;
}

export function composeRefs<T>(...refs: Array<Ref<T> | undefined>) {
	return (node: T) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) (ref as { current: T }).current = node;
		}
	};
}

function SlotClone({ children, ...slotProps }: LooseProps) {
	if (!isValidElement<LooseProps>(children)) return null;
	const childProps = children.props;
	const ref = slotProps.ref ? composeRefs(slotProps.ref, childProps.ref) : childProps.ref;
	return cloneElement(children, { ...mergedProps(slotProps, childProps), ref });
}

const isSlottable = (child) => isValidElement(child) && child.type === Slottable;
const isHandler = (name: string) => /^on[A-Z]/.test(name);

function mergedProps(slotProps: LooseProps, childProps: LooseProps) {
	const overridden = { ...childProps };
	for (const name of Object.keys(childProps)) {
		const fromSlot = slotProps[name];
		const fromChild = childProps[name];
		if (isHandler(name) && fromSlot && fromChild) overridden[name] = composedHandler(fromChild, fromSlot);
		else if (isHandler(name) && fromSlot) overridden[name] = fromSlot;
		else if (name === "style") overridden[name] = { ...fromSlot, ...fromChild };
		else if (name === "className") overridden[name] = [fromSlot, fromChild].filter(Boolean).join(" ");
	}
	return { ...slotProps, ...overridden };
}

function composedHandler(first, second) {
	return (...args) => {
		const result = first(...args);
		second(...args);
		return result;
	};
}

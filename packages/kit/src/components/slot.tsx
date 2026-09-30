import { Children, cloneElement, createElement as h, isValidElement } from "react";
import type { ReactElement, ReactNode, Ref, RefCallback, RefObject } from "react";
import { Slottable } from "./slottable";

export { Slottable } from "./slottable";
export { createSlotPart } from "./create-slot-part";

export interface SlotProps {
	readonly children?: ReactNode;
	readonly [prop: string]: unknown;
}

type AnyProps = Readonly<Record<string, unknown>>;

type Handler = (...args: readonly unknown[]) => unknown;

export function Slot({ children, ...slotProps }: SlotProps): ReactNode {
	const childArray = Children.toArray(children);
	const slottable = childArray.find(isSlottable);
	if (!slottable) return <SlotClone {...slotProps} children={children} />;
	const slotted = slottable.props.children;
	if (!isValidElement<{ children?: ReactNode }>(slotted)) return null;
	const around = childArray.map((child) => (child === slottable ? slotted.props.children : child));
	return <SlotClone {...slotProps}>{cloneElement(slotted, undefined, ...around)}</SlotClone>;
}

export function composeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
	return (node: T) => {
		for (const ref of refs) {
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		}
	};
}

function SlotClone({ children, ...slotProps }: SlotProps): ReactNode {
	if (!isValidElement<AnyProps>(children)) return null;
	const childProps = children.props;
	const slotRef = refIn(slotProps["ref"]);
	const childRef = refIn(childProps["ref"]);
	const ref = slotRef ? composeRefs(slotRef, childRef) : childRef;
	return cloneElement(children, { ...mergeProps(slotProps, childProps), ref });
}

function isSlottable(child: unknown): child is ReactElement<{ children?: ReactNode }> {
	return isValidElement(child) && child.type === Slottable;
}

function isHandlerName(name: string): boolean {
	return /^on[A-Z]/.test(name);
}

function isHandler(value: unknown): value is Handler {
	return typeof value === "function";
}

function refIn(held: unknown): Ref<unknown> | undefined {
	if (isRefCallback(held) || isRefObject(held)) return held;
	return undefined;
}

function isRefCallback(held: unknown): held is RefCallback<unknown> {
	return typeof held === "function";
}

function isRefObject(held: unknown): held is RefObject<unknown> {
	return typeof held === "object" && held !== null && "current" in held;
}

function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
	const overridden: Record<string, unknown> = { ...childProps };
	for (const name of Object.keys(childProps)) overridden[name] = mergedProp(name, slotProps[name], childProps[name]);
	return { ...slotProps, ...overridden };
}

function mergedProp(name: string, fromSlot: unknown, fromChild: unknown): unknown {
	if (isHandlerName(name) && isHandler(fromSlot) && isHandler(fromChild)) return composeHandlers(fromChild, fromSlot);
	if (isHandlerName(name) && fromSlot) return fromSlot;
	if (name === "style") return { ...spreadable(fromSlot), ...spreadable(fromChild) };
	if (name === "className") return [fromSlot, fromChild].filter(Boolean).join(" ");
	return fromChild;
}

function spreadable(held: unknown): object {
	return typeof held === "object" && held !== null ? held : {};
}

function composeHandlers(first: Handler, second: Handler): Handler {
	return (...args) => {
		const result = first(...args);
		second(...args);
		return result;
	};
}

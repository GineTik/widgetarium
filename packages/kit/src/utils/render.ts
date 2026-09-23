import { Children, cloneElement, createElement as h } from "react";
import type { ReactElement } from "react";
import { cx } from "./cx";

const OWN_PROPS = ["variant", "size", "tone", "block", "selected", "pressable", "mode", "surface", "lift"];

export function render(tag, props, resolvedClass) {
	const { asChild, children, className: cls, ...rest } = props;
	for (const name of OWN_PROPS) delete rest[name];
	if (!asChild) return h(tag, { ...rest, className: resolvedClass }, children);
	const only = Children.toArray(children)[0] as ReactElement<Record<string, any>>;
	if (!only || typeof only !== "object") return h(tag, { ...rest, className: resolvedClass }, children);
	const style = rest.style || only.props.style ? { ...rest.style, ...only.props.style } : undefined;
	return cloneElement(only, { ...rest, style, className: cx(resolvedClass, only.props.className) });
}

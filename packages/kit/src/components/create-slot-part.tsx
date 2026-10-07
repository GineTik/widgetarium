import { createElement as h } from "react";
import type { FunctionComponent, HTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { slotNameOf } from "../utils/slot-name";
import { Slot } from "./slot";

export interface SlotPartProps extends HTMLAttributes<HTMLElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export type SlotPartTag =
	| "div"
	| "span"
	| "p"
	| "h2"
	| "ul"
	| "li"
	| "table"
	| "thead"
	| "tbody"
	| "tfoot"
	| "tr"
	| "th"
	| "td"
	| "caption"
	| "label"
	| "fieldset"
	| "legend"
	| "main"
	| "header"
	| "footer"
	| "kbd";

export function createSlotPart<P extends SlotPartProps = SlotPartProps>(
	tag: SlotPartTag,
	classOf: (props: P) => string,
	name: string,
): FunctionComponent<P> {
	const slot = slotNameOf(name);
	function Part(props: P): ReactElement {
		return h(
			props.asChild ? Slot : tag,
			{ "data-slot": slot, ...domPropsOf(props), className: classOf(props) },
			props.children,
		);
	}
	Part.displayName = name;
	return Part;
}

export function classedSlotPart(tag: SlotPartTag, baseClass: string, name: string): FunctionComponent<SlotPartProps> {
	return createSlotPart(tag, (props) => cn(baseClass, props.className), name);
}

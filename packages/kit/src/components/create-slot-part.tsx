import { createElement as h } from "react";
import type { FunctionComponent, HTMLAttributes, ReactElement, Ref } from "react";
import { domPropsOf } from "../utils/dom-props";
import { Slot } from "./slot";

export interface SlotPartProps extends HTMLAttributes<HTMLElement> {
	readonly asChild?: boolean;
	readonly ref?: Ref<HTMLElement>;
}

export type SlotPartTag =
	"div" | "span" | "p" | "h2" | "ul" | "li" | "table" | "thead" | "tbody" | "tfoot" | "tr" | "th" | "td" | "caption";

export function createSlotPart<P extends SlotPartProps = SlotPartProps>(
	tag: SlotPartTag,
	classOf: (props: P) => string,
	name: string,
): FunctionComponent<P> {
	function Part(props: P): ReactElement {
		return h(props.asChild ? Slot : tag, { ...domPropsOf(props), className: classOf(props) }, props.children);
	}
	Part.displayName = name;
	return Part;
}

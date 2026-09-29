import { createElement as h } from "react";
import type { LooseProps } from "../types";
import { domPropsOf } from "../utils/dom-props";
import { Slot } from "./slot";

export function createSlotPart(tag: string, classOf: (props: LooseProps) => string, name: string) {
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

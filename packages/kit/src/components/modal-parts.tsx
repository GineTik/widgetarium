import { createElement as h, useContext } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import { slotNameOf } from "../utils/slot-name";
import type { SlotPartProps } from "./create-slot-part";
import { ModalIdsContext } from "./modal-ids-context";
import type { ModalIds } from "../constants/overlays";
import { Slot } from "./slot";

export { modalClose } from "./modal-close";
export { modalTrigger } from "./modal-trigger";

export type ModalTextRole = keyof ModalIds;

export function modalTextPart(
	tag: "h2" | "p",
	baseClass: string,
	name: string,
	role: ModalTextRole,
): FunctionComponent<SlotPartProps> {
	const slot = slotNameOf(name);
	function Part(props: SlotPartProps): ReactElement {
		const ids = useContext(ModalIdsContext);
		return h(
			props.asChild ? Slot : tag,
			{ id: ids[role], "data-slot": slot, ...domPropsOf(props), className: cn(baseClass, props.className) },
			props.children,
		);
	}
	Part.displayName = name;
	return Part;
}

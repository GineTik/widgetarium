import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { slotNameOf } from "../utils/slot-name";
import { DialogClose } from "./dialog-close";
import type { DialogCloseProps } from "./dialog-close";

export function createModalClose(name: string, look: DialogCloseProps = {}): FunctionComponent<DialogCloseProps> {
	const slot = slotNameOf(name);
	function Close(props: DialogCloseProps): ReactElement {
		return <DialogClose {...look} {...props} data-slot={slot} />;
	}
	Close.displayName = name;
	return Close;
}

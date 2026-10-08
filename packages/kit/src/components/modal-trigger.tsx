import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { slotNameOf } from "../utils/slot-name";
import { DialogTrigger } from "./dialog-trigger";
import type { DialogTriggerProps } from "./dialog-trigger";

export function createModalTrigger(name: string): FunctionComponent<DialogTriggerProps> {
	const slot = slotNameOf(name);
	function Trigger(props: DialogTriggerProps): ReactElement {
		return <DialogTrigger {...props} data-slot={slot} />;
	}
	Trigger.displayName = name;
	return Trigger;
}

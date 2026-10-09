import { createElement as h } from "react";
import type { FunctionComponent, ReactElement } from "react";
import { cn } from "../utils/cn";
import { pressFieldControl } from "../utils/label-press";
import { createSlotPart } from "./create-slot-part";
import type { LabelProps } from "./label";

export function createPressingLabel(baseClass: string, name: string): FunctionComponent<LabelProps> {
	const Part = createSlotPart<LabelProps>("label", (props) => cn(baseClass, props.className), name);
	function PressingLabel(props: LabelProps): ReactElement {
		return (
			<Part
				{...props}
				onClick={(event) => {
					props.onClick?.(event);
					pressFieldControl(event);
				}}
			/>
		);
	}
	PressingLabel.displayName = name;
	return PressingLabel;
}

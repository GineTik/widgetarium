import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export { InputGroupAddon } from "./input-group-addon";
export { InputGroupButton } from "./input-group-button";
export { InputGroupInput } from "./input-group-input";
export { InputGroupText } from "./input-group-text";
export { InputGroupTextarea } from "./input-group-textarea";
export type { InputGroupAddonAlign, InputGroupAddonProps } from "./input-group-addon";
export type { InputGroupButtonProps, InputGroupButtonSize } from "./input-group-button";
export type { InputGroupInputProps } from "./input-group-input";
export type { InputGroupTextareaProps } from "./input-group-textarea";

export function InputGroup({ className, ...rest }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return <div role="group" data-slot="input-group" {...rest} className={cn("wg-kit-input-group", className)} />;
}

import { createElement as h } from "react";
import type { ButtonHTMLAttributes, ReactElement, Ref } from "react";
import { cn } from "../utils/cn";
import { renderedElement } from "../utils/render-prop";
import type { RenderProp } from "../utils/render-prop";
import { Slot } from "./slot";

export interface AttachmentTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	readonly render?: RenderProp | undefined;
	readonly ref?: Ref<HTMLButtonElement>;
}

export function AttachmentTrigger({ render, className, children, ...rest }: AttachmentTriggerProps): ReactElement {
	const look = { "data-slot": "attachment-trigger", className: cn("wg-kit-attachment-trigger", className) };
	if (render !== undefined) return <Slot {...rest} {...look} children={renderedElement(render, children)} />;
	return <button type="button" {...rest} {...look} children={children} />;
}

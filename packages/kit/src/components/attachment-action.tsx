import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Button } from "./button";
import type { ButtonProps } from "./button";

export function AttachmentAction({
	size = "icon-sm",
	variant = "ghost",
	className,
	...rest
}: ButtonProps): ReactElement {
	return (
		<Button
			data-slot="attachment-action"
			size={size}
			variant={variant}
			{...rest}
			className={cn("wg-kit-attachment-action", className)}
		/>
	);
}

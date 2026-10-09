import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { DISMISSED_BY_ESCAPE, ModalLayer } from "./modal-layer";

export interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly size?: "default" | "sm" | undefined;
}

export function AlertDialogContent({ size = "default", className, ...rest }: AlertDialogContentProps): ReactElement {
	return (
		<ModalLayer
			kind="alert-dialog"
			dismissal={DISMISSED_BY_ESCAPE}
			data-size={size}
			{...rest}
			className={cn(size === "sm" && "is-sm", className)}
		/>
	);
}

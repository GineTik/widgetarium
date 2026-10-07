import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { ModalLayer } from "./modal-layer";

export interface AlertDialogContentProps extends HTMLAttributes<HTMLDivElement> {
	readonly size?: "default" | "sm" | undefined;
}

export function AlertDialogContent({ size = "default", className, ...rest }: AlertDialogContentProps): ReactElement {
	return (
		<ModalLayer
			kind="alert-dialog"
			closesOnScrim={false}
			data-size={size}
			{...rest}
			className={cn(size === "sm" && "is-sm", className)}
		/>
	);
}

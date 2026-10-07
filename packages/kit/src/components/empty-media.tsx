import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";

export interface EmptyMediaProps extends HTMLAttributes<HTMLDivElement> {
	readonly variant?: "default" | "icon" | undefined;
}

export function EmptyMedia({ variant = "default", className, ...rest }: EmptyMediaProps): ReactElement {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			{...rest}
			className={cn("wg-kit-empty-media", variant === "icon" && "is-icon", className)}
		/>
	);
}

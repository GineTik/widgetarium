import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@widgetarium/kit";

export interface DialogContentProps {
	readonly className?: string;
	readonly width?: number | string;
	readonly children?: ReactNode;
}

export function DialogContent({ className, width, children }: DialogContentProps): ReactElement {
	return h(
		"div",
		{
			className: cn("wg-dialog", className),
			role: "dialog",
			"aria-modal": "true",
			tabIndex: -1,
			style: width ? { maxWidth: width } : undefined,
		},
		children,
	);
}

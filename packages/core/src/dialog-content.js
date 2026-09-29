import { createElement as h } from "react";
import { cn } from "@widgetarium/kit";

export function DialogContent({ className: cls, width, children }) {
	return h(
		"div",
		{
			className: cn("wg-dialog", cls),
			role: "dialog",
			"aria-modal": "true",
			tabIndex: -1,
			style: width ? { maxWidth: width } : null,
		},
		children,
	);
}

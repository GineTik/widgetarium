import { h } from "preact";

// Every widget starts here. The root is the one element that decides how the
// widget sits on the board, so those decisions cannot be forgotten or contradicted.
export function WidgetRoot({ roundedType = "base", fillType = "fill", fill, className, children, ...rest }) {
	return h(
		"div",
		{
			...rest,
			class: `wg-widget-root${className ? ` ${className}` : ""}`,
			"data-rounded": roundedType,
			"data-fill": fillType,
			style: fill ? { ...(rest.style ?? {}), "--wg-surface-fill": fill } : rest.style,
		},
		children,
	);
}

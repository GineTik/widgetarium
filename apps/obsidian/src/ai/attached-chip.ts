import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export interface Attached {
	readonly label: string;
	readonly onClear: () => void;
}

const STOP_CHANGING = "Stop changing it";

export function AttachedChip({ attached }: { readonly attached: Attached }): ReactElement {
	const clear = {
		type: "button",
		className: "wg-ai-attached-clear",
		"aria-label": STOP_CHANGING,
		onClick: attached.onClear,
	};
	return h("span", { className: "wg-ai-target is-attached" }, [
		h(Icon, { key: "mark", name: "pencil", size: 14 }),
		h("span", { key: "name", className: "wg-ai-target-name" }, attached.label),
		h("button", { key: "clear", ...clear }, h(Icon, { name: "x", size: 12 })),
	]);
}

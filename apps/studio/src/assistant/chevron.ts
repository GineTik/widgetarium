import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon } from "@widgetarium/kit";

export function Chevron({ isOpen }: { readonly isOpen: boolean }): ReactElement {
	return h(Icon, {
		name: "chevron",
		size: 12,
		className: isOpen ? "wg-studio-ai-chevron is-open" : "wg-studio-ai-chevron",
	});
}

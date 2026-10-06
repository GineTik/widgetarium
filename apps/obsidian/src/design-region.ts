import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface RegionProps {
	readonly title: string;
	readonly count: number;
	readonly children?: ReactNode;
}

const COUNTED = "{title} · {count}";

export function Region({ title, count, children }: RegionProps): ReactElement {
	return h("section", { className: "wg-design-region" }, [
		h(
			"header",
			{ key: "head", className: "wg-design-region-head" },
			COUNTED.replace("{title}", title).replace("{count}", String(count)),
		),
		h("div", { key: "body", className: "wg-design-region-body" }, children),
	]);
}

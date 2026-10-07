import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface RegionProps {
	readonly title: string;
	readonly count: number;
	readonly aside?: ReactNode;
	readonly children?: ReactNode;
}

const COUNTED = "{title} · {count}";

export function Region({ title, count, aside, children }: RegionProps): ReactElement {
	return h("section", { className: "wg-design-region" }, [
		h("header", { key: "head", className: "wg-design-region-head" }, [
			h("span", { key: "title" }, COUNTED.replace("{title}", title).replace("{count}", String(count))),
			aside ?? null,
		]),
		h("div", { key: "body", className: "wg-design-region-body" }, children),
	]);
}

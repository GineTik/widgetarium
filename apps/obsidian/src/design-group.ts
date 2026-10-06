import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";

export interface GroupProps {
	readonly title: string;
	readonly sub?: string | undefined;
	readonly badge?: string | undefined;
	readonly children?: ReactNode;
}

export function Group({ title, sub, badge, children }: GroupProps): ReactElement {
	return h("div", { className: "wg-design-group" }, [
		h("header", { key: "head", className: "wg-design-group-head" }, [
			h("b", { key: "title" }, title),
			badge ? h("span", { key: "badge", className: "wg-design-badge" }, badge) : null,
			sub ? h("span", { key: "sub", className: "wg-design-group-sub" }, sub) : null,
		]),
		h("div", { key: "body", className: "wg-design-group-body" }, children),
	]);
}

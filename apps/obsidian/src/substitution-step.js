import { createElement as h } from "react";

export function Step({ index, name, hint, children }) {
	return h("section", { className: "wg-sub-step" }, [
		h("header", { key: "label", className: "wg-sub-step-label" }, [
			h("span", { key: "no", className: "wg-sub-step-no" }, String(index)),
			h("span", { key: "said", className: "wg-sub-step-said" }, [
				h("h4", { key: "name", className: "wg-sub-step-name" }, name),
				h("p", { key: "hint", className: "wg-sub-step-hint" }, hint),
			]),
		]),
		h("div", { key: "body", className: "wg-sub-step-body" }, children),
	]);
}

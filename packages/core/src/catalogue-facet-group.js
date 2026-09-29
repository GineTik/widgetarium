import { createElement as h } from "react";
import { Field, Icon } from "@widgetarium/kit";

export function FacetGroup({ label, placeholder, query, onQuery, children }) {
	return h("div", { className: "wg-kit-side-group wg-cat-facet" }, [
		h("span", { className: "wg-kit-side-label", key: "label" }, label),
		h(Field, {
			key: "search",
			block: true,
			size: "s",
			className: "wg-cat-facet-search",
			icon: h(Icon, { name: "search", size: 14 }),
			placeholder,
			value: query,
			onInput: (event) => onQuery(event.target.value),
		}),
		children,
	]);
}

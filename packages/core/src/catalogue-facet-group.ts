import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { Field, Icon } from "@widgetarium/kit";

export interface FacetGroupProps {
	readonly label: ReactNode;
	readonly placeholder: string;
	readonly query: string;
	readonly onQuery: (query: string) => void;
	readonly children?: ReactNode;
}

export function FacetGroup({ label, placeholder, query, onQuery, children }: FacetGroupProps): ReactElement {
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
			onValueChange: onQuery,
		}),
		children,
	]);
}

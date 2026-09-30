import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, List, SidebarRow } from "@widgetarium/kit";
import type { DocPage } from "./docs.js";

export interface DocsListProps {
	readonly pages: readonly DocPage[];
	readonly page: string | null;
	readonly onOpenPage: (id: string) => void;
}

const PAGES = "Pages";

export function DocsList({ pages, page, onOpenPage }: DocsListProps): ReactElement {
	return h("div", { className: "wg-kit-side-group", key: "pages" }, [
		h("span", { className: "wg-kit-side-label", key: "label" }, PAGES),
		h(
			List,
			{ className: "wg-kit-side-list", key: "list" },
			pages.map((one) =>
				h(SidebarRow, {
					key: one.id,
					as: "button",
					className: "wg-cat-page",
					icon: h(Icon, { name: one.icon, size: 14 }),
					label: one.title,
					selected: page === one.id,
					onClick: () => onOpenPage(one.id),
				}),
			),
		),
	]);
}

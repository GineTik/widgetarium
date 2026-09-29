import { createElement as h } from "react";
import { Icon, List, SidebarRow } from "@widgetarium/kit";

const PAGES = "Pages";

export function DocsList({ pages, page, onOpenPage }) {
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

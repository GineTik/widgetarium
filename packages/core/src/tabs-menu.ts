import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Icon, Popover, PopoverItem, PopoverSeparator } from "@widgetarium/kit";
import type { TabStrip } from "./use-tab-strip.js";

const MENU_ICON_PX = 15;

export function tabsMenuOf(strip: TabStrip): ReactElement {
	const pick = (act: () => void) => (): void => {
		strip.setMenuOpen(false);
		act();
	};
	return h(
		Popover,
		{ key: "menu", trigger: menuTrigger(), isOpen: strip.isMenuOpen, onOpenChange: strip.setMenuOpen },
		[
			menuItem(
				"rename",
				"pencil",
				"Rename",
				pick(() => strip.setEditing(strip.selected)),
			),
			menuItem("add", "plus", "Add", pick(strip.add)),
			menuItem(
				"archive",
				"archive",
				"Archive",
				pick(() => strip.archive(strip.selected)),
			),
			h(PopoverSeparator, { key: "sep" }),
			menuItem(
				"list",
				"folder",
				"Archived list",
				pick(() => strip.setArchiveShown(true)),
			),
		],
	);
}

function menuTrigger(): ReactElement {
	return h(
		"button",
		{
			type: "button",
			className: "wg-kit-icon is-s is-ghost wg-tabs-more",
			title: "Tab actions",
			"aria-label": "Tab actions",
		},
		h(Icon, { name: "menu" }),
	);
}

function menuItem(key: string, icon: string, label: string, onClick: () => void): ReactElement {
	return h(PopoverItem, { key, onClick }, [h(Icon, { key: "i", name: icon, size: MENU_ICON_PX }), label]);
}

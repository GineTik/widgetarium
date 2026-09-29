import { createElement as h, useState } from "react";
import { Icon, Popover, PopoverItem, cn, iconButtonClass } from "@widgetarium/kit";

const NO_PLAYGROUND_WITHOUT_A_TILE = "not yet for inline widgets";

export function InlineMenu({ isText, onShowSource }) {
	const [isOpen, setOpen] = useState(false);
	const showSource = () => {
		setOpen(false);
		onShowSource();
	};

	return h(
		"span",
		{ className: "wg-inline-at wg-inline-shy" },
		h(
			Popover,
			{
				isOpen,
				onOpenChange: setOpen,
				placement: "below",
				trigger: h(
					"button",
					{
						className: cn("wg-inline-more", iconButtonClass({ variant: "glass", size: "s" })),
						type: "button",
						"aria-label": "More",
						title: "More",
					},
					h(Icon, { name: "dots", size: 14 }),
				),
			},
			[
				h(PopoverItem, { key: "settings", className: "wg-inline-settings", disabled: true }, [
					"Settings",
					h("span", { key: "why", className: "wg-inline-off" }, NO_PLAYGROUND_WITHOUT_A_TILE),
				]),
				h(
					PopoverItem,
					{ key: "source", className: "wg-inline-source", onClick: showSource },
					isText ? "Show the widget" : "Show the source",
				),
			],
		),
	);
}

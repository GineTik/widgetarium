import { createElement as h } from "react";
import { Icon, IconButton } from "@widgetarium/kit";

export function MountSettingsButton({ entry }) {
	const press = { size: "s", label: `Settings for ${entry.title ?? entry.name}`, onClick: enterOnPress(entry) };
	return h("div", { className: "wg-mount-actions" }, h(IconButton, press, h(Icon, { name: "settings" })));
}

// TRADE-OFF: board chrome in a layer-neutral primitive; the widget places its own mounts, so nothing above this sits between a mount and its drawn node
function enterOnPress(entry) {
	return (event) => {
		event.stopPropagation();
		entry.enter();
	};
}

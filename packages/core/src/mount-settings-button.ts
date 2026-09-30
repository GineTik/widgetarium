import { createElement as h } from "react";
import type { MouseEvent, ReactElement } from "react";
import { Icon, IconButton } from "@widgetarium/kit";
import type { IconButtonProps } from "@widgetarium/kit";

export interface EnterableMount {
	readonly name?: string | undefined;
	readonly title?: string | null | undefined;
	readonly enter: () => void;
}

export interface MountSettingsButtonProps {
	readonly entry: EnterableMount;
}

export function MountSettingsButton({ entry }: MountSettingsButtonProps): ReactElement {
	const press: IconButtonProps = {
		size: "s",
		label: `Settings for ${entry.title ?? entry.name ?? ""}`,
		onClick: enterOnPress(entry),
	};
	return h("div", { className: "wg-mount-actions" }, h(IconButton, press, h(Icon, { name: "settings" })));
}

// TRADE-OFF: board chrome in a layer-neutral primitive; the widget places its own mounts, so nothing above this sits between a mount and its drawn node
function enterOnPress(entry: EnterableMount): (event: MouseEvent) => void {
	return (event) => {
		event.stopPropagation();
		entry.enter();
	};
}

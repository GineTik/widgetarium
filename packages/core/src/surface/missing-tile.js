import { createElement as h } from "react";
import { Button } from "@widgetarium/kit";
import { generationOf } from "../engine/widget-ref.js";

const COULD_NOT_LOAD = "This widget could not be loaded";
const INSTALL_THAT_VERSION = "Install the version this board was made with";

export function failedTile(tile, definition) {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, COULD_NOT_LOAD),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		h("span", { key: "why" }, String(definition.error?.message ?? definition.error ?? "")),
	]);
}

export function missingTile(tile, host) {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, "This widget is not installed"),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		generationOf(tile.widget) && host?.installWidgetAt
			? h(
					Button,
					{
						key: "install",
						size: "s",
						className: "wg-missing-install",
						onClick: () => host.installWidgetAt(tile.widget),
					},
					INSTALL_THAT_VERSION,
				)
			: null,
	]);
}

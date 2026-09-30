import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Button } from "@widgetarium/kit";
import { generationOf } from "../engine/widget-ref.js";
import { isObject } from "../engine/is-object.js";
import type { Tile } from "../model.js";
import type { WidgetDefinition } from "./is-drawable.js";

const COULD_NOT_LOAD = "This widget could not be loaded";
const INSTALL_THAT_VERSION = "Install the version this board was made with";

export interface InstallingHost {
	readonly installWidgetAt?: ((widget: string) => unknown) | null;
}

export function failedTile(tile: Pick<Tile, "widget">, definition: WidgetDefinition): ReactElement {
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, COULD_NOT_LOAD),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		h("span", { key: "why" }, String(errorMessageOf(definition.error) ?? definition.error ?? "")),
	]);
}

export function missingTile(tile: Pick<Tile, "widget">, host: InstallingHost | null | undefined): ReactElement {
	const install = host?.installWidgetAt;
	return h("div", { className: "wg-missing" }, [
		h("b", { key: "said" }, "This widget is not installed"),
		h("p", { key: "named", className: "wg-missing-id" }, tile.widget),
		generationOf(tile.widget) && install
			? h(
					Button,
					{
						key: "install",
						size: "s",
						className: "wg-missing-install",
						onClick: () => install(tile.widget),
					},
					INSTALL_THAT_VERSION,
				)
			: null,
	]);
}

function errorMessageOf(error: unknown): unknown {
	return isObject(error) ? error["message"] : undefined;
}

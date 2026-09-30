import { createElement as h } from "react";
import type { ReactElement } from "react";
import { packOf, shortName } from "./catalogue-entries.js";
import type { Fields } from "./engine/catalogue-index.js";

export interface TileNameProps {
	readonly manifest: Fields;
}

export function TileName({ manifest }: TileNameProps): ReactElement {
	return h("span", { className: "wg-cat-said", title: String(manifest["id"]) }, [
		h("span", { className: "wg-cat-scope", key: "scope" }, packOf(manifest)),
		h("span", { className: "wg-cat-slash", key: "slash" }, "/"),
		h("span", { className: "wg-cat-name", key: "name" }, shortName(manifest)),
	]);
}

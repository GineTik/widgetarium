import { createElement as h } from "react";
import { packOf, shortName } from "./catalogue-entries.js";

export function TileName({ manifest }) {
	return h("span", { className: "wg-cat-said", title: manifest.id }, [
		h("span", { className: "wg-cat-scope", key: "scope" }, packOf(manifest)),
		h("span", { className: "wg-cat-slash", key: "slash" }, "/"),
		h("span", { className: "wg-cat-name", key: "name" }, shortName(manifest)),
	]);
}

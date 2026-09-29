import { createElement as h } from "react";
import { initialOf } from "./catalogue-entries.js";

export function Standin({ manifest, line, tone }) {
	return h("div", { className: tone === "broken" ? "wg-cat-stand is-broken" : "wg-cat-stand" }, [
		h("span", { className: "wg-cat-mark", key: "mark" }, initialOf(manifest)),
		h("span", { className: "wg-cat-line", key: "line" }, line),
	]);
}

import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { initialOf } from "./catalogue-entries.js";
import type { Fields } from "./engine/catalogue-index.js";

export interface StandinProps {
	readonly manifest: Fields;
	readonly line: ReactNode;
	readonly tone?: "broken" | undefined;
}

export function Standin({ manifest, line, tone }: StandinProps): ReactElement {
	return h("div", { className: tone === "broken" ? "wg-cat-stand is-broken" : "wg-cat-stand" }, [
		h("span", { className: "wg-cat-mark", key: "mark" }, initialOf(manifest)),
		h("span", { className: "wg-cat-line", key: "line" }, line),
	]);
}

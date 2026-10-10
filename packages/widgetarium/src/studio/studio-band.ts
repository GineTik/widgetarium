import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { TopBarCorners } from "./design/design-top-bar.js";

export function StudioBand({ corners }: { readonly corners: TopBarCorners }): ReactElement {
	return h("header", { className: "wg-studio-band" }, corners.start, corners.end);
}

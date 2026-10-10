import { createElement as h } from "react";
import type { ReactElement } from "react";

export interface NoRouteProps {
	readonly pathname: string;
}

const NO_ROUTE_TITLE = "No route";
const NOTHING_DRAWN_AT = "No board.json under the routes folder answers {path}.";

export function NoRoute({ pathname }: NoRouteProps): ReactElement {
	return h(
		"main",
		{ className: "wg-no-route" },
		h("h1", null, NO_ROUTE_TITLE),
		h("p", null, NOTHING_DRAWN_AT.replace("{path}", pathname)),
	);
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, LayoutHeader, cn } from "@widgetarium/kit";
import { SHOWCASE } from "@widgetarium/kit/showcase";
import { NO_SURFACE } from "@widgetarium/kit/surface";
import type { ShowcaseEntry } from "@widgetarium/kit/showcase";
import { Region } from "./design-region.js";

const KIT = "Kit";

export function KitRegion(): ReactElement {
	return h(
		Region,
		{ title: KIT, count: SHOWCASE.length },
		h("div", { className: "wg-design-kit wg-showcase" }, SHOWCASE.map(kitCardOf)),
	);
}

function kitCardOf(entry: ShowcaseEntry): ReactElement {
	return h(
		Card,
		{
			key: entry.id,
			type: entry.paintsPlates ? NO_SURFACE : undefined,
			className: cn(entry.isWide && "is-wide", entry.paintsPlates && "wg-showcase-bare"),
		},
		h("div", { className: "wg-showcase-stack" }, [
			h(LayoutHeader, { key: "title", title: entry.title }),
			entry.note ? h("p", { key: "note", className: "wg-showcase-note" }, entry.note) : null,
			h(entry.Demo, { key: "demo" }),
		]),
	);
}

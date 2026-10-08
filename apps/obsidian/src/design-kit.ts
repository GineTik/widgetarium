import { createElement as h } from "react";
import type { ReactElement } from "react";
import { Card, LayoutHeader } from "@widgetarium/kit";
import { SHOWCASE } from "@widgetarium/kit/showcase";
import { NO_SURFACE } from "@widgetarium/kit/surface";
import type { ShowcaseEntry } from "@widgetarium/kit/showcase";
import { DocsRegion } from "./design-docs.js";
import { Region } from "./design-region.js";

export type SystemPageAsk = Parameters<typeof DocsRegion>[0];

const KIT = "Kit";

export function KitRegion(): ReactElement {
	return h(
		Region,
		{ title: KIT, count: SHOWCASE.length },
		h("div", { className: "wg-design-kit wg-showcase" }, SHOWCASE.map(kitCardOf)),
	);
}

export function systemPageOf(ask: SystemPageAsk): ReactElement {
	return h("div", { key: "system", className: "wg-design-regions-row" }, [
		h(DocsRegion, { key: "docs", ...ask }),
		h(KitRegion, { key: "kit" }),
	]);
}

function kitCardOf(entry: ShowcaseEntry): ReactElement {
	return h(
		Card,
		{
			key: entry.id,
			type: entry.paintsPlates ? NO_SURFACE : undefined,
			className: entry.isWide ? "is-wide" : undefined,
		},
		h("div", { className: "wg-showcase-stack" }, [
			h(LayoutHeader, { key: "title", title: entry.title }),
			entry.note ? h("p", { key: "note", className: "wg-showcase-note" }, entry.note) : null,
			h(entry.Demo, { key: "demo" }),
		]),
	);
}

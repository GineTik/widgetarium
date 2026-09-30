import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { drawWidget } from "@widgetarium/core/mounted.js";
import { NO_HOST } from "@widgetarium/core/engine/host-none.js";
import type { HostClaimingNothing } from "@widgetarium/core/engine/host-none.js";
import { UNREADABLE } from "@widgetarium/core/engine/read-file.js";
import { previewGateways } from "@widgetarium/core/preview.js";
import type { Here, Navigation, PassageReader, PassageRecord, ViewHost } from "@widgetarium/core/gateway/host.js";
import type { WidgetDefinition } from "@widgetarium/core/registry.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { InlineMenu } from "./inline-menu.js";

export interface InlineWidgetProps {
	readonly definition: WidgetDefinition | null | undefined;
	readonly here: Here<PassageRecord>;
	readonly navigator: Navigation | null | undefined;
	readonly raw: string;
	readonly host: ViewHost | HostClaimingNothing | null | undefined;
	readonly reader: PassageReader | null | undefined;
}

export function InlineWidget({ definition, here, navigator, raw, host, reader }: InlineWidgetProps): ReactElement {
	const [isText, setText] = useState(false);
	const menu = h(InlineMenu, { key: "menu", isText, onShowSource: () => setText(!isText) });
	const component = definition?.component;

	if (isText)
		return h("div", { className: "wg-inline is-text" }, [
			h("span", { key: "raw", className: "wg-inline-raw" }, raw),
			menu,
		]);
	if (!definition || !component) {
		return h("div", { className: "wg-inline is-missing" }, [
			h("span", { key: "raw", className: "wg-inline-raw" }, raw),
			h("span", { key: "why", className: "wg-inline-why" }, "widget not installed"),
			menu,
		]);
	}

	return h("div", { className: "wg-inline" }, [
		h(
			"div",
			{ key: "view", className: "wg-inline-view" },
			drawWidget(
				{ component, draw: definition.draw, manifest: definition.manifest },
				{
					...previewGateways(isObject(definition.manifest) ? definition.manifest : null),
					here,
					navigator,
					reader: reader ?? UNREADABLE,
					host: host ?? NO_HOST,
					content: here.content,
				},
			),
		),
		menu,
	]);
}

import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { drawWidget } from "./mounted.js";
import { previewProps } from "./preview.js";
import type { PreviewRegistry } from "./preview.js";
import { gapVarsOf } from "./tree.js";
import { shotUrl, themeNow } from "./engine/shot.js";
import type { ShotHost } from "./engine/shot.js";
import type { ViewHost } from "./gateway/host.js";
import type { CardTile, CatalogueDefinition, MergedEntry } from "./catalogue-entries.js";
import { isObject } from "./engine/is-object.js";
import { Standin } from "./catalogue-standin.js";
import { Contained } from "./catalogue-contained.js";

export type CatalogueHost = ViewHost & ShotHost;

export interface PreviewTileProps {
	readonly definition: CatalogueDefinition;
	readonly registry: PreviewRegistry | null | undefined;
	readonly host: CatalogueHost | null | undefined;
	readonly tile: CardTile;
	readonly entry: MergedEntry;
}

// TRADE-OFF: below this a shape stops reading, so the widget draws a stand-in instead
const READABLE_SCALE = 0.3;

export function Preview({ definition, registry, host, tile, entry }: PreviewTileProps): ReactElement {
	const manifest = definition.manifest ?? {};
	const [isShotFailed, setShotFailed] = useState(false);
	const shown = isShotFailed ? null : shotUrl(entry, themeNow(), host);
	const preview = manifest["preview"];
	const instead = isObject(preview) ? preview["instead"] : undefined;
	const component = definition.component;

	if (definition.error) {
		return h(Standin, { manifest, tone: "broken", line: "This widget does not load" });
	}
	if (instead) {
		return h(Standin, { manifest, line: String(instead) });
	}
	if (shown) {
		return h("img", {
			className: "wg-cat-shot",
			src: shown,
			alt: String(manifest["title"] ?? manifest["id"]),
			width: Math.round(tile.frameWidth),
			height: Math.round(tile.frameHeight),
			loading: "lazy",
			decoding: "async",
			onError: () => setShotFailed(true),
		});
	}
	if (!component) {
		return h(Standin, { manifest, line: "Not installed yet" });
	}
	if (tile.scale < READABLE_SCALE) {
		return h(Standin, { manifest, line: "Too small to draw here" });
	}

	const drawable = { component, draw: definition.draw, manifest: { id: String(manifest["id"]) } };
	return h(
		Contained,
		{ instead: () => h(Standin, { manifest, tone: "broken", line: "This widget failed while drawing" }) },
		h(
			"div",
			{
				className: "wg-cat-scaled",
				style: {
					width: `${tile.size.width}px`,
					height: `${tile.size.height}px`,
					transform: `scale(${tile.scale})`,
					...gapVarsOf(1),
				},
			},
			drawWidget(drawable, previewProps(definition, { registry, host })),
		),
	);
}

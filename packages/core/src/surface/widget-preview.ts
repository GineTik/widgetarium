import { createElement as h, useRef, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { cardTile } from "../catalogue-entries.js";
import { TileStage } from "../catalogue-tile-stage.js";
import { Standin } from "../catalogue-standin.js";
import type { CataloguePort } from "../engine/catalogue-port.js";
import type { WidgetPreview } from "../gateway/host.js";
import { NO_PREVIEW } from "../engine/catalogue-none.js";
import { useWidth } from "../use-width.js";

const NOT_IN_CATALOGUE = "This widget is in no catalogue";

// TRADE-OFF: cardTile still takes the card's own padding off the column, so the preview hands it back
const STAGE_INSET_PX = 20;

const PREVIEW_OF_PORT = new WeakMap<CataloguePort, WidgetPreview>();

export function widgetPreview(port: CataloguePort | null | undefined): WidgetPreview {
	if (!port?.can) return NO_PREVIEW;
	const held = PREVIEW_OF_PORT.get(port);
	if (held) return held;
	const made: WidgetPreview = { canPreview: true, Drawn: ({ widget }) => h(PreviewOf, { port, widget }) };
	PREVIEW_OF_PORT.set(port, made);
	return made;
}

function PreviewOf({ port, widget }: { readonly port: CataloguePort; readonly widget: string }): ReactElement {
	const holderRef = useRef<HTMLDivElement | null>(null);
	const width = useWidth(holderRef);
	const entry = useSyncExternalStore(port.subscribe, () => port.entryOf(widget));
	const body = (): ReactElement | null => {
		if (!entry) return h(Standin, { manifest: { id: widget }, line: NOT_IN_CATALOGUE });
		if (width <= 0) return null;
		const tile = cardTile(entry.manifest, { columns: 1, columnPx: width + STAGE_INSET_PX });
		return h(TileStage, {
			definition: entry.definition,
			registry: port.previewRegistry,
			host: port.previewHost,
			tile,
			entry,
		});
	};
	return h("div", { className: "wg-preview-of", ref: holderRef }, body());
}

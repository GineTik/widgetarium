import { createElement as h } from "react";
import type { KeyboardEvent, ReactElement } from "react";
import { Card } from "@widgetarium/kit";
import { shortName } from "./catalogue-entries.js";
import type { CardTile, MergedEntry } from "./catalogue-entries.js";
import { useInstallPress } from "./catalogue-install-press.js";
import type { CatalogueMode, OnInstall, OnPick } from "./catalogue-install-press.js";
import type { PreviewRegistry } from "./preview.js";
import type { CatalogueHost } from "./catalogue-preview.js";
import { TileStage } from "./catalogue-tile-stage.js";
import { TileName } from "./catalogue-tile-name.js";
import { CardAction } from "./catalogue-card-action.js";
import { TileLines } from "./catalogue-tile-lines.js";

export interface TileProps {
	readonly entry: MergedEntry;
	readonly tile: CardTile;
	readonly registry: PreviewRegistry | null | undefined;
	readonly host: CatalogueHost | null | undefined;
	readonly mode: CatalogueMode;
	readonly lacks: string | null;
	readonly onPick?: OnPick | undefined;
	readonly onInstall?: OnInstall | undefined;
}

const VERBS: Readonly<Partial<Record<CatalogueMode, string>>> = {
	browse: "Open",
	place: "Add",
	fill: "Use",
	text: "Use",
	mount: "Add",
};

const BROWSE_VERB = "Open";

export function Tile({ entry, tile, registry, host, mode, lacks, onPick, onInstall }: TileProps): ReactElement {
	const manifest = entry.manifest;
	const name = shortName(manifest);
	const press = `${VERBS[mode] ?? BROWSE_VERB} ${name}`;
	const { state, step, failure, press: run } = useInstallPress({ entry, mode, onPick, onInstall });
	const onKeyDown = (event: KeyboardEvent): unknown => (event.key === "Enter" || event.key === " ") && run();

	return h(
		Card,
		{ asChild: true, className: "wg-cat-tile" },
		h(
			"article",
			{
				role: "button",
				tabIndex: 0,
				"aria-label": press,
				"data-span": `${tile.size.w}x${tile.size.h}`,
				"data-state": state,
				onClick: run,
				onKeyDown,
			},
			[
				h(TileStage, { key: "stage", definition: entry.definition, registry, host, tile, entry }),
				h("div", { className: "wg-cat-foot", key: "foot" }, [
					h(TileName, { key: "said", manifest }),
					h(CardAction, { key: "go", state, step, label: press, onPress: run }),
				]),
				...TileLines({ entry, state, step, failure, lacks }),
			],
		),
	);
}

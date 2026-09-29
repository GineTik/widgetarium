import { createElement as h } from "react";
import { Card } from "@widgetarium/kit";
import { shortName } from "./catalogue-entries.js";
import { useInstallPress } from "./catalogue-install-press.js";
import { TileStage } from "./catalogue-tile-stage.js";
import { TileName } from "./catalogue-tile-name.js";
import { CardAction } from "./catalogue-card-action.js";
import { TileLines } from "./catalogue-tile-lines.js";

const VERBS = { browse: "Open", place: "Add", fill: "Use", text: "Use", mount: "Add" };

export function Tile({ entry, tile, registry, host, mode, lacks, onPick, onInstall }) {
	const manifest = entry.manifest ?? {};
	const name = shortName(manifest);
	const press = `${VERBS[mode] ?? VERBS.browse} ${name}`;
	const { state, step, failure, press: run } = useInstallPress({ entry, mode, onPick, onInstall });

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
				onKeyDown: (event) => (event.key === "Enter" || event.key === " ") && run(),
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

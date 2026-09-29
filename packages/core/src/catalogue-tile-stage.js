import { createElement as h } from "react";
import { Preview } from "./catalogue-preview.js";

export function TileStage({ definition, registry, host, tile, entry }) {
	const lattice = { "--wg-cell": `${tile.cell}px`, "--wg-gap": `${tile.gap}px`, "--wg-cat-across": tile.w };
	const frame = { width: `${Math.round(tile.frameWidth)}px`, height: `${Math.round(tile.frameHeight)}px` };
	return h(
		"div",
		{ className: "wg-cat-stage", style: lattice },
		h(
			"div",
			{ className: "wg-cat-frame", style: frame },
			h("div", { className: "wg-cat-pic", inert: true }, h(Preview, { definition, registry, host, tile, entry })),
		),
	);
}

import { createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { Preview } from "./catalogue-preview.js";
import type { PreviewTileProps } from "./catalogue-preview.js";

export type TileStageProps = PreviewTileProps;

type LatticeStyle = CSSProperties & {
	readonly "--wg-cell": string;
	readonly "--wg-gap": string;
	readonly "--wg-cat-across": number;
};

export function TileStage({ definition, registry, host, tile, entry }: TileStageProps): ReactElement {
	const lattice: LatticeStyle = {
		"--wg-cell": `${tile.cell}px`,
		"--wg-gap": `${tile.gap}px`,
		"--wg-cat-across": tile.w,
	};
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

import type { LooseProps } from "../types";
import { createElement as h, useContext } from "react";
import { cx } from "../utils/cx";
import { render } from "../utils/render";
import { GROUP, PLATES_ABOVE, plateProps, platesInside, warnOnce, wornPlate } from "../utils/surface";
import { tonedPlateClass } from "../utils/tones";

export function Card({ type = GROUP, tone, side, across, className: cls, style, children, ...rest }: LooseProps) {
	const above = useContext(PLATES_ABOVE);
	const { surface, refusal } = wornPlate(above, type);
	if (refusal) sayRefusedPlate(type, refusal);
	const props = { ...rest, ...plateProps(above, { surface, side, across, style }), children };
	return (
		<PLATES_ABOVE.Provider value={platesInside(above, surface)}>
			{render("div", props, cx("wg-kit-surface", tonedPlateClass(tone), cls))}
		</PLATES_ABOVE.Provider>
	);
}

export const Surface = Card;

function sayRefusedPlate(said, refusal) {
	warnOnce(`a ${said} surface painted nothing — ${refusal.reason} (law ${refusal.law})`);
}

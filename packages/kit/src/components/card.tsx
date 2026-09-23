import { createElement as h, useContext } from "react";
import type { LooseProps } from "../types";
import { plateClass } from "../utils/class-names";
import { cx } from "../utils/cx";
import { domPropsOf } from "../utils/dom-props";
import { Slot, slotted } from "./slot";
import { GROUP, PLATES_ABOVE, plateProps, platesInside, warnOnce, wornPlate } from "../utils/surface";
import { tonedPlateClass } from "../utils/tones";

export function Card({
	asChild = false,
	type = GROUP,
	tone,
	side,
	across,
	className: cls,
	style,
	children,
	...rest
}: LooseProps) {
	const above = useContext(PLATES_ABOVE);
	const { surface, refusal } = wornPlate(above, type);
	if (refusal) sayRefusedPlate(type, refusal);
	const Comp = asChild ? Slot : "div";
	return (
		<PLATES_ABOVE.Provider value={platesInside(above, surface)}>
			<Comp
				{...domPropsOf(rest)}
				{...plateProps(above, { surface, side, across, style })}
				className={cx("wg-kit-surface", tonedPlateClass(tone), cls)}
			>
				{children}
			</Comp>
		</PLATES_ABOVE.Provider>
	);
}

export const Surface = Card;

function sayRefusedPlate(said, refusal) {
	warnOnce(`a ${said} surface painted nothing — ${refusal.reason} (law ${refusal.law})`);
}

export const Plate = slotted("div", plateClass, "Plate");

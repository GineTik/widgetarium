import { createElement as h, useContext } from "react";
import type { FunctionComponent, HTMLAttributes, ReactElement, Ref } from "react";
import type { ToneName } from "../constants/tones";
import { plateClass } from "../utils/class-names";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import type { PlateRefusal } from "../utils/plate-laws";
import { Slot, createSlotPart } from "./slot";
import type { SlotPartProps } from "./create-slot-part";
import { GROUP, PLATES_ABOVE, plateProps, platesInside, warnOnce, wornPlate } from "../utils/surface";
import { tonedPlateClass } from "../utils/tones";
import type { StyleProp } from "../utils/token-style";

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
	readonly asChild?: boolean;
	readonly type?: string | undefined;
	readonly tone?: ToneName | undefined;
	readonly side?: string | undefined;
	readonly across?: string | undefined;
	readonly style?: StyleProp | undefined;
	readonly ref?: Ref<HTMLDivElement>;
}

export function Card({ asChild = false, type = GROUP, tone, side, across, style, ...rest }: CardProps): ReactElement {
	const above = useContext(PLATES_ABOVE);
	const { surface, refusal } = wornPlate(above, type);
	if (refusal) sayRefusedPlate(type, refusal);
	const Comp = asChild ? Slot : "div";
	return (
		<PLATES_ABOVE.Provider value={platesInside(above, surface)}>
			<Comp
				{...domPropsOf(rest)}
				{...plateProps(above, { surface, side, across, style })}
				className={cn("wg-kit-surface", tonedPlateClass(tone), rest.className)}
			>
				{rest.children}
			</Comp>
		</PLATES_ABOVE.Provider>
	);
}

export const Surface = Card;

export const Plate: FunctionComponent<SlotPartProps> = createSlotPart("div", plateClass, "Plate");

function sayRefusedPlate(said: string, refusal: PlateRefusal): void {
	warnOnce(`a ${said} surface painted nothing — ${refusal.reason} (law ${refusal.law})`);
}

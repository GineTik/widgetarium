import { createElement as h, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { EMBLEM_SHAPE_WORD, EMBLEM_SIZE_WORD, EMBLEM_SIZES, EMBLEM_STATUS } from "../constants/emblem";
import type { EmblemShape, EmblemSize, EmblemStatus } from "../constants/emblem";
import { cn } from "../utils/cn";
import { isOneOf } from "../utils/is-one-of";
import { wornWord } from "../utils/surface";
import type { StyleProp, TokenStyle } from "../utils/token-style";
import { EmblemDiceBear } from "./emblem-dice-bear";
import { EmblemFallback } from "./emblem-fallback";
import { EmblemImage } from "./emblem-image";

export { EmblemDiceBear } from "./emblem-dice-bear";
export { EmblemFallback } from "./emblem-fallback";
export { EmblemImage } from "./emblem-image";
export { PlaceholderMark } from "./placeholder-mark";
export type { EmblemDiceBearProps } from "./emblem-dice-bear";
export type { EmblemFallbackProps } from "./emblem-fallback";
export type { EmblemImageProps } from "./emblem-image";
export type { PlaceholderMarkProps } from "./placeholder-mark";

export interface EmblemProps {
	readonly size?: EmblemSize | number | string;
	readonly shape?: EmblemShape | undefined;
	readonly label?: string | undefined;
	readonly className?: string | undefined;
	readonly style?: StyleProp | undefined;
	readonly children?: ReactNode;
}

export function Emblem({
	size = "m",
	shape = "circle",
	label,
	className: cls,
	style,
	children,
}: EmblemProps): ReactElement {
	const [status, setStatus] = useState<EmblemStatus>("idle");
	const px = emblemPx(size);
	const sized: TokenStyle = { ...style, "--wg-emblem-size": typeof px === "number" ? `${px}px` : px };
	return (
		<EMBLEM_STATUS.Provider value={{ status, setStatus }}>
			<span
				className={cn("wg-kit-emblem", `is-${wornWord(shape, EMBLEM_SHAPE_WORD)}`, cls)}
				style={sized}
				role={label ? "img" : undefined}
				aria-label={label}
			>
				{children}
			</span>
		</EMBLEM_STATUS.Provider>
	);
}

// TODO: drop the dot aliases once the vault's @default copy is reinstalled
Emblem.Image = EmblemImage;

Emblem.DiceBear = EmblemDiceBear;

Emblem.Fallback = EmblemFallback;

function emblemPx(size: EmblemSize | number | string): number | string {
	if (typeof size === "number") return size;
	return isOneOf(EMBLEM_SIZE_WORD.allowed, size) ? EMBLEM_SIZES[size] : size;
}

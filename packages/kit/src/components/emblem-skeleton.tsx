import { createElement as h } from "react";
import type { ReactElement } from "react";
import { EMBLEM_SHAPE_WORD, EMBLEM_SIZE_WORD, EMBLEM_SIZES } from "../constants/emblem";
import { wornWord } from "../utils/surface";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";

export function EmblemSkeleton({ size, shape, style, ...props }: SkeletonPartProps): ReactElement {
	const px = typeof size === "number" ? size : EMBLEM_SIZES[wornWord(size, EMBLEM_SIZE_WORD)];
	return (
		<SkeletonBone
			{...props}
			data-kind="emblem"
			data-shape={wornWord(shape, EMBLEM_SHAPE_WORD)}
			style={{ "--wg-kit-skeleton-size": `${px}px`, ...style }}
		/>
	);
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SKELETON_BUTTON_SIZE_WORD } from "../constants/skeleton";
import { wornWord } from "../utils/surface";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";

export function ButtonSkeleton({ size, block = false, ...props }: SkeletonPartProps): ReactElement {
	return (
		<SkeletonBone
			{...props}
			data-kind="button"
			data-size={wornWord(size, SKELETON_BUTTON_SIZE_WORD)}
			data-block={block ? "" : undefined}
		/>
	);
}

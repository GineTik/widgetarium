import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SKELETON_FIELD_SIZE_WORD } from "../constants/skeleton";
import { wornWord } from "../utils/surface";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";

export function FieldSkeleton({ size, ...props }: SkeletonPartProps): ReactElement {
	return <SkeletonBone {...props} data-kind="field" data-size={wornWord(size, SKELETON_FIELD_SIZE_WORD)} />;
}

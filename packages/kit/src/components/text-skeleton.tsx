import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SKELETON_TEXT_LINES } from "../constants/skeleton";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";
import { SkeletonGroup } from "./skeleton-group";

export function TextSkeleton({ lines = SKELETON_TEXT_LINES, ...props }: SkeletonPartProps): ReactElement {
	return (
		<SkeletonGroup {...props} kind="text">
			{Array.from({ length: lines }, (_, at) => (
				<SkeletonBone key={at} data-part="line" data-last={at > 0 && at === lines - 1 ? "" : undefined} />
			))}
		</SkeletonGroup>
	);
}

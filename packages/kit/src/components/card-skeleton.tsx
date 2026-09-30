import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SKELETON_CARD_LINES } from "../constants/skeleton";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";
import { SkeletonGroup } from "./skeleton-group";
import { TextSkeleton } from "./text-skeleton";

export function CardSkeleton(props: SkeletonPartProps): ReactElement {
	return (
		<SkeletonGroup {...props} kind="card">
			<SkeletonBone data-part="media" />
			<TextSkeleton lines={SKELETON_CARD_LINES} />
		</SkeletonGroup>
	);
}

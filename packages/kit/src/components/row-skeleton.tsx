import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";
import { SkeletonGroup } from "./skeleton-group";
import { TextSkeleton } from "./text-skeleton";

const ROW_LINES = 2;

export function RowSkeleton(props: SkeletonPartProps): ReactElement {
	return (
		<SkeletonGroup {...props} kind="row">
			<SkeletonBone data-part="badge" />
			<TextSkeleton lines={ROW_LINES} />
		</SkeletonGroup>
	);
}

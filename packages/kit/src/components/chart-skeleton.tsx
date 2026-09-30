import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SKELETON_CHART_BARS } from "../constants/skeleton";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";
import { SkeletonGroup } from "./skeleton-group";

export function ChartSkeleton(props: SkeletonPartProps): ReactElement {
	return (
		<SkeletonGroup {...props} kind="chart">
			{SKELETON_CHART_BARS.map((share, at) => (
				<SkeletonBone key={at} data-part="bar" style={{ height: `${share}%` }} />
			))}
		</SkeletonGroup>
	);
}

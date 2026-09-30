import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SPARKLINE_HEIGHT } from "../constants/charts";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";

export function SparklineSkeleton({ height = SPARKLINE_HEIGHT, style, ...props }: SkeletonPartProps): ReactElement {
	return <SkeletonBone {...props} data-kind="sparkline" style={{ height: `${height}px`, ...style }} />;
}

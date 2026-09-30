import { createElement as h } from "react";
import type { ReactElement } from "react";
import { SkeletonBone } from "./skeleton-bone";
import type { SkeletonPartProps } from "./skeleton-bone";

export function BlockSkeleton(props: SkeletonPartProps): ReactElement {
	return <SkeletonBone {...props} data-kind="block" />;
}

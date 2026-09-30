import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import type { SkeletonPartProps } from "./skeleton-bone";

export interface SkeletonGroupProps extends SkeletonPartProps {
	readonly kind: string;
}

export function SkeletonGroup({ kind, children, ...props }: SkeletonGroupProps): ReactElement {
	return (
		<span
			{...domPropsOf(props)}
			className={cn("wg-kit-skeleton-group", props.className)}
			data-kind={kind}
			aria-hidden="true"
		>
			{children}
		</span>
	);
}

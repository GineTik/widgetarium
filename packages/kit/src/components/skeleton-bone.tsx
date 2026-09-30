import { createElement as h } from "react";
import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "../utils/cn";
import { domPropsOf } from "../utils/dom-props";
import type { StyleProp } from "../utils/token-style";

export interface SkeletonPartProps extends Omit<HTMLAttributes<HTMLSpanElement>, "style"> {
	readonly lines?: number | undefined;
	readonly size?: string | number | undefined;
	readonly shape?: string | undefined;
	readonly block?: boolean | undefined;
	readonly height?: number | undefined;
	readonly style?: StyleProp | undefined;
}

export function SkeletonBone(props: SkeletonPartProps): ReactElement {
	return <span {...domPropsOf(props)} className={cn("wg-kit-skeleton", props.className)} aria-hidden="true" />;
}

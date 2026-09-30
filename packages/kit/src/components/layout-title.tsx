import { createElement as h } from "react";
import type { ReactElement } from "react";
import { cn } from "../utils/cn";
import { Heading } from "./heading";
import type { HeadingProps } from "./heading";

const LAYOUT_TITLE_LEVEL = 3;

const LAYOUT_TITLE_SIZE = 4;

export function LayoutTitle({
	level = LAYOUT_TITLE_LEVEL,
	size = LAYOUT_TITLE_SIZE,
	className: cls,
	...rest
}: HeadingProps): ReactElement {
	return <Heading {...rest} level={level} size={size} className={cn("wg-kit-layout-title", cls)} />;
}

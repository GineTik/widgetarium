import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { Heading } from "./heading";
import { cx } from "../utils/cx";

const LAYOUT_TITLE_LEVEL = 3;

const LAYOUT_TITLE_SIZE = 4;

export function LayoutTitle({
	level = LAYOUT_TITLE_LEVEL,
	size = LAYOUT_TITLE_SIZE,
	className: cls,
	...rest
}: LooseProps) {
	return <Heading {...rest} level={level} size={size} className={cx("wg-kit-layout-title", cls)} />;
}

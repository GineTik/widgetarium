import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { MARK_VIEW_BOX } from "../constants/marks";
import { cx } from "../utils/cx";
import { markOf, pathOf } from "../utils/marks";
import { toneClass } from "../utils/tones";

export function PlaceholderMark({ seed, shape, tone, size = "100%", className: cls }: LooseProps) {
	const held = markOf(seed);
	return (
		<span
			className={cx("wg-kit-mark", "wg-kit-tone", toneClass(tone ?? held.tone), cls)}
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<svg viewBox={MARK_VIEW_BOX} focusable="false">
				<path d={pathOf(shape) ?? pathOf(held.shape)} fillRule="evenodd" />
			</svg>
		</span>
	);
}

import { createElement as h } from "react";
import type { ReactElement } from "react";
import { MARK_VIEW_BOX } from "../constants/marks";
import type { ToneName } from "../constants/tones";
import { cn } from "../utils/cn";
import { markOf, pathOf } from "../utils/marks";
import { toneClass } from "../utils/tones";

export interface PlaceholderMarkProps {
	readonly seed?: unknown;
	readonly shape?: string | undefined;
	readonly tone?: ToneName | undefined;
	readonly size?: number | string;
	readonly className?: string | undefined;
}

export function PlaceholderMark({
	seed,
	shape,
	tone,
	size = "100%",
	className: cls,
}: PlaceholderMarkProps): ReactElement {
	const held = markOf(seed);
	return (
		<span
			className={cn("wg-kit-mark", "wg-kit-tone", toneClass(tone ?? held.tone), cls)}
			style={{ width: size, height: size }}
			aria-hidden="true"
		>
			<svg viewBox={MARK_VIEW_BOX} focusable="false">
				<path d={pathOf(shape) ?? pathOf(held.shape) ?? undefined} fillRule="evenodd" />
			</svg>
		</span>
	);
}

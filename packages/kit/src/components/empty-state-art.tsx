import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { BadgeColor } from "../constants/tones";
import { Shape } from "../shapes/shape";
import type { ShapeName } from "../shapes/shape-names";

export interface EmptyStateArtProps {
	readonly shape: ShapeName;
	readonly tones?: readonly BadgeColor[] | undefined;
	readonly isCompact: boolean;
}

export function EmptyStateArt({ shape, tones, isCompact }: EmptyStateArtProps): ReactElement {
	const size = isCompact ? 64 : 120;
	return (
		<span className="wg-kit-empty-art" aria-hidden="true">
			<Shape name={shape} tones={tones} size={size} />
			{isCompact ? null : <Shape name="circle" tones={tones} size={size * 0.34} className="is-left" />}
			{isCompact ? null : <Shape name="sunny" tones={tones} size={size * 0.24} className="is-right" />}
		</span>
	);
}

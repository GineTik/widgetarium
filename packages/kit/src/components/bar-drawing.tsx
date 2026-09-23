import type { LooseProps } from "../types";
import { createElement as h } from "react";
import { BAR_STROKE } from "../constants/progress";

export function BarDrawing({ width, drawn, hasStopMark }: LooseProps) {
	const { track, active, cursor, height, middle, stop } = drawn;
	return (
		<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
			{track && <path className="wg-kit-bar-track" d={track} />}
			{track && hasStopMark && <circle className="wg-kit-bar-stop" cx={stop} cy={middle} r={BAR_STROKE / 2} />}
			{active && <path className="wg-kit-bar-active" d={active} />}
			{cursor && (
				<rect
					className="wg-kit-bar-cursor"
					x={cursor.x}
					y={0}
					width={cursor.width}
					height={height}
					rx={cursor.width / 2}
				/>
			)}
		</svg>
	);
}

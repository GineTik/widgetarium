import { createElement as h } from "react";
import type { ReactElement } from "react";
import { BAR_STROKE } from "../constants/progress";
import type { BarGeometry } from "../utils/progress-geometry";

export interface BarDrawingProps {
	readonly width: number;
	readonly drawn: BarGeometry;
	readonly hasStopMark: boolean;
}

export function BarDrawing({ width, drawn, hasStopMark }: BarDrawingProps): ReactElement {
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

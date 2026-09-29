import { slotOf } from "./days";
import { roundToTenth } from "./numbers";
import type { ChartBox, Point, Spot } from "./types";

type Bar = { day: string; x: number; y: number; width: number; height: number; rx: number };

type BarsInkProps = {
	points: Point[];
	spots: Spot[];
	box: ChartBox;
	ids: string;
	at: number | null;
	days: number;
	from: string;
};

const BAR_GAP_SHARE = 10 / 560;

export function BarsInk({ points, spots, box, ids, at, days, from }: BarsInkProps) {
	return (
		<>
			{barsOf(points, spots, box, days, from).map((bar, which) => (
				<rect
					key={bar.day}
					x={bar.x}
					y={bar.y}
					width={bar.width}
					height={bar.height}
					rx={bar.rx}
					fill={`url(#${ids}-bar-${which === at ? "strong" : "soft"})`}
				/>
			))}
		</>
	);
}

function barsOf(points: readonly Point[], spots: readonly Spot[], box: ChartBox, days: number, from: string): Bar[] {
	const pitch = box.width / Math.max(days, 1);
	const gap = box.width * BAR_GAP_SHARE;
	const width = Math.max(pitch - gap, 1);
	return points.map((point, at) => {
		const spot = spots[at] as Spot;
		return {
			day: point.day,
			x: roundToTenth(slotOf(point.day, from) * pitch + gap / 2),
			y: roundToTenth(spot.y),
			width: roundToTenth(width),
			height: roundToTenth(box.height + box.bleed - spot.y),
			rx: roundToTenth(width / 2),
		};
	});
}

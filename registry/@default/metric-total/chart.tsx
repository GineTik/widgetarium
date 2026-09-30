import type { PointerEvent as ReactPointerEvent } from "react";
import { BarsInk } from "./bars-ink";
import { CurveInk } from "./curve-ink";
import { slotOf } from "./days";
import type { Band, ChartBox, Hovered, Point, Spot, View } from "./types";

type ChartProps = {
	points: Point[];
	days: number;
	from: string;
	view: View;
	band: Band;
	ids: string;
	hovered: Hovered | null;
	onHover: (found: Hovered | null) => void;
};

const HEAD_ROOM_SHARE = 70 / 440;
const FOOT_SHARE = 380 / 440;
const BLEED_SHARE = 22 / 440;

const WIDE_CHART = { width: 560, height: 440, inkAt: 0.22, inkFar: 0.52, underTop: 0.24 };
const NARROW_CHART = { width: 300, height: 300, inkAt: 0.24, inkFar: 0.56, underTop: 0.22 };

export function Chart({ points, days, from, view, band, ids, hovered, onHover }: ChartProps) {
	const box = chartOf(band);
	const spots = spotsOf(points, box, days, from);

	const moved = (event: ReactPointerEvent<HTMLDivElement>) => {
		const node = event.currentTarget;
		const room = node.getBoundingClientRect();
		const share = (event.clientX - room.left) / Math.max(room.width, 1);
		const at = Math.min(points.length - 1, Math.max(0, Math.round(share * (points.length - 1))));
		const spot = spots[at];
		if (!spot) return;
		onHover({ at, left: node.offsetLeft + (spot.x / box.width) * node.clientWidth });
	};

	return (
		<div data-part="chart" className="mt3-chart" onPointerMove={moved} onPointerLeave={() => onHover(null)}>
			<svg viewBox={`0 0 ${box.width} ${box.height}`} preserveAspectRatio="none" aria-hidden="true">
				<defs>
					<linearGradient id={`${ids}-ink-ramp`} className="mt3-ramp" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopOpacity="0" />
						<stop offset={box.inkAt} stopOpacity="0.3" />
						<stop offset={box.inkFar} stopOpacity="1" />
					</linearGradient>
					<mask id={`${ids}-ink-fade`}>
						<rect width={box.width} height={box.height} fill={`url(#${ids}-ink-ramp)`} />
					</mask>
					<linearGradient id={`${ids}-under`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity={box.underTop} />
						<stop offset="1" stopOpacity="0.015" />
					</linearGradient>
					<linearGradient id={`${ids}-bar-soft`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity="0.46" />
						<stop offset="1" stopOpacity="0.1" />
					</linearGradient>
					<linearGradient id={`${ids}-bar-strong`} className="mt3-toned" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopOpacity="1" />
						<stop offset="1" stopOpacity="0.4" />
					</linearGradient>
				</defs>

				<g mask={`url(#${ids}-ink-fade)`}>
					{view === "bars" ? (
						<BarsInk
							points={points}
							spots={spots}
							box={box}
							ids={ids}
							at={hovered?.at ?? null}
							days={days}
							from={from}
						/>
					) : (
						<CurveInk spots={spots} box={box} ids={ids} />
					)}
				</g>
			</svg>
		</div>
	);
}

function chartOf(band: Band): ChartBox {
	const drawn = band === "wide" || band === "mid" ? WIDE_CHART : NARROW_CHART;
	return {
		...drawn,
		headRoom: drawn.height * HEAD_ROOM_SHARE,
		footY: drawn.height * FOOT_SHARE,
		bleed: drawn.height * BLEED_SHARE,
	};
}

function spotsOf(points: readonly Point[], box: ChartBox, days: number, from: string): Spot[] {
	const values = points.map((point) => point.value);
	const ceiling = Math.max(...values);
	const floor = Math.min(...values);
	const span = Math.max(ceiling - floor, 1);
	const last = Math.max(days - 1, 1);
	return points.map((point) => ({
		x: (slotOf(point.day, from) / last) * box.width,
		y: box.headRoom + ((ceiling - point.value) / span) * (box.footY - box.headRoom),
	}));
}

import { useState } from "react";
import { Chart } from "./chart";
import { Tip } from "./tip";
import type { Band, Hovered, Point, View } from "./types";

type HoverChartProps = {
	points: Point[];
	days: number;
	from: string;
	view: View;
	band: Band;
	ids: string;
	unit: string;
};

export function HoverChart({ points, days, from, view, band, ids, unit }: HoverChartProps) {
	const [hovered, setHovered] = useState<Hovered | null>(null);
	const point = hovered ? points[hovered.at] : undefined;
	return (
		<>
			<Chart
				points={points}
				days={days}
				from={from}
				view={view}
				band={band}
				ids={ids}
				hovered={hovered}
				onHover={setHovered}
			/>
			{point && hovered ? <Tip point={point} unit={unit} left={hovered.left} /> : null}
		</>
	);
}

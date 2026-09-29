import { Sparkline, SparklineArea, SparklineDot, SparklineLine } from "widgetarium/kit";
import type { Drawn, Point } from "./types";

const GLANCE_HEIGHT = 40;
const BLANK = "—";

const GLANCE_LABEL = "{label} across {count} points";

export function Glance({ points, first }: { points: Point[]; first: Drawn }) {
	const latest = [...points].reverse().find((point) => typeof point[first.key] === "number");
	return (
		<div className="wg-chart-glance">
			<span className="wg-chart-glance-label">{first.label}</span>
			<div className="wg-chart-glance-row">
				<b className="wg-chart-glance-value">{latest ? Number(latest[first.key]).toLocaleString() : BLANK}</b>
				<Sparkline
					className="wg-chart-glance-spark"
					data={points}
					dataKey={first.key}
					height={GLANCE_HEIGHT}
					label={GLANCE_LABEL.replace("{label}", first.label).replace("{count}", String(points.length))}
				>
					<SparklineArea />
					<SparklineLine />
					<SparklineDot at="last" />
				</Sparkline>
			</div>
		</div>
	);
}

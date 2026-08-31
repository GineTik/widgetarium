import { createWidget, WidgetRoot } from "widgetarium";
import { bucketOf, groupOf, readLog } from "@habit/lib";

const STYLE = `
.habit-chart {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	overflow: hidden;
}

.hc-head {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
}

.hc-title {
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.hc-plot {
	flex: 1;
	min-height: 60px;
	width: 100%;
	overflow: visible;
}

.hc-grid {
	stroke: var(--background-modifier-border);
	stroke-width: 1;
}

.hc-line {
	fill: none;
	stroke: var(--habit-ink, var(--interactive-accent));
	stroke-width: 2;
	stroke-linejoin: round;
	stroke-linecap: round;
}

.hc-fill {
	fill: var(--habit-ink, var(--interactive-accent));
	opacity: 0.18;
}

.hc-bar {
	fill: var(--habit-ink, var(--interactive-accent));
	rx: 2;
}

.hc-slice {
	stroke: var(--background-primary);
	stroke-width: 2;
}

.hc-axis {
	display: flex;
	justify-content: space-between;
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.hc-keys {
	display: flex;
	flex-wrap: wrap;
	gap: var(--size-4-2, 8px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

.hc-key {
	display: flex;
	align-items: center;
	gap: 5px;
}

.hc-swatch {
	width: 9px;
	height: 9px;
	border-radius: 2px;
}
`;

const BOX = { w: 300, h: 100 };
const SLICE_TONES = [0.95, 0.72, 0.55, 0.4, 0.28, 0.18];
const CATEGORY = new Set(["pie", "donut"]);

function pointsOf(values, top) {
	const step = values.length > 1 ? BOX.w / (values.length - 1) : 0;
	return values.map((value, at) => [at * step, BOX.h - (value / top) * BOX.h]);
}

function pathOf(points, kind) {
	if (points.length === 0) return "";
	if (kind !== "step") return points.map(([x, y], at) => `${at === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");

	const parts = [`M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`];
	for (let at = 1; at < points.length; at += 1) {
		parts.push(`H${points[at][0].toFixed(2)}`, `V${points[at][1].toFixed(2)}`);
	}
	return parts.join(" ");
}

// CONTEXT: a slice is drawn from its own arc, so the whole pie is one path per share
function sliceOf(from, to, hole) {
	const point = (turn, radius) => [50 + radius * Math.sin(turn * 2 * Math.PI), 50 - radius * Math.cos(turn * 2 * Math.PI)];
	const wide = to - from > 0.5 ? 1 : 0;
	const [ax, ay] = point(from, 50);
	const [bx, by] = point(to, 50);
	if (hole <= 0) return `M50 50 L${ax.toFixed(2)} ${ay.toFixed(2)} A50 50 0 ${wide} 1 ${bx.toFixed(2)} ${by.toFixed(2)} Z`;

	const [cx, cy] = point(to, hole);
	const [dx, dy] = point(from, hole);
	return `M${ax.toFixed(2)} ${ay.toFixed(2)} A50 50 0 ${wide} 1 ${bx.toFixed(2)} ${by.toFixed(2)} L${cx.toFixed(2)} ${cy.toFixed(2)} A${hole} ${hole} 0 ${wide} 0 ${dx.toFixed(2)} ${dy.toFixed(2)} Z`;
}

function Pie({ parts, hole }) {
	const total = parts.reduce((sum, part) => sum + part.value, 0) || 1;
	let turn = 0;
	return (
		<svg className="hc-plot" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img">
			{parts.map((part, at) => {
				const from = turn;
				turn += part.value / total;
				return <path key={part.label} className="hc-slice" d={sliceOf(from, turn, hole)} opacity={SLICE_TONES[at % SLICE_TONES.length]} fill="var(--habit-ink, var(--interactive-accent))" />;
			})}
		</svg>
	);
}

function Plot({ parts, kind }) {
	const values = parts.map((part) => part.value);
	const top = Math.max(...values, 1);

	if (kind === "bar") {
		const slot = BOX.w / Math.max(values.length, 1);
		return (
			<svg className="hc-plot" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none" role="img">
				{values.map((value, at) => (
					<rect key={at} className="hc-bar" x={at * slot + slot * 0.15} y={BOX.h - (value / top) * BOX.h} width={slot * 0.7} height={(value / top) * BOX.h} />
				))}
			</svg>
		);
	}

	const points = pointsOf(values, top);
	const line = pathOf(points, kind);
	return (
		<svg className="hc-plot" viewBox={`0 0 ${BOX.w} ${BOX.h}`} preserveAspectRatio="none" role="img">
			<line className="hc-grid" x1="0" y1={BOX.h / 2} x2={BOX.w} y2={BOX.h / 2} vectorEffect="non-scaling-stroke" />
			{kind === "line" ? null : <path className="hc-fill" d={`${line} L${BOX.w} ${BOX.h} L0 ${BOX.h} Z`} />}
			<path className="hc-line" d={line} vectorEffect="non-scaling-stroke" />
		</svg>
	);
}

export default createWidget(function HabitChart({ settings, data }) {
	const rows = data?.log?.rows ?? [];
	const kind = ["area", "line", "step", "bar", "pie", "donut"].includes(settings.kind) ? settings.kind : "area";
	const byCategory = CATEGORY.has(kind);

	// CONTEXT: a pie needs categories and a trend needs an axis — the same rows, two aggregations
	const parts = byCategory
		? groupOf(rows, settings.prop || "tag")
		: bucketOf(readLog(rows, { field: settings.field, pick: settings.pick }), settings.bucket || "week");

	if (parts.length === 0) {
		return (
			<WidgetRoot className="habit-chart">
				<style>{STYLE}</style>
				<p className="habit-empty">Nothing to draw yet — this folder holds no dated entries.</p>
			</WidgetRoot>
		);
	}

	return (
		<WidgetRoot className="habit-chart">
			<style>{STYLE}</style>
			<div className="hc-head">
				<h3 className="hc-title">{byCategory ? settings.prop || "tag" : `by ${settings.bucket || "week"}`}</h3>
				<span className="habit-sub">{`${parts.reduce((sum, part) => sum + part.value, 0)} in ${parts.length}`}</span>
			</div>
			{byCategory ? <Pie parts={parts} hole={kind === "donut" ? 28 : 0} /> : <Plot parts={parts} kind={kind} />}
			{byCategory ? (
				<div className="hc-keys">
					{parts.map((part, at) => (
						<span className="hc-key" key={part.label}>
							<i className="hc-swatch" style={{ background: "var(--habit-ink, var(--interactive-accent))", opacity: SLICE_TONES[at % SLICE_TONES.length] }} />
							{`${part.label} ${part.value}`}
						</span>
					))}
				</div>
			) : (
				<div className="hc-axis">
					<span>{parts[0].label}</span>
					<span>{parts[parts.length - 1].label}</span>
				</div>
			)}
		</WidgetRoot>
	);
});

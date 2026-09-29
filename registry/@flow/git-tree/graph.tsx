import type { Row } from "widgetarium";
import { cn } from "widgetarium/kit";
import { saidOf } from "./said-of";
import type { Commit } from "./types";

type Placed = { at: number; sha: string; lane: number; parents: string[] };
type Spot = { x: number; y: number };
type Link = { key: string; from: Spot; to: Spot; isAside: boolean; isEarlier: boolean };
type Dot = { key: number; spot: Spot; isTip: boolean; isAside: boolean };

const GRAPH_LABEL = "The branch graph of its {count} newest commits.";
const COUNT = "{count}";

const PITCH = 16;
const LANE_PITCH = 18;
const PAD = 10;
const LEAST_SPAN = 7;
const DOT_R = 3.4;
const TIP_R = 5;

export function Graph({ rows, hasEarlier }: { rows: readonly Row<Commit>[]; hasEarlier: boolean }) {
	const placed = placedOf(rows);
	const span = spanOf(rows.length);
	const lanes = placed.reduce((most, one) => Math.max(most, one.lane), 0) + 1;
	const width = PAD * 2 + span * PITCH;
	const height = PAD * 2 + (lanes - 1) * LANE_PITCH;

	return (
		<svg
			className="fgt-graph"
			viewBox={`0 0 ${width} ${height}`}
			style={{ maxWidth: `${width}px` }}
			role="img"
			aria-label={GRAPH_LABEL.replace(COUNT, String(rows.length))}
		>
			{linksOf(placed, span, hasEarlier).map((link) => (
				<path
					key={link.key}
					className={cn("fgt-line", link.isAside && "is-aside", link.isEarlier && "is-earlier")}
					d={pathOf(link.from, link.to)}
				/>
			))}
			{dotsOf(placed, span).map((dot) => (
				<circle
					key={dot.key}
					className={dot.isTip ? "fgt-tip" : cn("fgt-dot", dot.isAside && "is-aside")}
					cx={dot.spot.x}
					cy={dot.spot.y}
					r={dot.isTip ? TIP_R : DOT_R}
				/>
			))}
		</svg>
	);
}

function parentsOf(value: Commit["parents"]): string[] {
	const held = Array.isArray(value) ? value : saidOf(value).split(/[\s,]+/);
	return held.map((one) => saidOf(one)).filter((one) => one !== "");
}

function freeLane(lanes: (string | null)[]): number {
	const free = lanes.indexOf(null);
	return free === -1 ? lanes.length : free;
}

function placedOf(rows: readonly Row<Commit>[]): Placed[] {
	const lanes: (string | null)[] = [];
	return rows.map((row, at) => {
		const sha = saidOf(row.sha);
		const parents = parentsOf(row.parents);
		const waiting = sha === "" ? -1 : lanes.indexOf(sha);
		const lane = waiting === -1 ? freeLane(lanes) : waiting;
		lanes.forEach((held, index) => {
			if (held === sha) lanes[index] = null;
		});
		lanes[lane] = parents[0] ?? null;
		for (const other of parents.slice(1)) lanes[freeLane(lanes)] = other;
		return { at, sha, lane, parents };
	});
}

function spanOf(count: number): number {
	return Math.max(count - 1, LEAST_SPAN);
}

function spotOf(placed: Placed, span: number): Spot {
	return { x: PAD + (span - placed.at) * PITCH, y: PAD + placed.lane * LANE_PITCH };
}

function olderThan(child: Placed, placed: readonly Placed[], bySha: Map<string, Placed>): Placed[] {
	if (child.parents.length === 0) {
		const next = placed[child.at + 1];
		return next ? [next] : [];
	}
	return child.parents
		.map((sha) => bySha.get(sha))
		.filter((one): one is Placed => one !== undefined && one.at > child.at);
}

function linksOf(placed: readonly Placed[], span: number, hasEarlier: boolean): Link[] {
	const bySha = new Map<string, Placed>();
	for (const one of placed) if (one.sha !== "") bySha.set(one.sha, one);

	const drawn = placed.flatMap((child) =>
		olderThan(child, placed, bySha).map((older) => ({
			key: `${child.at}-${older.at}`,
			from: spotOf(child, span),
			to: spotOf(older, span),
			isAside: child.lane > 0 || older.lane > 0,
			isEarlier: false,
		})),
	);

	const last = placed[placed.length - 1];
	if (!hasEarlier || !last) return drawn;
	const spot = spotOf(last, span);
	return [...drawn, { key: "earlier", from: spot, to: { x: 0, y: spot.y }, isAside: false, isEarlier: true }];
}

function dotsOf(placed: readonly Placed[], span: number): Dot[] {
	return placed.map((one) => ({ key: one.at, spot: spotOf(one, span), isTip: one.at === 0, isAside: one.lane > 0 }));
}

function pathOf(from: Spot, to: Spot): string {
	if (from.y === to.y) return `M${to.x} ${to.y}H${from.x}`;
	const bend = Math.max(PITCH / 2, (from.x - to.x) / 2);
	return `M${to.x} ${to.y}C${to.x + bend} ${to.y} ${from.x - bend} ${from.y} ${from.x} ${from.y}`;
}

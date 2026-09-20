import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, VaultRecord } from "widgetarium";
import { cx } from "widgetarium/kit";

const CSS = `
.fgt {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
}

.fgt-branch {
	flex: none;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

.fgt-graph {
	display: block;
	flex: none;
	width: 100%;
	height: auto;
}

.fgt-line {
	fill: none;
	stroke: var(--wg-kit-accent);
	stroke-width: 1.5;
	stroke-linecap: round;
	vector-effect: non-scaling-stroke;
}

.fgt-line.is-aside {
	opacity: 0.45;
}

.fgt-line.is-earlier {
	opacity: 0.45;
	stroke-dasharray: 3 4;
}

.fgt-dot {
	fill: var(--wg-kit-accent);
}

.fgt-dot.is-aside {
	opacity: 0.45;
}

.fgt-tip {
	fill: var(--wg-kit-card-fill);
	stroke: var(--wg-kit-accent);
	stroke-width: 2.5;
	vector-effect: non-scaling-stroke;
}

.fgt-said {
	margin: 0;
	color: var(--text-muted);
}
`;

const SHOWN = 40;
const NOTHING = "This branch has no commits yet.";
const READING = "Reading the branch…";
const GRAPH_LABEL = "The branch graph of its {count} newest commits.";
const COUNT = "{count}";

const PITCH = 16;
const LANE_PITCH = 18;
const PAD = 10;
const LEAST_SPAN = 7;
const DOT_R = 3.4;
const TIP_R = 5;

type Commit = VaultRecord & {
	sha?: string | null;
	parents?: readonly string[] | string | null;
};

type Placed = { at: number; sha: string; lane: number; parents: string[] };
type Spot = { x: number; y: number };
type Link = { key: string; from: Spot; to: Spot; isAside: boolean; isEarlier: boolean };
type Dot = { key: number; spot: Spot; isTip: boolean; isAside: boolean };

function saidOf(value: unknown): string {
	return String(value ?? "").trim();
}

function askedCount(value: unknown, fallback: number): number {
	const asked = Math.round(Number(value));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
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

function Said({ text }: { text: string }) {
	return <p className="fgt-said">{text}</p>;
}

function Graph({ rows, hasEarlier }: { rows: readonly Row<Commit>[]; hasEarlier: boolean }) {
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
					className={cx("fgt-line", link.isAside && "is-aside", link.isEarlier && "is-earlier")}
					d={pathOf(link.from, link.to)}
				/>
			))}
			{dotsOf(placed, span).map((dot) => (
				<circle
					key={dot.key}
					className={dot.isTip ? "fgt-tip" : cx("fgt-dot", dot.isAside && "is-aside")}
					cx={dot.spot.x}
					cy={dot.spot.y}
					r={dot.isTip ? TIP_R : DOT_R}
				/>
			))}
		</svg>
	);
}

export const manifest = defineManifest({
	title: "Branch graph",
	description:
		"The shape of a branch: a dot per commit newest first, with the lines where it forked and where it merged back.",
	keywords: [
		"git",
		"branch",
		"commits",
		"tree",
		"graph",
		"history",
		"log",
		"merge",
		"fork",
		"lanes",
		"revision",
		"topology",
	],
	role: "collection",
	size: { collapseBelowPx: 80, stackBelowPx: 260 },
	preview: {
		size: { w: 5, h: 2 },
		props: {
			branch: { value: "unsafe-dev" },
			commits: {
				rows: [
					{ path: "commits/748628d.md", sha: "748628d1c0", parents: ["70a3c80f42", "2a64d67ba9"] },
					{ path: "commits/70a3c80.md", sha: "70a3c80f42", parents: ["83ab3d2e71"] },
					{ path: "commits/2a64d67.md", sha: "2a64d67ba9", parents: ["83ab3d2e71"] },
					{ path: "commits/83ab3d2.md", sha: "83ab3d2e71", parents: ["8a4ab1806d"] },
					{ path: "commits/8a4ab18.md", sha: "8a4ab1806d", parents: [] },
				],
			},
		},
	},
	props: {
		commits: defineProp<Commit[]>()({
			label: "Commits",
			hint: "The commit records written for this branch, newest first. Only the sha and its parents are drawn.",
			default: [],
			describes: {
				sha: { label: "Commit", aka: ["hash", "commit", "revision"] },
				parents: { label: "Parents", many: true, aka: ["parent", "parentShas", "ancestors"] },
			},
		}),
		branch: defineProp<string>()({
			label: "Branch",
			hint: "The name of the branch these commits are on. Left empty, no name is drawn.",
			default: "",
		}),
		shownCommits: defineProp<number>()({
			label: "Commits shown",
			hint: "How many of the newest commits the graph spans.",
			default: SHOWN,
		}),
	},
});

export default createWidget(manifest, ({ commits, branch, shownCommits }) => {
	const shown = askedCount(useData(shownCommits.get).data, SHOWN);
	const read = useData(commits.list, { limit: shown });
	const named = saidOf(useData(branch.get).data);

	if (read.failure !== null) return <Said text={read.failure} />;
	if (read.isLoading && read.data.length === 0) return <Said text={READING} />;
	if (read.data.length === 0) return <Said text={NOTHING} />;

	const rows = read.data as Row<Commit>[];

	return (
		<div className="fgt">
			<style>{CSS}</style>
			{named === "" ? null : <div className="fgt-branch">{named}</div>}
			<Graph rows={rows} hasEarlier={(read.total ?? rows.length) > rows.length} />
		</div>
	);
});

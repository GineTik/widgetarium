import {
	IListGateway,
	IValueGateway,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import type { Row } from "widgetarium";
import { Graph } from "./graph";
import { Said } from "./said";
import { saidOf } from "./said-of";
import type { Commit } from "./types";

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
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text-muted);
}
`;

const SHOWN = 40;
const NOTHING = "This branch has no commits yet.";
const READING = "Reading the branch…";

export const CommitSchema = VaultRecordSchema.extend({
	sha: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["hash", "commit", "revision"] }),
	parents: z
		.union([z.array(z.string()), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["parent", "parentShas", "ancestors"] }),
});

function askedCount(value: unknown, fallback: number): number {
	const asked = Math.round(Number(value));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
}

const GitTree = createWidget({
	inject: {
		commits: IListGateway.of(CommitSchema),
		branch: IValueGateway.of(z.string().default("")).pick("get"),
		shownCommits: IValueGateway.of(z.number().default(SHOWN)).pick("get"),
	},
	draw: ({ commits, branch, shownCommits }) => {
		const shown = askedCount(shownCommits, SHOWN);
		const read = useData(commits.list, { limit: shown });
		const named = saidOf(branch);

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
	},
});

export const metadata = defineMetadata(GitTree, {
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
		commits: {
			label: "Commits",
			hint: "The commit records written for this branch, newest first. Only the sha and its parents are drawn.",
			describes: {
				sha: { label: "Commit" },
				parents: { label: "Parents", many: true },
			},
		},
		branch: {
			label: "Branch",
			hint: "The name of the branch these commits are on. Left empty, no name is drawn.",
		},
		shownCommits: {
			label: "Commits shown",
			hint: "How many of the newest commits the graph spans.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 80, stackBelowPx: 260 },
});

export default GitTree;

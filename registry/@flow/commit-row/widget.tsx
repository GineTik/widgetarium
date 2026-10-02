import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, Row, cn } from "widgetarium/kit";
import { saidOf } from "./counts";
import { DiffStat } from "./diff-stat";
import { Meta } from "./meta";
import type { Commit } from "./types";

const CSS = `
/* TRADE-OFF: the slot plate already pads an item; the kit row's own padding would be the second one */
.fcr {
	align-items: flex-start;
	padding: 0;
}

.fcr .fcr-glyph {
	margin-top: 1px;
}

.fcr .fcr-glyph.is-merge {
	color: var(--wg-kit-accent);
}

.fcr-body {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.fcr-subject {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	min-width: 0;
	max-height: calc(var(--font-ui-small, 14px) * var(--line-height-tight, 1.25) * 2);
	margin: 0;
	font-weight: var(--font-medium, 500);
	line-height: var(--line-height-tight, 1.25);
}

.fcr-subject.is-missing {
	font-weight: var(--font-normal, 400);
	color: var(--text-faint);
}

.fcr-meta {
	display: flex;
	align-items: baseline;
	overflow: hidden;
	gap: var(--wg-gap-parts);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.fcr-meta > * + *::before {
	content: "·";
	padding-inline-end: var(--wg-gap-parts);
}

.fcr-sha {
	flex: none;
	font-family: var(--font-monospace);
}

.fcr-files,
.fcr-when {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.fcr .fcr-diff {
	align-items: flex-start;
	white-space: nowrap;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
}

.fcr-added {
	color: var(--wg-kit-success);
}

.fcr-removed {
	color: var(--wg-kit-error);
}

.fcr-bar {
	display: flex;
	overflow: hidden;
	flex: none;
	width: 40px;
	height: 6px;
	margin-top: 4px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.fcr-bar-added {
	background: var(--wg-kit-success);
}

.fcr-bar-removed {
	background: var(--wg-kit-error);
}

@container widget (width < 340px) {
	.fcr .fcr-bar {
		display: none;
	}
}

@container widget (width < 220px) {
	.fcr .fcr-files {
		display: none;
	}
}
`;

export const CommitSchema = z.object({
	sha: z.string().nullish(),
	subject: z.string().nullish(),
	at: z.string().nullish(),
	files: z.union([z.number(), z.string()]).nullish(),
	added: z.union([z.number(), z.string()]).nullish(),
	removed: z.union([z.number(), z.string()]).nullish(),
	parents: z.union([z.array(z.string()), z.string()]).nullish(),
});

const NO_SUBJECT = "No subject";

const COMMIT_GLYPH = "git-commit-vertical";
const MERGE_GLYPH = "git-merge";
const GLYPH_SIZE = 18;

function parentCount(value: Commit["parents"]): number {
	const held = Array.isArray(value) ? value : saidOf(value).split(/[\s,]+/);
	return held.filter((one) => saidOf(one) !== "").length;
}

const CommitRow = createWidget({
	inject: {
		getCommit: IQuery.of(
			CommitSchema.default({
				sha: "70a3c80f42",
				subject:
					"feat(catalogue): let the agent see the whole catalogue instead of only what the vault happens to hold",
				at: "2026-09-16",
				files: 21,
				added: 903,
				removed: 412,
				parents: ["83ab3d2e71"],
			}),
		),
	},
	draw: ({ getCommit: commit }) => {
		const subject = saidOf(commit.subject);
		const isMerge = parentCount(commit.parents) > 1;

		return (
			<Row className="fcr">
				<style>{CSS}</style>
				<Icon
					name={isMerge ? MERGE_GLYPH : COMMIT_GLYPH}
					size={GLYPH_SIZE}
					className={cn("fcr-glyph", isMerge && "is-merge")}
				/>
				<div className="fcr-body">
					<p className={cn("fcr-subject", subject === "" && "is-missing")}>{subject === "" ? NO_SUBJECT : subject}</p>
					<Meta commit={commit} />
				</div>
				<DiffStat commit={commit} />
			</Row>
		);
	},
});

export const metadata = defineMetadata(CommitRow, {
	title: "Commit row",
	description: "One commit as a row: its subject, its short sha, what it touched and how much it added and removed.",
	keywords: [
		"commit",
		"git",
		"row",
		"sha",
		"revision",
		"changelog",
		"history",
		"diff",
		"insertions",
		"deletions",
		"subject",
		"merge",
	],
	preview: {
		size: { w: 4, h: 1 },
		props: {
			getCommit: {
				value: {
					sha: "748628d1c0",
					subject:
						"refactor(catalogue): break the two functions past the decomposition limits into the questions they ask",
					at: "2026-09-17",
					files: 9,
					added: 214,
					removed: 137,
					parents: ["70a3c80f42", "2a64d67ba9"],
				},
			},
		},
	},
	props: {
		getCommit: {
			label: "Commit",
			aka: ["commit"],
			hint: "The commit this row draws. Held in a tree it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 60, stackBelowPx: 220 },
});

export default CommitRow;

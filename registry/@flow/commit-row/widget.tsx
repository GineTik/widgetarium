import { createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import { Icon, Row, RowValue, cx } from "widgetarium/kit";

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

const NO_SUBJECT = "No subject";
const ONE_FILE = "1 file";
const MANY_FILES = "{count} files";
const ADDED = "+{count}";
const REMOVED = "-{count}";
const COUNT = "{count}";
const SHA_LENGTH = 7;
const COMMIT_GLYPH = "git-commit-vertical";
const MERGE_GLYPH = "git-merge";
const GLYPH_SIZE = 18;

type Commit = {
	sha?: string | null;
	subject?: string | null;
	at?: string | null;
	files?: number | string | null;
	added?: number | string | null;
	removed?: number | string | null;
	parents?: readonly string[] | string | null;
};

function saidOf(value: unknown): string {
	return String(value ?? "").trim();
}

function parentCount(value: Commit["parents"]): number {
	const held = Array.isArray(value) ? value : saidOf(value).split(/[\s,]+/);
	return held.filter((one) => saidOf(one) !== "").length;
}

function countOf(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return Math.max(0, Math.round(number));
}

function filesLine(files: Commit["files"]): string | null {
	const count = countOf(files);
	if (count === null) return null;
	return count === 1 ? ONE_FILE : MANY_FILES.replace(COUNT, String(count));
}

function whenLine(at: Commit["at"]): string | null {
	const said = saidOf(at);
	if (said === "") return null;
	const moment = new Date(said);
	if (Number.isNaN(moment.getTime())) return said;
	return moment.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function sharesOf(added: number | null, removed: number | null): { added: number; removed: number } | null {
	const up = added ?? 0;
	const down = removed ?? 0;
	const together = up + down;
	if (together === 0) return null;
	return { added: (up / together) * 100, removed: (down / together) * 100 };
}

function Meta({ commit }: { commit: Commit }) {
	const sha = saidOf(commit.sha).slice(0, SHA_LENGTH);
	const files = filesLine(commit.files);
	const when = whenLine(commit.at);
	if (sha === "" && files === null && when === null) return null;

	return (
		<div className="fcr-meta">
			{sha === "" ? null : <span className="fcr-sha">{sha}</span>}
			{files === null ? null : <span className="fcr-files">{files}</span>}
			{when === null ? null : <span className="fcr-when">{when}</span>}
		</div>
	);
}

function DiffBar({ added, removed }: { added: number | null; removed: number | null }) {
	const shares = sharesOf(added, removed);
	if (shares === null) return null;

	return (
		<span className="fcr-bar" aria-hidden="true">
			<i className="fcr-bar-added" style={{ width: `${shares.added}%` }} />
			<i className="fcr-bar-removed" style={{ width: `${shares.removed}%` }} />
		</span>
	);
}

function DiffStat({ commit }: { commit: Commit }) {
	const added = countOf(commit.added);
	const removed = countOf(commit.removed);
	if (added === null && removed === null) return null;

	return (
		<RowValue className="fcr-diff">
			{added === null ? null : <span className="fcr-added">{ADDED.replace(COUNT, String(added))}</span>}
			{removed === null ? null : <span className="fcr-removed">{REMOVED.replace(COUNT, String(removed))}</span>}
			<DiffBar added={added} removed={removed} />
		</RowValue>
	);
}

export const manifest = defineManifest({
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
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 60, stackBelowPx: 220 },
	preview: {
		size: { w: 4, h: 1 },
		props: {
			commit: {
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
		commit: defineProp<Commit>()({
			label: "Commit",
			hint: "The commit this row draws. Held in a tree it is handed down; standing alone it is the one typed here.",
			default: {
				sha: "70a3c80f42",
				subject:
					"feat(catalogue): let the agent see the whole catalogue instead of only what the vault happens to hold",
				at: "2026-09-16",
				files: 21,
				added: 903,
				removed: 412,
				parents: ["83ab3d2e71"],
			},
		}),
	},
});

export default createWidget(manifest, ({ commit }) => {
	const held: Commit = useValue(commit) ?? {};
	const subject = saidOf(held.subject);
	const isMerge = parentCount(held.parents) > 1;

	return (
		<Row className="fcr">
			<style>{CSS}</style>
			<Icon
				name={isMerge ? MERGE_GLYPH : COMMIT_GLYPH}
				size={GLYPH_SIZE}
				className={cx("fcr-glyph", isMerge && "is-merge")}
			/>
			<div className="fcr-body">
				<p className={cx("fcr-subject", subject === "" && "is-missing")}>{subject === "" ? NO_SUBJECT : subject}</p>
				<Meta commit={held} />
			</div>
			<DiffStat commit={held} />
		</Row>
	);
});

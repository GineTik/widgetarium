import { createWidget, defineManifest, defineProp, useValue } from "widgetarium";
import { Icon, Row, RowLabel, RowValue } from "widgetarium/kit";

// TRADE-OFF: the row drops the kit's own padding; the item slot already pads, and both is 28px
const CSS = `
.ffr.wg-kit-row {
	align-items: flex-start;
	padding: 0;
	gap: var(--wg-gap-parts);
}

.ffr-mark {
	display: grid;
	place-content: center;
	flex: none;
	margin-top: 1px;
	color: var(--wg-kit-neutral-ink);
}

.ffr-mark.is-added {
	color: var(--wg-kit-success);
}

.ffr-mark.is-modified {
	color: var(--wg-kit-info);
}

.ffr-mark.is-renamed {
	color: var(--wg-kit-note);
}

.ffr-mark.is-deleted {
	color: var(--wg-kit-error);
}

.ffr-mark.is-binary {
	color: var(--wg-kit-standout);
}

.ffr-mark.is-untold {
	color: var(--wg-kit-neutral-ink);
}

.ffr-label.wg-kit-row-label {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--wg-gap-parts);
	white-space: normal;
}

.ffr-path {
	display: flex;
	align-items: baseline;
	min-width: 0;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-small, 14px);
}

.ffr-dir {
	direction: rtl;
	text-align: left;
	flex: 0 1 auto;
	overflow: hidden;
	min-width: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--text-faint);
}

.ffr-dir > span {
	direction: ltr;
	unicode-bidi: isolate;
}

.ffr-name {
	flex: 0 0 auto;
	white-space: nowrap;
	color: var(--wg-kit-text);
	font-weight: var(--font-medium, 500);
}

.ffr-name.is-missing {
	color: var(--text-faint);
	font-family: var(--font-interface);
	font-weight: var(--font-normal, 400);
	font-style: italic;
}

.ffr-was {
	display: flex;
	align-items: baseline;
	gap: var(--wg-gap-parts);
	min-width: 0;
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.ffr-was-word {
	flex: none;
}

.ffr-was .ffr-path {
	font-size: var(--font-ui-smaller, 12px);
}

.ffr-stat.wg-kit-row-value {
	align-items: center;
	gap: var(--wg-gap-parts);
	white-space: nowrap;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
}

.ffr-added {
	color: var(--wg-kit-success);
}

.ffr-removed {
	color: var(--wg-kit-error);
}

.ffr-said {
	font-family: var(--font-interface);
	color: var(--text-faint);
	font-style: italic;
}

.ffr-bar {
	display: flex;
	overflow: hidden;
	flex: none;
	width: 44px;
	height: 6px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.ffr-bar-added {
	background: var(--wg-kit-success);
}

.ffr-bar-removed {
	background: var(--wg-kit-error);
}

@container widget (width < 320px) {
	.ffr .ffr-bar {
		display: none;
	}
}

@container widget (width < 220px) {
	.ffr.wg-kit-row {
		flex-wrap: wrap;
	}

	.ffr .ffr-stat.wg-kit-row-value {
		flex: 1 0 100%;
		justify-content: flex-start;
	}
}
`;

const NO_PATH = "No path";
const BINARY = "binary";
const NOT_COUNTED = "not counted";
const RENAMED_FROM = "Renamed from";
const ADDED = "+{count}";
const REMOVED = "−{count}";
const COUNT = "{count}";

type FileChange = {
	filePath?: string | null;
	added?: number | string | null;
	removed?: number | string | null;
	change?: string | null;
	from?: string | null;
};

type Kind = { icon: string; word: string; mark: string };

const KINDS: Record<string, Kind> = {
	added: { icon: "file-plus", word: "Added", mark: "is-added" },
	modified: { icon: "file-pen", word: "Modified", mark: "is-modified" },
	renamed: { icon: "file-symlink", word: "Renamed", mark: "is-renamed" },
	deleted: { icon: "file-x", word: "Deleted", mark: "is-deleted" },
	binary: { icon: "binary", word: "Binary", mark: "is-binary" },
};

const UNTOLD: Kind = { icon: "file", word: "Touched", mark: "is-untold" };

const KIND_NAMED: Record<string, string> = {
	a: "added",
	add: "added",
	added: "added",
	new: "added",
	m: "modified",
	modified: "modified",
	modify: "modified",
	changed: "modified",
	r: "renamed",
	renamed: "renamed",
	rename: "renamed",
	moved: "renamed",
	d: "deleted",
	deleted: "deleted",
	delete: "deleted",
	removed: "deleted",
	b: "binary",
	bin: "binary",
	binary: "binary",
};

function saidOf(value: unknown): string {
	return String(value ?? "").trim();
}

function countOf(value: unknown): number | null {
	if (value === undefined || value === null || value === "") return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return Math.max(0, Math.round(number));
}

function kindOf(change: FileChange["change"], from: FileChange["from"]): Kind {
	const named = KIND_NAMED[saidOf(change).toLowerCase()];
	if (named) return KINDS[named] ?? UNTOLD;
	if (saidOf(from) !== "") return KINDS.renamed ?? UNTOLD;
	return UNTOLD;
}

function splitPath(path: string): { dir: string; name: string } {
	const cut = path.lastIndexOf("/");
	if (cut < 0) return { dir: "", name: path };
	return { dir: path.slice(0, cut + 1), name: path.slice(cut + 1) };
}

function sharesOf(added: number | null, removed: number | null): { added: number; removed: number } | null {
	const up = added ?? 0;
	const down = removed ?? 0;
	const together = up + down;
	if (together === 0) return null;
	return { added: (up / together) * 100, removed: (down / together) * 100 };
}

function PathText({ path, className }: { path: string; className?: string }) {
	const said = saidOf(path);
	if (said === "")
		return (
			<span className={className ? `ffr-path ${className}` : "ffr-path"}>
				<span className="ffr-name is-missing">{NO_PATH}</span>
			</span>
		);

	const { dir, name } = splitPath(said);
	return (
		<span className={className ? `ffr-path ${className}` : "ffr-path"} title={said}>
			{dir === "" ? null : (
				<span className="ffr-dir">
					<span>{dir}</span>
				</span>
			)}
			<span className="ffr-name">{name}</span>
		</span>
	);
}

function DiffBar({ added, removed }: { added: number | null; removed: number | null }) {
	const shares = sharesOf(added, removed);
	if (shares === null) return null;

	return (
		<span className="ffr-bar" aria-hidden="true">
			<i className="ffr-bar-added" style={{ width: `${shares.added}%` }} />
			<i className="ffr-bar-removed" style={{ width: `${shares.removed}%` }} />
		</span>
	);
}

function DiffStat({ file, kind }: { file: FileChange; kind: Kind }) {
	const added = countOf(file.added);
	const removed = countOf(file.removed);
	if (kind === KINDS.binary) return <RowValue className="ffr-stat ffr-said">{BINARY}</RowValue>;
	if (added === null && removed === null) return <RowValue className="ffr-stat ffr-said">{NOT_COUNTED}</RowValue>;

	return (
		<RowValue className="ffr-stat">
			{added === null ? null : <span className="ffr-added">{ADDED.replace(COUNT, String(added))}</span>}
			{removed === null ? null : <span className="ffr-removed">{REMOVED.replace(COUNT, String(removed))}</span>}
			<DiffBar added={added} removed={removed} />
		</RowValue>
	);
}

function WasPath({ file }: { file: FileChange }) {
	const was = saidOf(file.from);
	if (was === "" || was === saidOf(file.filePath)) return null;

	return (
		<span className="ffr-was">
			<span className="ffr-was-word">{RENAMED_FROM}</span>
			<PathText path={was} />
		</span>
	);
}

export const manifest = defineManifest({
	title: "File row",
	description: "One file a change touched: what happened to it, its path, and the lines it gained and lost.",
	keywords: [
		"file",
		"row",
		"diff",
		"path",
		"git",
		"change",
		"added",
		"removed",
		"insertions",
		"deletions",
		"rename",
		"binary",
		"review",
	],
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 40, stackBelowPx: 220 },
	preview: {
		size: { w: 4, h: 1 },
		props: {
			file: {
				value: {
					filePath: "src/gateway/manifest.ts",
					from: "src/manifest.ts",
					change: "renamed",
					added: 46,
					removed: 12,
				},
			},
		},
	},
	props: {
		file: defineProp<FileChange>()({
			label: "File",
			hint: "The file this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
			default: {
				filePath: "src/engine/catalogue-index.js",
				change: "modified",
				added: 128,
				removed: 44,
			},
		}),
	},
});

export default createWidget(manifest, ({ file }) => {
	const held: FileChange = useValue(file) ?? {};
	const kind = kindOf(held.change, held.from);

	return (
		<Row className="ffr">
			<style>{CSS}</style>
			<span className={`ffr-mark ${kind.mark}`} role="img" aria-label={kind.word} title={kind.word}>
				<Icon name={kind.icon} size={16} />
			</span>
			<RowLabel className="ffr-label">
				<PathText path={saidOf(held.filePath)} />
				<WasPath file={held} />
			</RowLabel>
			<DiffStat file={held} kind={kind} />
		</Row>
	);
});

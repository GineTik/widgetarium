import { IValueGateway, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Icon, Row, RowLabel } from "widgetarium/kit";
import { DiffStat } from "./diff-stat";
import { KINDS, saidOf } from "./kinds";
import { PathText } from "./path-text";
import type { FileChange, Kind } from "./types";
import { WasPath } from "./was-path";

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

function kindOf(change: FileChange["change"], from: FileChange["from"]): Kind {
	const named = KIND_NAMED[saidOf(change).toLowerCase()];
	if (named) return KINDS[named] ?? UNTOLD;
	if (saidOf(from) !== "") return KINDS.renamed ?? UNTOLD;
	return UNTOLD;
}

const FileRow = createWidget({
	inject: {
		file: IValueGateway.of(
			z.custom<FileChange>().default({
				filePath: "src/engine/catalogue-index.js",
				change: "modified",
				added: 128,
				removed: 44,
			}),
		).pick("get"),
	},
	draw: ({ file }) => {
		const kind = kindOf(file.change, file.from);

		return (
			<Row className="ffr">
				<style>{CSS}</style>
				<span className={`ffr-mark ${kind.mark}`} role="img" aria-label={kind.word} title={kind.word}>
					<Icon name={kind.icon} size={16} />
				</span>
				<RowLabel className="ffr-label">
					<PathText path={saidOf(file.filePath)} />
					<WasPath file={file} />
				</RowLabel>
				<DiffStat file={file} kind={kind} />
			</Row>
		);
	},
});

export const metadata = defineMetadata(FileRow, {
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
		file: {
			label: "File",
			hint: "The file this row draws. Held in a list it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 40, stackBelowPx: 220 },
});

export default FileRow;

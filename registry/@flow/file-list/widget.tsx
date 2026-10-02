import {
	ICommand,
	IQuery,
	ISlot,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { SlotList } from "widgetarium/kit";
import { commitWhereOf } from "./commit-where";
import { Head } from "./head";
import { MoreRow } from "./more-row";
import { PickedRow } from "./picked-row";
import type { Drawn, FileFace, FileRow, FileSlot } from "./types";
import { useShown } from "widgetarium/kit";

const CSS = `
.ffl {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.ffl-head {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.ffl-title {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
}

.ffl-said {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.ffl-pick {
	border-radius: var(--wg-slot-corner, var(--wg-kit-plate));
}

.ffl-pick.is-pressable {
	cursor: pointer;
}

.ffl-pick.is-picked {
	box-shadow: inset 0 0 0 2px var(--wg-kit-accent);
}

.ffl-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.ffl-more {
	display: flex;
	flex: none;
	justify-content: center;
}
`;

const SHOWN = 200;
const SHOWN_KEY = "@flow/file-list";
const BY_PATH = [{ prop: "path", dir: "asc" as const }];
const NO_SLOT = "This list has no widget to draw its files with.";
const NOTHING = "This change touched no files.";
const READING = "Reading the files this change touched.";

export const FileChangeSchema = VaultRecordSchema.extend({
	path: z
		.string()
		.optional()
		.meta({ aka: ["file", "filename", "filePath"] }),
	commit: z
		.union([z.string(), z.number()])
		.nullable()
		.optional()
		.meta({ aka: ["sha", "revision", "hash"] }),
	added: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["insertions", "additions"] }),
	removed: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["deletions", "removals"] }),
	change: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["status", "kind", "changeType"] }),
	from: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["oldPath", "previousPath", "renamedFrom"] }),
});

function askedCount(value: unknown, fallback: number): number {
	const asked = Math.round(Number(value));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
}

function saidInstead(
	slot: FileSlot | undefined,
	listed: { failure: string | null; isLoading: boolean; total: number | null; data: readonly unknown[] },
) {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	if (listed.isLoading && listed.data.length === 0) return READING;
	return listed.data.length === 0 ? NOTHING : null;
}

const FileList = createWidget({
	inject: {
		getFiles: IQuery.expects(z.array(FileChangeSchema).default([])),
		getCommit: IQuery.expects(z.unknown().default(null)),
		getSelection: IQuery.expects(z.unknown()),
		select: ICommand.sends(z.unknown()),
		getHeading: IQuery.expects(z.string().default("Files touched")),
		getShownFiles: IQuery.expects(z.number().default(SHOWN)),
		file: ISlot.of<{ getFile: FileFace }>({
			default: "@flow/file-row",
			surface: "group",
			gives: { getFile: ["path", "added", "removed", "change", "from"] },
		}),
	},
	draw: ({
		getFiles,
		getCommit: commit,
		getSelection: selection,
		select,
		getHeading: heading,
		getShownFiles: shownFiles,
		file,
	}) => {
		const size = askedCount(shownFiles, SHOWN);
		const { shown, more } = useShown(SHOWN_KEY, size);
		const listed = useData(getFiles, { where: commitWhereOf(commit), sort: BY_PATH, offset: 0, limit: shown });
		const Drawn = file as Drawn;
		const said = saidInstead(file, listed);
		const rows = listed.data as FileRow[];
		const total = listed.total ?? rows.length;
		const canPick = select.can().can;

		return (
			<div className="ffl">
				<style>{CSS}</style>
				<Head heading={heading} total={total} />
				{said === null ? null : <p className="ffl-said">{said}</p>}
				{said !== null ? null : (
					<SlotList slot={Drawn}>
						{rows.map((row) => (
							<PickedRow
								key={row.ref}
								row={row}
								Drawn={Drawn}
								isPicked={row.ref === selection}
								onPick={canPick ? () => void select(row.ref) : null}
							/>
						))}
					</SlotList>
				)}
				{said === null ? <MoreRow rest={total - rows.length} onMore={more} /> : null}
			</div>
		);
	},
});

export const metadata = defineMetadata(FileList, {
	title: "File list",
	description: "The files a change touched, each with what happened to it and how many lines it gained and lost.",
	keywords: [
		"files",
		"diff",
		"changed",
		"touched",
		"git",
		"commit",
		"review",
		"stat",
		"insertions",
		"deletions",
		"paths",
		"list",
		"rename",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			getHeading: { value: "Files touched" },
			getFiles: {
				rows: [
					{
						path: "src/gateway/manifest.ts",
						change: "modified",
						added: 46,
						removed: 12,
						commit: "748628d1c0",
					},
					{
						path: "src/engine/registry-file.js",
						change: "added",
						added: 214,
						removed: 0,
						commit: "748628d1c0",
					},
					{
						path: "src/ai/vault-files.mjs",
						from: "src/ai/disk.mjs",
						change: "renamed",
						added: 8,
						removed: 3,
						commit: "748628d1c0",
					},
					{
						path: "assets/shapes/pill-outline.png",
						change: "binary",
						commit: "748628d1c0",
					},
					{
						path: "src/layout.js",
						change: "deleted",
						added: 0,
						removed: 311,
						commit: "748628d1c0",
					},
				],
			},
		},
	},
	props: {
		getFiles: {
			label: "Files",
			aka: ["files"],
			hint: "One record per file the change touched. Bind a commit list beside this one and the two move together.",
			describes: {
				path: { label: "Path", type: "line" },
				added: { label: "Lines added", type: "number" },
				removed: { label: "Lines removed", type: "number" },
				change: { label: "Change", type: "line" },
				from: { label: "Renamed from", type: "line" },
				commit: { label: "Commit", type: "line" },
			},
		},
		getCommit: {
			label: "Commit",
			hint: "Only the files of this commit are listed. Bind a commit list beside this one and the two move together; left unset, every file is listed.",
			wants: "@flow/git-tree/selection",
		},
		getSelection: {
			label: "Selected file",
			aka: ["selection"],
			hint: "Which file is picked. A diff standing beside this list binds to it and follows every press.",
			source: { implementation: "@core/selection", fields: { rows: "getFiles" } },
		},
		select: {
			label: "Pick a file",
			hint: "Runs when a row is pressed, with the file that was pressed.",
			source: { implementation: "@core/value-set", fields: { target: "getSelection" } },
		},
		getHeading: {
			label: "Heading",
			aka: ["heading"],
			hint: "The words standing before the count. Left empty, only the count is drawn.",
		},
		getShownFiles: {
			label: "Files shown",
			aka: ["shownFiles"],
			hint: "How many rows are read at once, and how many more each press adds.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 260 },
});

export default FileList;

import {
	IListGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	canDo,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { SlotList } from "widgetarium/kit";
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
		files: IListGateway.of(FileChangeSchema, {
			where: [{ prop: "commit", op: "is", value: { wants: "@flow/git-tree/selection" } }],
			sort: [{ prop: "path", dir: "asc" }],
			default: [],
		}),
		selection: IValueGateway.of(z.string().nullable().default(null)).pick("get", "update"),
		heading: IValueGateway.of(z.string().default("Files touched")).pick("get"),
		shownFiles: IValueGateway.of(z.number().default(SHOWN)).pick("get"),
		file: ISlot.of<{ file: FileFace }>({
			default: "@flow/file-row",
			surface: "group",
			gives: { file: ["path", "added", "removed", "change", "from"] },
		}),
	},
	draw: ({ files, selection, heading, shownFiles, file }) => {
		const size = askedCount(shownFiles, SHOWN);
		const { shown, more } = useShown(files.id, size);
		const listed = useData(files.list, { offset: 0, limit: shown });
		const Drawn = file as Drawn;
		const said = saidInstead(file, listed);
		const rows = listed.data as FileRow[];
		const total = listed.total ?? rows.length;
		const canPick = canDo(selection.update);

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
								isPicked={row.ref === selection.value}
								onPick={canPick ? () => selection.update(row.ref) : null}
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
			heading: { value: "Files touched" },
			files: {
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
		files: {
			label: "Files",
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
		selection: {
			label: "Selected file",
			hint: "Which file is picked. A diff standing beside this list binds to it and follows every press.",
			source: { implementation: "@core/selection", fields: { rows: "files" } },
		},
		heading: {
			label: "Heading",
			hint: "The words standing before the count. Left empty, only the count is drawn.",
		},
		shownFiles: {
			label: "Files shown",
			hint: "How many rows are read at once, and how many more each press adds.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 160, stackBelowPx: 260 },
});

export default FileList;

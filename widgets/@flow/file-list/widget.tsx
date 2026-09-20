import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, Slot, VaultRecord, WidgetProps } from "widgetarium";
import { Button, Count, SlotList } from "widgetarium/kit";

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
	color: var(--text-muted);
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
const SHOW_MORE = "Show more ({rest} left)";
const REST = "{rest}";

type FileChangeRecord = VaultRecord & {
	added?: number | string | null;
	removed?: number | string | null;
	change?: string | null;
	from?: string | null;
};

type FileFace = {
	filePath: string | null;
	added: number | string | null;
	removed: number | string | null;
	change: string | null;
	from: string | null;
};

type FileRow = Row<FileChangeRecord>;
type FileSlot = Slot<{ file: FileFace }>;
type Drawn = NonNullable<FileSlot>;
type FileListProps = WidgetProps<typeof manifest>;

function textOf(value: unknown): string | null {
	if (value === undefined || value === null) return null;
	const said = String(value).trim();
	return said === "" ? null : said;
}

function faceOf(row: FileRow): FileFace {
	return {
		filePath: textOf(row.path) ?? textOf(row.name),
		added: (row.added as number | string | null | undefined) ?? null,
		removed: (row.removed as number | string | null | undefined) ?? null,
		change: textOf(row.change),
		from: textOf(row.from),
	};
}

function askedCount(value: unknown, fallback: number): number {
	const asked = Math.round(Number(value));
	return Number.isFinite(asked) && asked > 0 ? asked : fallback;
}

function useShown(size: number, source: string) {
	const [shown, setShown] = useState(size);
	useEffect(() => setShown(size), [size, source]);
	return { shown, more: () => setShown(shown + size) };
}

function pressKeys(act: () => void) {
	return (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		act();
	};
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

function MoreRow({ rest, onMore }: { rest: number; onMore: () => void }) {
	if (rest <= 0) return null;
	return (
		<div className="ffl-more">
			<Button onClick={onMore}>{SHOW_MORE.replace(REST, String(rest))}</Button>
		</div>
	);
}

type PickedRowProps = { row: FileRow; Drawn: Drawn; isPicked: boolean; onPick: (() => void) | null };

function PickedRow({ row, Drawn, isPicked, onPick }: PickedRowProps) {
	const marks = ["ffl-pick", onPick ? "is-pressable" : "", isPicked ? "is-picked" : ""].filter(Boolean).join(" ");
	if (!onPick)
		return (
			<div className={marks}>
				<Drawn file={faceOf(row)} />
			</div>
		);

	return (
		<div
			className={marks}
			role="button"
			tabIndex={0}
			aria-pressed={isPicked}
			onClick={onPick}
			onKeyDown={pressKeys(onPick)}
		>
			<Drawn file={faceOf(row)} />
		</div>
	);
}

export const manifest = defineManifest({
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
	role: "collection",
	size: { collapseBelowPx: 160, stackBelowPx: 260 },
	slots: {
		file: {
			of: "widget",
			default: "@flow/file-row",
			surface: "group",
			gives: { file: ["path", "added", "removed", "change", "from"] },
		},
	},
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
		files: defineProp<FileChangeRecord[]>()({
			label: "Files",
			hint: "One record per file the change touched. Bind a commit list beside this one and the two move together.",
			default: [],
			sort: [{ prop: "path", dir: "asc" }],
			where: [{ prop: "commit", op: "is", value: { wants: "@flow/git-tree/selection" } }],
			describes: {
				path: { label: "Path", type: "line", aka: ["file", "filename", "filePath"] },
				added: { label: "Lines added", type: "number", aka: ["insertions", "additions"] },
				removed: { label: "Lines removed", type: "number", aka: ["deletions", "removals"] },
				change: { label: "Change", type: "line", aka: ["status", "kind", "changeType"] },
				from: { label: "Renamed from", type: "line", aka: ["oldPath", "previousPath", "renamedFrom"] },
				commit: { label: "Commit", type: "line", aka: ["sha", "revision", "hash"] },
			},
		}),
		selection: defineProp<string | null>()({
			label: "Selected file",
			hint: "Which file is picked. A diff standing beside this list binds to it and follows every press.",
			of: "files",
			default: null,
			writes: ["update"],
		}),
		heading: defineProp<string>()({
			label: "Heading",
			hint: "The words standing before the count. Left empty, only the count is drawn.",
			default: "Files touched",
		}),
		shownFiles: defineProp<number>()({
			label: "Files shown",
			hint: "How many rows are read at once, and how many more each press adds.",
			default: SHOWN,
		}),
	},
});

function Head({ heading, total }: { heading: FileListProps["heading"]; total: number }) {
	const said = textOf(useData(heading.get).data);
	return (
		<div className="ffl-head">
			{said === null ? null : <span className="ffl-title">{said}</span>}
			<Count>{total}</Count>
		</div>
	);
}

export default createWidget(manifest, ({ files, selection, heading, shownFiles, slots }) => {
	const size = askedCount(useData(shownFiles.get).data, SHOWN);
	const { shown, more } = useShown(size, files.id);
	const listed = useData(files.list, { offset: 0, limit: shown });
	const picked = useData(selection.get).data;
	const Drawn = slots?.file as Drawn;
	const said = saidInstead(slots?.file as FileSlot, listed);
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
							isPicked={row.ref === picked}
							onPick={canPick ? () => selection.update(row.ref) : null}
						/>
					))}
				</SlotList>
			)}
			{said === null ? <MoreRow rest={total - rows.length} onMore={more} /> : null}
		</div>
	);
});

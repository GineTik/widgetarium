import { useEffect, useState } from "react";
import {
	IListGateway,
	IValueGateway,
	VaultRecordSchema,
	type VaultRecord,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { askedCount, COUNTED_CEILING } from "@default/lib";
import { Bars } from "./bars";
import { Line } from "./line";
import type { Group } from "./types";

const SHOWN_AT_FIRST = 8;
const STEP = 8;
const BY_FOLDER = "folder";
const IN_ROOT = "(root)";
const NOT_SET = "(empty)";
const READING = "Reading…";
const NO_NOTES = "There are no notes here yet.";

const BreakdownBars = createWidget({
	inject: {
		records: IListGateway.of(VaultRecordSchema),
		groupBy: IValueGateway.of(z.string().default(BY_FOLDER)).pick("get"),
		shownAtFirst: IValueGateway.of(z.number().default(SHOWN_AT_FIRST)).pick("get"),
		step: IValueGateway.of(z.number().default(STEP)).pick("get"),
		showMoreButton: IValueGateway.of(z.boolean().default(true)).pick("get"),
	},
	draw: ({ records, groupBy, shownAtFirst, step, showMoreButton }) => {
		const read = useData(records.list, { limit: COUNTED_CEILING });
		const groupKey = groupBy.trim() || BY_FOLDER;
		const atFirst = askedCount(shownAtFirst, SHOWN_AT_FIRST);
		const added = askedCount(step, STEP);
		const [shown, setShown] = useState(atFirst);
		useEffect(() => setShown(atFirst), [atFirst]);

		if (read.failure !== null) return <Line tone="var(--text-error)" text={read.failure} />;
		if (read.isLoading && read.data.length === 0) return <Line tone="var(--text-faint)" text={READING} />;
		if (read.data.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_NOTES} />;

		return (
			<Bars
				groups={grouped(read.data, groupKey)}
				shown={shown}
				step={added}
				onMore={showMoreButton ? () => setShown(shown + added) : null}
				total={read.total}
			/>
		);
	},
});

export const metadata = defineMetadata(BreakdownBars, {
	title: "Breakdown bars",
	description: "How a collection splits across folders or one property, as bars ordered biggest first.",
	keywords: [
		"breakdown",
		"distribution",
		"bars",
		"bar chart",
		"group by",
		"analytics",
		"statistics",
		"share",
		"composition",
		"folders",
		"tags",
		"status",
		"histogram",
		"ranking",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			groupBy: { value: "status" },
			records: {
				rows: [
					{ path: "Books/One.md", name: "One", status: "Reading" },
					{ path: "Books/Two.md", name: "Two", status: "Reading" },
					{ path: "Books/Three.md", name: "Three", status: "Finished" },
					{ path: "Books/Four.md", name: "Four", status: "To read" },
				],
			},
		},
	},
	props: {
		records: {
			label: "Records",
			hint: "The notes to split up.",
		},
		groupBy: {
			label: "Group by",
			hint: "Write folder to split by the folder a note sits in, or the name of a property to split by its value.",
		},
		shownAtFirst: {
			label: "Bars shown at first",
			hint: "How many of the biggest groups get a bar before anything is pressed.",
			aka: ["shown"],
		},
		step: {
			label: "Bars added by a press",
			hint: "How many more bars each press of Show more draws.",
		},
		showMoreButton: {
			hint: "Whether a press may draw past the first bars. Without it the rest are summed into one line.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: 320 },
});

export default BreakdownBars;

function grouped(rows: VaultRecord[], groupKey: string): Group[] {
	const counts = new Map<string, number>();
	const root = groupKey === BY_FOLDER ? sharedFolderOf(rows) : "";
	for (const row of rows) {
		for (const key of keysOf(row, groupKey, root)) counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts].map(([key, count]) => ({ key, count })).sort(biggestFirst);
}

function biggestFirst(one: Group, two: Group): number {
	return two.count - one.count || one.key.localeCompare(two.key);
}

function keysOf(row: VaultRecord, groupKey: string, root: string): string[] {
	if (groupKey === BY_FOLDER) return [folderUnder(String(row.path ?? ""), root)];
	const held = row[groupKey] ?? row.props?.[groupKey];
	if (Array.isArray(held)) return held.length === 0 ? [NOT_SET] : held.map(labelOf);
	return [labelOf(held)];
}

function labelOf(value: unknown): string {
	if (value === null || value === undefined || value === "") return NOT_SET;
	if (typeof value === "object") return NOT_SET;
	return String(value);
}

function folderUnder(path: string, root: string): string {
	const rest = path.startsWith(root) ? path.slice(root.length) : path;
	const [first, ...deeper] = rest.split("/").filter(Boolean);
	return first !== undefined && deeper.length > 0 ? first : IN_ROOT;
}

function sharedFolderOf(rows: VaultRecord[]): string {
	const folders = rows.map((row) =>
		String(row.path ?? "")
			.split("/")
			.slice(0, -1),
	);
	if (folders.length === 0) return "";
	const shared = folders.reduce(sharedStart);
	return shared.length === 0 ? "" : `${shared.join("/")}/`;
}

function sharedStart(shared: string[], folder: string[]): string[] {
	let at = 0;
	while (at < shared.length && at < folder.length && shared[at] === folder[at]) at += 1;
	return shared.slice(0, at);
}

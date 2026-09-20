import { useEffect, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { VaultRecord } from "widgetarium";
import { Button } from "widgetarium/kit";
import { askedCount, COUNTED_CEILING, countedFirstLine } from "@default/lib";

const SHOWN_AT_FIRST = 8;
const STEP = 8;
const BY_FOLDER = "folder";
const IN_ROOT = "(root)";
const NOT_SET = "(empty)";
const READING = "Reading…";
const NO_NOTES = "There are no notes here yet.";
const LEFT_OUT = "{count} more — {sum} together";
const SHOW_MORE = "Show {count} more";

type Group = { key: string; count: number };

export const manifest = defineManifest({
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
	role: "collection",
	size: { collapseBelowPx: 220, stackBelowPx: 320 },
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
		records: defineProp<VaultRecord[]>()({
			label: "Records",
			hint: "The notes to split up.",
			default: [],
		}),
		groupBy: defineProp<string>()({
			label: "Group by",
			hint: "Write folder to split by the folder a note sits in, or the name of a property to split by its value.",
			default: BY_FOLDER,
		}),
		shownAtFirst: defineProp<number>()({
			label: "Bars shown at first",
			hint: "How many of the biggest groups get a bar before anything is pressed.",
			aka: ["shown"],
			default: SHOWN_AT_FIRST,
		}),
		step: defineProp<number>()({
			label: "Bars added by a press",
			hint: "How many more bars each press of Show more draws.",
			default: STEP,
		}),
		showMoreButton: defineProp<boolean>()({
			hint: "Whether a press may draw past the first bars. Without it the rest are summed into one line.",
			default: true,
		}),
	},
});

export default createWidget(manifest, ({ records, groupBy, shownAtFirst, step, showMoreButton }) => {
	const read = useData(records.list, { limit: COUNTED_CEILING });
	const groupKey = String(useData(groupBy.get).data ?? BY_FOLDER).trim() || BY_FOLDER;
	const atFirst = askedCount(useData(shownAtFirst.get).data, SHOWN_AT_FIRST);
	const added = askedCount(useData(step.get).data, STEP);
	const mayShowMore = useData(showMoreButton.get).data !== false;
	const [shown, setShown] = useState(atFirst);
	useEffect(() => setShown(atFirst), [atFirst]);

	if (read.failure !== null) return <Line tone="var(--text-error)" text={read.failure} />;
	if (read.isLoading && read.data.length === 0) return <Line tone="var(--text-faint)" text={READING} />;
	if (read.data.length === 0) return <Line tone="var(--text-muted)" text={NO_NOTES} />;

	return (
		<Bars
			groups={grouped(read.data, groupKey)}
			shown={shown}
			step={added}
			onMore={mayShowMore ? () => setShown(shown + added) : null}
			total={read.total}
		/>
	);
});

type BarsProps = { groups: Group[]; shown: number; step: number; onMore: (() => void) | null; total: number | null };

function Bars({ groups, shown, step, onMore, total }: BarsProps) {
	const top = groups.slice(0, shown);
	const widest = top[0]?.count ?? 1;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-items)" }}>
			{top.map((group) => (
				<Bar key={group.key} group={group} widest={widest} />
			))}
			<More left={groups.slice(top.length)} step={step} onMore={onMore} />
			<Ceiling total={total} />
		</div>
	);
}

function Bar({ group, widest }: { group: Group; widest: number }) {
	const width = Math.max(2, Math.round((group.count / widest) * 100));
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "var(--wg-gap-parts)" }}>
			<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--wg-gap-parts)" }}>
				<span>{group.key}</span>
				<span style={{ color: "var(--text-muted)" }}>{group.count}</span>
			</div>
			<div className="breakdown-track">
				<div className="breakdown-fill" style={{ width: `${width}%` }} />
			</div>
		</div>
	);
}

function More({ left, step, onMore }: { left: Group[]; step: number; onMore: (() => void) | null }) {
	if (left.length === 0) return null;
	if (onMore === null) return <Line tone="var(--text-faint)" text={leftOutLine(left)} />;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left.length)))}
		</Button>
	);
}

function leftOutLine(left: Group[]): string {
	const summed = left.reduce((sum, group) => sum + group.count, 0);
	return LEFT_OUT.replace("{count}", String(left.length)).replace("{sum}", String(summed));
}

function Ceiling({ total }: { total: number | null }) {
	const said = countedFirstLine(total);
	if (said === null) return null;
	return <Line tone="var(--text-faint)" text={said} />;
}

function Line({ tone, text }: { tone: string; text: string }) {
	return <div style={{ color: tone }}>{text}</div>;
}

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

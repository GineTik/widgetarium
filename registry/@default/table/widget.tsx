import { useEffect, useRef, useState } from "react";
import { createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { VaultRecord } from "widgetarium";
import { Button, Icon } from "widgetarium/kit";
import { Emoji } from "widgetarium/kit/emojis";
import { askedCount, EMOJI_PREFIX, heldProperties, heldValues, ICON_PREFIX } from "@default/lib";

const ROWS_AT_FIRST = 50;
const BLANK = "—";
const READING = "Reading…";
const NO_RECORDS = "There are no records here yet.";
const NO_COLUMNS = "None of these records carries a property to put in a column.";
const SHOW_MORE = "Show {count} more";
const EDGE_SLACK_PX = 1;
const COLUMNS_AT_MOST = 100;

type Column = { property: string; label?: string | null };

type Shown = { property: string; heading: string };

type Drawn =
	| { kind: "blank" }
	| { kind: "text"; text: string }
	| { kind: "emoji"; name: string; text: string }
	| { kind: "icon"; name: string; text: string };

type Fog = { left: boolean; right: boolean; top: boolean; bottom: boolean };

export const manifest = defineManifest({
	title: "Table",
	description: "The properties of a set of notes, one row per note and one column per property.",
	keywords: [
		"table",
		"grid",
		"matrix",
		"columns",
		"rows",
		"properties",
		"frontmatter",
		"metadata",
		"fields",
		"spreadsheet",
		"compare",
		"overview",
	],
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: 280 },
	preview: {
		size: { w: 6, h: 4 },
		props: {
			records: {
				rows: [
					{ name: "row / column", split: "yes", swap: "yes", strip: "first or last child", paged: "no" },
					{ name: "split", split: "unusual", swap: "yes", strip: "in each half", paged: "no" },
					{ name: "swap", split: "yes", swap: "no", strip: "no", paged: "no" },
					{ name: "centred", split: "one child", swap: "one child", strip: "via its column", paged: "no" },
				],
			},
			rowTitle: { value: "name" },
		},
	},
	props: {
		records: defineProp<VaultRecord[]>()({
			label: "Records",
			hint: "The notes the table draws, one row each. A value reading emoji:<name> or icon:<name> is drawn as that emoji or icon, with any words after it beside it.",
			default: [],
		}),
		columns: defineProp<Column[]>()({
			label: "Columns",
			hint: "Which properties get a column, in the order they are listed. Left empty, every property the records carry gets one.",
			default: [],
			describes: { property: "Property", label: "Label" },
		}),
		rowTitle: defineProp<string>()({
			label: "Row title property",
			hint: "The property drawn in the bare first column that names each row. Left empty, the table has no such column.",
			default: "",
		}),
		yesNo: defineProp<boolean>()({
			label: "Yes and no",
			hint: "Whether a true or false value is drawn as Yes or No.",
			default: false,
		}),
		rowsAtFirst: defineProp<number>()({
			label: "Rows shown at first",
			hint: "How many records get a row before Show more is pressed. Each press draws that many again.",
			default: ROWS_AT_FIRST,
		}),
		fadeEdges: defineProp<boolean>()({
			label: "Fade the scrolling edges",
			hint: "Whether an edge the table carries on past dissolves, so there is something to say it scrolls.",
			default: true,
			design: true,
		}),
	},
});

export default createWidget(manifest, ({ records, columns, rowTitle, yesNo, rowsAtFirst, fadeEdges }) => {
	const atFirst = askedCount(useData(rowsAtFirst.get).data, ROWS_AT_FIRST);
	const [shown, setShown] = useState(atFirst);
	useEffect(() => setShown(atFirst), [atFirst]);

	const read = useData(records.list, { limit: shown });
	const declared = useData(columns.list, { limit: COLUMNS_AT_MOST }).data;
	const titleProperty = String(useData(rowTitle.get).data ?? "").trim();
	const isYesNo = useData(yesNo.get).data === true;
	const isFaded = useData(fadeEdges.get).data !== false;

	if (read.failure !== null) return <Line tone="var(--text-error)" text={read.failure} />;
	if (read.isLoading && read.data.length === 0) return <Line tone="var(--text-faint)" text={READING} />;
	if (read.data.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_RECORDS} />;

	const shownColumns = shownColumnsOf(declared, read.data, titleProperty);
	if (shownColumns.length === 0 && titleProperty === "") return <Line tone="var(--wg-kit-text-muted)" text={NO_COLUMNS} />;

	return (
		<div className="wg-tbl">
			<Grid rows={read.data} columns={shownColumns} titleProperty={titleProperty} isYesNo={isYesNo} isFaded={isFaded} />
			<More left={leftOver(read.total, read.data.length)} step={atFirst} onMore={() => setShown(shown + atFirst)} />
		</div>
	);
});

type GridProps = {
	rows: VaultRecord[];
	columns: Shown[];
	titleProperty: string;
	isYesNo: boolean;
	isFaded: boolean;
};

function Grid({ rows, columns, titleProperty, isYesNo, isFaded }: GridProps) {
	const hasTitle = titleProperty !== "";
	const { scrollRef, fog } = useFog(isFaded, `${rows.length}:${columns.length}:${hasTitle}`);

	return (
		<div
			ref={scrollRef}
			className="wg-tbl-scroll"
			data-fog={isFaded ? "" : undefined}
			data-fog-left={fog.left ? "" : undefined}
			data-fog-right={fog.right ? "" : undefined}
			data-fog-top={fog.top ? "" : undefined}
			data-fog-bottom={fog.bottom ? "" : undefined}
		>
			<div className="wg-tbl-grid" style={{ gridTemplateColumns: templateOf(columns.length, hasTitle) }}>
				{hasTitle ? <div className="wg-tbl-head-title">{titleProperty}</div> : null}
				{columns.map((column) => (
					<div className="wg-tbl-head" key={column.property}>
						<Cell drawn={{ kind: "text", text: column.heading }} />
					</div>
				))}
				{rows.map((row) => (
					<Row key={String(row.ref)} row={row} columns={columns} titleProperty={titleProperty} isYesNo={isYesNo} />
				))}
			</div>
		</div>
	);
}

type RowProps = { row: VaultRecord; columns: Shown[]; titleProperty: string; isYesNo: boolean };

function Row({ row, columns, titleProperty, isYesNo }: RowProps) {
	const held = heldValues(row);
	return (
		<>
			{titleProperty === "" ? null : (
				<div className="wg-tbl-title">
					<Cell drawn={drawnOf(held[titleProperty], isYesNo)} />
				</div>
			)}
			{columns.map((column) => (
				<div className="wg-tbl-cell" key={column.property}>
					<Cell drawn={drawnOf(held[column.property], isYesNo)} />
				</div>
			))}
		</>
	);
}

function Cell({ drawn }: { drawn: Drawn }) {
	const said = textIn(drawn);
	return (
		<>
			{drawn.kind === "emoji" ? <Emoji name={drawn.name} size={16} /> : null}
			{drawn.kind === "icon" ? <Icon name={drawn.name} size={15} /> : null}
			{said === "" ? null : <span className={drawn.kind === "blank" ? "wg-tbl-blank" : "wg-tbl-text"}>{said}</span>}
		</>
	);
}

function textIn(drawn: Drawn): string {
	return drawn.kind === "blank" ? BLANK : drawn.text;
}

function More({ left, step, onMore }: { left: number; step: number; onMore: () => void }) {
	if (left <= 0) return null;
	return (
		<Button size="s" onClick={onMore}>
			{SHOW_MORE.replace("{count}", String(Math.min(step, left)))}
		</Button>
	);
}

function Line({ tone, text }: { tone: string; text: string }) {
	return <div style={{ color: tone }}>{text}</div>;
}

function useFog(isFaded: boolean, signature: string) {
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [fog, setFog] = useState<Fog>({ left: false, right: false, top: false, bottom: false });

	useEffect(() => {
		const node = scrollRef.current;
		if (node === null || !isFaded) return undefined;
		const measure = () => setFog(fogOf(node));
		measure();
		node.addEventListener("scroll", measure, { passive: true });
		const watch = new ResizeObserver(measure);
		watch.observe(node);
		for (const child of Array.from(node.children)) watch.observe(child);
		return () => {
			node.removeEventListener("scroll", measure);
			watch.disconnect();
		};
	}, [isFaded, signature]);

	return { scrollRef, fog };
}

function fogOf(node: HTMLElement): Fog {
	return {
		left: node.scrollLeft > EDGE_SLACK_PX,
		right: node.scrollLeft + node.clientWidth < node.scrollWidth - EDGE_SLACK_PX,
		top: node.scrollTop > EDGE_SLACK_PX,
		bottom: node.scrollTop + node.clientHeight < node.scrollHeight - EDGE_SLACK_PX,
	};
}

function templateOf(columnCount: number, hasTitle: boolean): string {
	const title = hasTitle ? "minmax(144px, 1.6fr)" : "";
	const rest = columnCount === 0 ? "" : `repeat(${columnCount}, minmax(116px, 1fr))`;
	return [title, rest].filter((part) => part !== "").join(" ");
}

function shownColumnsOf(declared: Column[], rows: VaultRecord[], titleProperty: string): Shown[] {
	const named = declared.map(shownOf).filter((one) => one.property !== "");
	const all = named.length > 0 ? named : foundProperties(rows).map((property) => ({ property, heading: property }));
	return all.filter((one) => one.property !== titleProperty);
}

function foundProperties(rows: VaultRecord[]): string[] {
	const found = new Set<string>();
	for (const row of rows) for (const key of Object.keys(heldProperties(row))) found.add(key);
	return [...found];
}

function shownOf(column: Column): Shown {
	const property = String(column.property ?? "").trim();
	const written = String(column.label ?? "").trim();
	return { property, heading: written === "" ? property : written };
}

function leftOver(total: number | null, rendered: number): number {
	return typeof total === "number" ? total - rendered : 0;
}

function drawnOf(value: unknown, isYesNo: boolean): Drawn {
	if (value === null || value === undefined) return { kind: "blank" };
	if (typeof value === "boolean") return { kind: "text", text: saidBoolean(value, isYesNo) };
	if (Array.isArray(value)) return drawnFromText(value.map((part) => saidPart(part, isYesNo)).join(", "));
	if (typeof value === "object") return drawnFromText(JSON.stringify(value));
	return drawnFromText(String(value));
}

function saidPart(value: unknown, isYesNo: boolean): string {
	if (typeof value === "boolean") return saidBoolean(value, isYesNo);
	if (value === null || value === undefined) return "";
	return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function saidBoolean(value: boolean, isYesNo: boolean): string {
	if (isYesNo) return value ? "Yes" : "No";
	return value ? "true" : "false";
}

function drawnFromText(written: string): Drawn {
	const text = written.trim();
	if (text === "") return { kind: "blank" };
	if (text.startsWith(EMOJI_PREFIX)) return namedDrawing("emoji", text.slice(EMOJI_PREFIX.length));
	if (text.startsWith(ICON_PREFIX)) return namedDrawing("icon", text.slice(ICON_PREFIX.length));
	return { kind: "text", text };
}

function namedDrawing(kind: "emoji" | "icon", rest: string): Drawn {
	const written = rest.trim();
	const at = written.indexOf(" ");
	if (at === -1) return { kind, name: written, text: "" };
	return { kind, name: written.slice(0, at), text: written.slice(at + 1).trim() };
}

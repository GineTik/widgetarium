import { useEffect, useState } from "react";
import {
	IQuery,
	VaultRecord,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	useData,
	z,
} from "widgetarium";
import { Line } from "widgetarium/kit";
import { askedCount, heldProperties } from "@default/lib";
import { Grid } from "./grid";
import { More } from "./more";
import type { Shown } from "./types";

const ROWS_AT_FIRST = 50;

const READING = "Reading…";
const NO_RECORDS = "There are no records here yet.";
const NO_COLUMNS = "None of these records carries a property to put in a column.";

const COLUMNS_AT_MOST = 100;

const ColumnSchema = z.object({ property: z.string(), label: z.string().nullable().optional() });

type Column = z.infer<typeof ColumnSchema>;

const TableWidget = createWidget({
	inject: {
		getRecords: IQuery.expects(z.array(VaultRecordSchema)),
		getColumns: IQuery.expects(z.array(ColumnSchema)),
		getRowTitle: IQuery.expects(z.string().default("")),
		getYesNo: IQuery.expects(z.boolean().default(false)),
		getRowsAtFirst: IQuery.expects(z.number().default(ROWS_AT_FIRST)),
		getFadeEdges: IQuery.expects(z.boolean().default(true)),
	},
	draw: ({
		getRecords,
		getColumns,
		getRowTitle: rowTitle,
		getYesNo: yesNo,
		getRowsAtFirst: rowsAtFirst,
		getFadeEdges: fadeEdges,
	}) => {
		const atFirst = askedCount(rowsAtFirst, ROWS_AT_FIRST);
		const [shown, setShown] = useState(atFirst);
		useEffect(() => setShown(atFirst), [atFirst]);

		const read = useData(getRecords, { limit: shown });
		const declared = useData(getColumns, { limit: COLUMNS_AT_MOST }).data;
		const titleProperty = String(rowTitle ?? "").trim();
		const isYesNo = yesNo === true;
		const isFaded = fadeEdges !== false;

		if (read.failure !== null) return <Line tone="var(--text-error)" text={read.failure} />;
		if (read.isLoading && read.data.length === 0) return <Line tone="var(--text-faint)" text={READING} />;
		if (read.data.length === 0) return <Line tone="var(--wg-kit-text-muted)" text={NO_RECORDS} />;

		const shownColumns = shownColumnsOf(declared, read.data, titleProperty);
		if (shownColumns.length === 0 && titleProperty === "")
			return <Line tone="var(--wg-kit-text-muted)" text={NO_COLUMNS} />;

		return (
			<div className="wg-tbl">
				<Grid
					rows={read.data}
					columns={shownColumns}
					titleProperty={titleProperty}
					isYesNo={isYesNo}
					isFaded={isFaded}
				/>
				<More left={leftOver(read.total, read.data.length)} step={atFirst} onMore={() => setShown(shown + atFirst)} />
			</div>
		);
	},
});

export const metadata = defineMetadata(TableWidget, {
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
	preview: {
		size: { w: 6, h: 4 },
		props: {
			getRecords: {
				rows: [
					{ name: "row / column", split: "yes", swap: "yes", strip: "first or last child", paged: "no" },
					{ name: "split", split: "unusual", swap: "yes", strip: "in each half", paged: "no" },
					{ name: "swap", split: "yes", swap: "no", strip: "no", paged: "no" },
					{ name: "centred", split: "one child", swap: "one child", strip: "via its column", paged: "no" },
				],
			},
			getRowTitle: { value: "name" },
		},
	},
	props: {
		getRecords: {
			label: "Records",
			aka: ["records"],
			hint: "The notes the table draws, one row each. A value reading emoji:<name> or icon:<name> is drawn as that emoji or icon, with any words after it beside it.",
		},
		getColumns: {
			label: "Columns",
			aka: ["columns"],
			hint: "Which properties get a column, in the order they are listed. Left empty, every property the records carry gets one.",
			describes: { property: "Property", label: "Label" },
		},
		getRowTitle: {
			label: "Row title property",
			aka: ["rowTitle"],
			hint: "The property drawn in the bare first column that names each row. Left empty, the table has no such column.",
		},
		getYesNo: {
			label: "Yes and no",
			aka: ["yesNo"],
			hint: "Whether a true or false value is drawn as Yes or No.",
		},
		getRowsAtFirst: {
			label: "Rows shown at first",
			aka: ["rowsAtFirst"],
			hint: "How many records get a row before Show more is pressed. Each press draws that many again.",
		},
		getFadeEdges: {
			label: "Fade the scrolling edges",
			aka: ["fadeEdges"],
			hint: "Whether an edge the table carries on past dissolves, so there is something to say it scrolls.",
			design: true,
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 220, stackBelowPx: 280 },
});

export default TableWidget;

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

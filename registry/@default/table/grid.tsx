import { VaultRecord } from "widgetarium";
import { Cell } from "./cell";
import { Row } from "./row";
import type { Shown } from "./types";
import { useFog } from "./use-fog";

type GridProps = {
	rows: VaultRecord[];
	columns: Shown[];
	titleProperty: string;
	isYesNo: boolean;
	isFaded: boolean;
};

export function Grid({ rows, columns, titleProperty, isYesNo, isFaded }: GridProps) {
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

function templateOf(columnCount: number, hasTitle: boolean): string {
	const title = hasTitle ? "minmax(144px, 1.6fr)" : "";
	const rest = columnCount === 0 ? "" : `repeat(${columnCount}, minmax(116px, 1fr))`;
	return [title, rest].filter((part) => part !== "").join(" ");
}

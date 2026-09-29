import { useRef, useState } from "react";
import { VaultRecord } from "widgetarium";
import { useScrollFog } from "widgetarium/kit";
import { Cell } from "./cell";
import { Row } from "./row";
import type { Shown } from "./types";

type Fog = { left: boolean; right: boolean; top: boolean; bottom: boolean };
type Edges = { left: number; right: number; top: number; bottom: number };

const EDGE_SLACK_PX = 1;
const NO_FOG: Fog = { left: false, right: false, top: false, bottom: false };

type GridProps = {
	rows: VaultRecord[];
	columns: Shown[];
	titleProperty: string;
	isYesNo: boolean;
	isFaded: boolean;
};

export function Grid({ rows, columns, titleProperty, isYesNo, isFaded }: GridProps) {
	const hasTitle = titleProperty !== "";
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const [fog, setFog] = useState<Fog>(NO_FOG);
	useScrollFog(
		scrollRef,
		(edges: Edges) => {
			if (isFaded) setFog((held) => sameOrNext(held, fogOf(edges)));
		},
		`${rows.length}:${columns.length}:${hasTitle}`,
	);

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

function fogOf(edges: Edges): Fog {
	return {
		left: edges.left > EDGE_SLACK_PX,
		right: edges.right > EDGE_SLACK_PX,
		top: edges.top > EDGE_SLACK_PX,
		bottom: edges.bottom > EDGE_SLACK_PX,
	};
}

function sameOrNext(held: Fog, next: Fog): Fog {
	const isSame =
		held.left === next.left && held.right === next.right && held.top === next.top && held.bottom === next.bottom;
	return isSame ? held : next;
}

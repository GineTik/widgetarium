import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, pickedValue, z } from "widgetarium";
import { BoardSchema, archivedColumnsOf, patchColumn, columnsOf, columnsToWrite, restoreColumn } from "@default/lib";
import { Button, Icon, List, Row, RowLabel } from "widgetarium/kit";

const STYLE = `
.orbi-archived-columns {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	overflow: auto;
}

.oac-head {
	display: flex;
	align-items: baseline;
	gap: var(--size-4-2, 8px);
}

.oac-title {
	margin: 0;
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
}

.oac-board {
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.oac-restore {
	flex: none;
}

.oac-soon {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-4, 16px);
	border: 1px dashed var(--background-modifier-border);
	border-radius: var(--wg-kit-item);
}

.oac-soon-line {
	display: flex;
	align-items: flex-start;
	gap: var(--size-4-2, 8px);
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.oac-soon-line svg {
	flex: none;
	margin-top: 2px;
}
`;

const ArchivedColumns = createWidget({
	inject: {
		getBoards: IQuery.expects(z.array(BoardSchema)),
		getSelection: IQuery.expects(z.unknown()),
		getBoard: IQuery.expects(BoardSchema.nullable().default(null)),
		updateBoard: ICommand.sends(BoardSchema),
	},
	draw: ({ getSelection: selection, getBoard: record, updateBoard }) => {
		const onBoard = pickedValue(selection);
		const columns = columnsOf(record);
		const archived: string[] = archivedColumnsOf(columns);
		const restore = (name: string) => void updateBoard(columnsToWrite(patchColumn(columns, name, restoreColumn)));

		return (
			<div className="orbi orbi-archived-columns">
				<style>{STYLE}</style>
				<div className="oac-head">
					<h3 className="oac-title">Archived columns</h3>
					<span className="oac-board">{onBoard ? onBoard : "No board selected"}</span>
				</div>
				{archived.length === 0 ? (
					<div className="oac-soon">
						<p className="oac-soon-line">
							<Icon name="archive" size={15} />
							Every column archived from this board, with the tasks still filed under it.
						</p>
						<p className="oac-soon-line">
							<Icon name="chevron" size={15} />
							Restore puts a column back on the board it came from.
						</p>
						<p className="oac-soon-line">
							<Icon name="folder" size={15} />
							Archived boards are not here — they live behind the board strip's own menu.
						</p>
					</div>
				) : (
					<List>
						{archived.map((name) => (
							<Row key={name}>
								<RowLabel>{name}</RowLabel>
								<Button size="s" className="oac-restore" onClick={() => restore(name)}>
									Restore
								</Button>
							</Row>
						))}
					</List>
				)}
			</div>
		);
	},
});

export const metadata = defineMetadata(ArchivedColumns, {
	title: "Archived columns",
	description: "Lists the columns a board has put away, with the tasks still sitting in them.",
	keywords: [
		"archive",
		"archived",
		"hidden",
		"columns",
		"board",
		"kanban",
		"storage",
		"restore",
		"put away",
		"old",
		"closed",
		"backlog",
	],
	preview: {
		size: { w: 5, h: 4 },
		props: {
			getBoard: {
				value: {
					columns: [
						{ name: "Blocked", archivedAt: "2026-09-01" },
						{ name: "On hold", archivedAt: "2026-09-01" },
					],
				},
			},
		},
		shot: { of: "134271609" },
	},
	props: {
		getBoards: {
			label: "Boards",
			aka: ["boards"],
		},
		getSelection: {
			label: "Shown board",
			hint: "Whose archived columns are listed. Bind a tab strip and the two move together.",
			aka: ["selection"],
			wants: "@default/editable-tabs/getSelection",
			source: {
				implementation: "@core/selection",
				fields: { rows: "getBoards", field: "board", whenNothingPicked: "first" },
			},
		},
		getBoard: {
			label: "Board",
			hint: "The board whose archived columns are listed.",
			aka: ["board"],
			wants: "@default/kanban-board/getBoard",
			source: {
				implementation: "@core/selected-row",
				fields: { rows: "getBoards", picked: "getSelection", field: "board", whenNothingPicked: "first" },
			},
		},
		updateBoard: {
			label: "Restore a column",
			source: { implementation: "@core/value-set", fields: { target: "getBoard" } },
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240 },
	view: "Archived columns",
});

export default ArchivedColumns;

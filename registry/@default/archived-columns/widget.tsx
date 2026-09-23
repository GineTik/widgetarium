import { createWidget, defineManifest, defineProp, pickedValue, useData } from "widgetarium";
import { archivedColumnsOf, columnPatched, columnsOf, columnsWritten, restored } from "@default/lib";
import type { Board } from "@default/lib";
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

// CONTEXT: archived BOARDS stay behind the tab strip's menu; this view holds columns only

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 240 },
	view: "Archived columns",
	preview: {
		size: { w: 5, h: 4 },
		props: {
			board: {
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
		boards: defineProp<Board[]>()({
			label: "Boards",
			default: [],
			writes: ["update"],
		}),
		selection: defineProp<string>()({
			label: "Shown board",
			hint: "Whose archived columns are listed. Bind a tab strip and the two move together.",
			of: "boards",
			field: "board",
			fallback: "first",
			wants: "@default/editable-tabs/selection",
		}),
		board: defineProp<Board>()({
			label: "Board",
			hint: "The board whose archived columns are listed.",
			picks: "selection",
			of: "boards",
			wants: "@default/kanban-board/board",
			writes: ["update"],
		}),
	},
});

export default createWidget(manifest, ({ selection, board }) => {
	const onBoard = pickedValue(useData(selection.get).data);
	const record = useData(board.get).data;
	const columns = columnsOf(record);
	const archived: string[] = archivedColumnsOf(columns);
	const restore = (name: string) => board.update(columnsWritten(columnPatched(columns, name, restored)));

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
});

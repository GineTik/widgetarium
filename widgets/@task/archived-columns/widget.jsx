import { createWidget, WidgetRoot } from "widgetarium";
import { Button, Icon, List, Row, RowLabel } from "widgetarium/kit";

const STYLE = `
.orbi-archived-columns {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	padding: var(--size-4-4, 16px);
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
	color: var(--text-muted);
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
	color: var(--text-muted);
}

.oac-soon-line svg {
	flex: none;
	margin-top: 2px;
}
`;

// CONTEXT: archived BOARDS stay behind the tab strip's menu; this view holds columns only
export default createWidget(function OrbiTaskArchivedColumns({ context, board, configureBoard }) {
	const onBoard = context?.get("board");
	// CONTEXT: the board owns the list, so it reads the same whether or not the kanban is drawn
	const archived = board?.archivedColumns ?? [];
	const restore = (name) => configureBoard?.({ archivedColumns: archived.filter((column) => column !== name) });

	return (
		<WidgetRoot className="orbi orbi-archived-columns">
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
		</WidgetRoot>
	);
});

import { createWidget, WidgetRoot } from "widgetarium";
import { Icon } from "widgetarium/kit";

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
export default createWidget(function OrbiTaskArchivedColumns({ context }) {
	const board = context?.get("board");

	return (
		<WidgetRoot className="orbi orbi-archived-columns">
			<style>{STYLE}</style>
			<div class="oac-head">
				<h3 class="oac-title">Archived columns</h3>
				<span class="oac-board">{board ? board : "No board selected"}</span>
			</div>
			<div class="oac-soon">
				<p class="oac-soon-line">
					<Icon name="archive" size={15} />
					Every column archived from this board, with the tasks still filed under it.
				</p>
				<p class="oac-soon-line">
					<Icon name="chevron" size={15} />
					Restore puts a column back on the board it came from.
				</p>
				<p class="oac-soon-line">
					<Icon name="folder" size={15} />
					Archived boards are not here — they live behind the board strip's own menu.
				</p>
			</div>
		</WidgetRoot>
	);
});

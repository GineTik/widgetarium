export const CSS = `
.flow-project-grid {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-project-grid .flow-project-grid-cells.wg-kit-slot-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
	align-content: start;
}

.flow-project-grid-cell {
	display: flex;
	min-width: 0;
	border-radius: var(--wg-kit-plate);
	cursor: pointer;
	transition:
		box-shadow var(--wg-quick) var(--wg-ease),
		transform var(--wg-press) var(--wg-ease);
}

.flow-project-grid-cell > * {
	flex: 1 1 auto;
	min-width: 0;
}

.flow-project-grid-cell:active {
	transform: scale(0.985);
}

.flow-project-grid-cell.is-picked {
	box-shadow: 0 0 0 2px var(--wg-kit-accent);
}

.flow-project-grid-cell:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.flow-project-grid-more {
	flex: none;
	align-self: flex-start;
}

.flow-project-grid-said {
	margin: 0;
	font-size: var(--font-ui-small);
	color: var(--wg-kit-text-muted);
}
`;

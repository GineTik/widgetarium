export const CSS = `
.flow-report {
	display: grid;
	grid-template-columns:
		[wide-start measure-start] minmax(0, var(--flow-report-measure, 68ch))
		[measure-end] minmax(0, 1fr) [wide-end];
	align-content: start;
	row-gap: var(--wg-gap-items);
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-report > * {
	grid-column: measure;
	min-width: 0;
}

.flow-report > .flow-report-figures {
	grid-column: wide;
}

.flow-report-prose.markdown-rendered > :first-child {
	margin-top: 0;
}

.flow-report-prose.markdown-rendered > :last-child {
	margin-bottom: 0;
}

.flow-report-plain {
	margin: 0;
	white-space: pre-wrap;
	font: inherit;
}

.flow-report-said {
	margin: 0;
	color: var(--wg-kit-text-muted);
}

.flow-report-part {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-part-name {
	margin: 0;
}

.flow-report-steps,
.flow-report-fixes {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-items);
	margin: 0;
	padding: 0;
	list-style: none;
	min-width: 0;
}

.flow-report-step {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr);
	align-items: start;
	column-gap: var(--wg-gap-parts);
	row-gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-step .wg-kit-icon-glyph {
	color: var(--text-faint);
}

.flow-report-step[data-done] .wg-kit-icon-glyph {
	color: var(--wg-kit-success);
}

.flow-report-step-what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.flow-report-step-expected {
	grid-column: 2;
	min-width: 0;
	color: var(--wg-kit-text-muted);
	overflow-wrap: anywhere;
}

.flow-report-fix {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-fix-what {
	min-width: 0;
	overflow-wrap: anywhere;
}

.flow-report-fix-where {
	color: var(--wg-kit-text-muted);
	overflow-wrap: anywhere;
}

.flow-report-pager {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-report-pager-said {
	color: var(--wg-kit-text-muted);
}

@container widget (width < 360px) {
	.flow-report-pager-said {
		flex-basis: 100%;
		order: -1;
	}
}
`;

export const CSS = `
.flow-inflight {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-inflight-said {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	color: var(--wg-kit-text-muted);
}

.flow-inflight-more {
	display: flex;
	flex: none;
	justify-content: center;
}

.flow-inflight-pick {
	position: relative;
	border-radius: var(--wg-kit-plate);
	cursor: pointer;
}

.flow-inflight-pick[aria-pressed="true"] {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: -2px;
}

.flow-inflight-pick[aria-pressed="true"]::before {
	content: "";
	position: absolute;
	z-index: 1;
	top: 25%;
	bottom: 25%;
	left: 0;
	width: 3px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.flow-inflight-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}
`;

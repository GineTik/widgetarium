import { NARROW_PX } from "./narrow";

export const CSS = `
.mt-tracks {
	--mt-w-index: 30px;
	--mt-w-album: 168px;
	--mt-w-added: 104px;
	--mt-w-fav: 36px;
	--mt-w-time: 60px;
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
}

/* TRADE-OFF: the kit row's own 12px 16px is dropped and the item plate's inset written back, so the labels stand over the rows rather than 16px inside them */
:is(.wg-root, .wg-portal) .mt-head {
	padding: 0 var(--wg-group-pad);
	color: var(--text-faint);
	font-size: var(--font-ui-smaller);
}

.mt-head .mt-index {
	flex: none;
	width: var(--mt-w-index);
}

:is(.wg-root, .wg-portal) .mt-head .mt-col {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	color: var(--text-faint);
}

:is(.wg-root, .wg-portal) .mt-head .mt-col-album { width: var(--mt-w-album); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-added { width: var(--mt-w-added); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-fav { width: var(--mt-w-fav); }
:is(.wg-root, .wg-portal) .mt-head .mt-col-time { width: var(--mt-w-time); text-align: right; }

:is(.wg-root, .wg-portal) .mt-head .mt-title {
	font-weight: var(--font-normal);
}

.mt-pick {
	position: relative;
	min-width: 0;
	cursor: pointer;
	border-radius: var(--wg-kit-plate);
}

.mt-pick[data-picked]::before {
	content: "";
	position: absolute;
	inset-block: 25%;
	inset-inline-start: 0;
	width: 3px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.mt-pick:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.mt-foot {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	color: var(--text-faint);
	font-size: var(--font-ui-smaller);
}

.mt-said {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--wg-gap-parts);
	margin: 0;
	color: var(--wg-kit-text-muted);
}

.mt-said-error { color: var(--text-error); }
.mt-said-faint { color: var(--text-faint); }
.mt-said p { margin: 0; }

@container widget (width < ${NARROW_PX}px) {
	.mt-head { display: none; }
}
`;

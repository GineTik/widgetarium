export const CSS = `
.wgm-player {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-items);
	min-width: 0;
}

.wgm-cover {
	display: grid;
	flex: none;
	place-items: center;
	overflow: hidden;
	width: 96px;
	height: 96px;
	border-radius: var(--wg-kit-card-corner);
	background: var(--wg-kit-fill);
	color: var(--text-faint);
}

.wgm-cover img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.wgm-body {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.wgm-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.wgm-meta {
	flex: 1;
	min-width: 0;
}

.wgm-title,
.wgm-artist {
	display: block;
	overflow: hidden;
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.wgm-title {
	font-size: var(--font-ui-medium, 15px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
}

.wgm-artist {
	font-size: var(--font-ui-small, 14px);
	line-height: var(--line-height-tight, 1.25);
	color: var(--wg-kit-text-muted);
}

.wgm-idle {
	flex: none;
}

.wgm-fav {
	flex: none;
}

.wgm-fav.is-on {
	color: var(--wg-kit-highlight);
}

.wgm-fav.is-on .wg-kit-icon-glyph {
	fill: currentColor;
}

.wgm-deck {
	display: grid;
	align-items: center;
	grid-template-columns: 1fr auto 1fr;
	gap: var(--size-4-2, 8px);
}

.wgm-transport {
	display: flex;
	align-items: center;
	justify-content: center;
	grid-column: 2;
	gap: var(--size-4-2, 8px);
}

.wgm-player .wgm-play-disc::before {
	border-radius: var(--wg-kit-pill);
}

.wgm-volume {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	grid-column: 3;
	gap: var(--size-4-2, 8px);
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wgm-volume-bar {
	flex: none;
	width: 96px;
}

.wgm-seek {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.wgm-seek-bar {
	flex: 1;
	min-width: 0;
}

.wgm-seek-bar .wg-kit-progress,
.wgm-volume-bar .wg-kit-progress {
	width: 100%;
}

.wgm-player .wg-kit-progress-num {
	display: none;
}

.wgm-time {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.wgm-player [data-inert="true"] {
	opacity: 0.45;
	pointer-events: none;
}

.wgm-none {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wgm-none-line {
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	line-height: var(--line-height-normal, 1.5);
}

@container widget (width < 520px) {
	.wgm-player .wgm-volume { display: none; }
}

@container widget (width < 420px) {
	.wgm-player .wgm-time { display: none; }
}

@container widget (width < 340px) {
	.wgm-player .wgm-mode { display: none; }

	.wgm-player .wgm-cover {
		width: 56px;
		height: 56px;
	}
}
`;

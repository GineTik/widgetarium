export const CSS = `
.wg-tail {
	position: relative;
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.wg-tail-scroll {
	flex: 1 1 auto;
	min-width: 0;
	min-height: 0;
	overflow-x: hidden;
	overflow-y: auto;
	overscroll-behavior: contain;
}

.wg-tail-scroll > .wg-kit-slot-list {
	justify-content: flex-end;
	min-height: 100%;
}

.wg-tail-said {
	margin: auto 0 0;
	color: var(--wg-kit-text-muted);
}

.wg-tail-waiting {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	margin: auto 0 0;
	min-width: 0;
	color: var(--wg-kit-text-muted);
}

.wg-tail-turn {
	flex: none;
	box-sizing: border-box;
	width: 18px;
	height: 18px;
	border: 2px solid var(--wg-kit-fill);
	border-top-color: var(--wg-kit-accent);
	border-radius: var(--wg-kit-pill);
	animation: wg-tail-turning 900ms linear infinite;
}

.wg-tail-track {
	overflow: hidden;
	flex: none;
	width: 96px;
	height: 4px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.wg-tail-sweep {
	display: block;
	width: 40%;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
	animation: wg-tail-sweeping 1400ms ease-in-out infinite;
}

.wg-tail-back {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	display: flex;
	justify-content: center;
	pointer-events: none;
}

.wg-tail-back > * { pointer-events: auto; }

@keyframes wg-tail-turning {
	to { transform: rotate(360deg); }
}

@keyframes wg-tail-sweeping {
	from { transform: translateX(-110%); }
	to { transform: translateX(260%); }
}

@media (prefers-reduced-motion: reduce) {
	.wg-tail-turn, .wg-tail-sweep { animation: none; }
}
`;

import { ACROSS, RUN_OVERHANG_PX } from "./grid-measures";

export const STYLE = `
.habit-month {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts, 16px);
	overflow: hidden;
}

.hm-head {
	flex: none;
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto;
	align-items: center;
	gap: var(--size-4-2, 8px);
}

.hm-flip {
	transform: rotate(180deg);
}

.hm-mid {
	display: flex;
	flex-direction: column;
	align-items: center;
	min-width: 0;
}

.hm-note {
	max-width: 100%;
	font-size: max(10px, min(var(--font-ui-smaller, 12px), calc(var(--hm-ring) * 0.46)));
	color: var(--wg-kit-text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hm-title {
	text-align: center;
	font-size: max(11px, min(var(--font-ui-medium, 15px), calc(var(--hm-ring) * 0.62)));
	font-weight: var(--font-semibold, 600);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hm-room {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	gap: var(--hm-weekday-gap);
}

.hm-weekdays,
.hm-days {
	flex: none;
	display: grid;
	grid-template-columns: repeat(${ACROSS}, minmax(0, 1fr));
	margin-inline: calc((100% - ${ACROSS} * (var(--hm-ring) + ${2 * RUN_OVERHANG_PX}px)) / -${2 * (ACROSS - 1)});
}

.hm-days {
	grid-auto-rows: auto;
	row-gap: var(--hm-gap);
}

.hm-weekday {
	display: grid;
	place-items: center;
	height: var(--hm-weekday);
	font-size: calc(var(--hm-weekday) * 0.72);
	font-weight: var(--font-medium, 500);
	line-height: 1;
	color: var(--text-faint);
}

/* TRADE-OFF: doubled selector for (0,2,0) — the host paints bare buttons at (0,1,1) and outranks one class */
.habit-month .hm-day,
.habit-month .hm-day:hover {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--hm-number-gap);
	height: auto;
	min-height: 0;
	padding: 0;
	border: 0;
	border-radius: 0;
	background: none;
	box-shadow: none;
	cursor: pointer;
	color: var(--wg-kit-text);
}

.habit-month .hm-day[disabled] {
	cursor: default;
}

.hm-number {
	flex: none;
	height: var(--hm-number);
	font-size: calc(var(--hm-number) * 0.74);
	line-height: var(--hm-number);
	font-weight: var(--font-medium, 500);
	font-variant-numeric: tabular-nums;
}

.hm-day.is-outside .hm-number {
	color: var(--text-faint);
}

.hm-day.is-ahead {
	opacity: 0.38;
}

.hm-seat {
	flex: none;
	width: 100%;
	height: var(--hm-seat);
	display: grid;
	grid-template-columns: minmax(0, 1fr);
	place-items: center;
}

.hm-run {
	grid-area: 1 / 1;
	justify-self: stretch;
	align-self: center;
	height: calc(var(--hm-ring) + ${2 * RUN_OVERHANG_PX}px);
	background: var(--wg-kit-accent-wash);
}

.hm-run.is-run-start {
	margin-inline-start: calc(50% - var(--hm-ring) / 2 - 1px);
	border-start-start-radius: 999px;
	border-end-start-radius: 999px;
}

.hm-run.is-run-end {
	margin-inline-end: calc(50% - var(--hm-ring) / 2 - 1px);
	border-start-end-radius: 999px;
	border-end-end-radius: 999px;
}

.hm-ring {
	grid-area: 1 / 1;
	box-sizing: border-box;
	width: var(--hm-ring);
	height: var(--hm-ring);
	display: grid;
	place-items: center;
	border: max(1px, calc(var(--hm-ring) * 0.055)) solid var(--text-faint);
	border-radius: 50%;
	background: var(--background-primary);
	color: var(--interactive-accent);
}

.hm-ring.is-kept {
	border-color: var(--interactive-accent);
}

.hm-ring.is-today {
	border-color: var(--wg-kit-text);
}

.hm-flame {
	fill: currentColor;
}
`;

import { createWidget, WidgetRoot } from "widgetarium";
import { useState } from "react";
import { isoOf } from "@habit/lib";

const STYLE = `
.habit-favorites {
	display: flex;
	flex-direction: column;
	padding: var(--size-4-4, 16px);
	gap: var(--size-4-3, 12px);
	overflow: hidden;
}

.hf-title {
	margin: 0;
	font-size: calc(var(--font-ui-medium, 15px) * 1.15);
	font-weight: var(--font-bold, 700);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hf-plot {
	position: relative;
	flex: 1;
	min-height: 170px;
	display: flex;
	align-items: stretch;
	gap: var(--size-4-2, 8px);
	padding-top: 18px;
}

.hf-peak {
	position: absolute;
	left: 0;
	border-top: 1px dashed var(--text-faint);
	pointer-events: none;
}

.hf-col {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
	justify-content: flex-end;
	border: 0;
	padding: 0;
	background: none;
	cursor: pointer;
}

.hf-bar {
	position: relative;
	width: 100%;
	border-radius: 12px;
	background: var(--background-primary);
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 10px;
}

.hf-col.is-on .hf-bar {
	background:
		repeating-linear-gradient(115deg, transparent 0 7px, color-mix(in srgb, var(--text-on-accent) 30%, transparent) 7px 8px),
		var(--interactive-accent);
}

.hf-dot {
	position: absolute;
	top: -4px;
	left: 50%;
	width: 8px;
	height: 8px;
	margin-left: -4px;
	border-radius: 50%;
	background: var(--interactive-accent);
	display: none;
}

.hf-col.is-on .hf-dot {
	display: block;
}

.hf-mark {
	display: none;
	width: 26px;
	height: 26px;
	border-radius: 8px;
	background: var(--background-primary);
	color: var(--interactive-accent);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-bold, 700);
	align-items: center;
	justify-content: center;
}

.hf-col.is-on .hf-mark {
	display: flex;
}

.hf-label {
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hf-col.is-on .hf-label {
	color: var(--text-normal);
}

.hf-card {
	position: absolute;
	top: 0;
	right: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
	padding: var(--size-4-3, 12px) var(--size-4-4, 16px);
	border-radius: 12px;
	background: var(--background-primary);
	box-shadow: var(--wg-widget-shadow, 0 4px 18px rgba(0, 0, 0, 0.12));
	pointer-events: none;
	white-space: nowrap;
}

.hf-card-name {
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}

.hf-card-value {
	font-size: calc(var(--font-ui-medium, 15px) * 1.6);
	font-weight: var(--font-bold, 700);
	line-height: 1.15;
}

.hf-card-delta {
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}

.hf-card-delta.is-up {
	color: var(--text-success);
}

.hf-card-delta.is-down {
	color: var(--text-error);
}
`;

const FLOOR = 0.14;
const LABEL_PX = 21;

function dayBefore(iso, back) {
	const when = new Date(Date.parse(`${iso}T00:00:00Z`));
	when.setUTCDate(when.getUTCDate() - back);
	return when.toISOString().slice(0, 10);
}

function keptBetween(entries, first, last) {
	return entries.filter((date) => date >= first && date <= last).length;
}

// CONTEXT: the window before this one, same length — that is what a delta is measured against
function readingOf(entries, until, span) {
	const now = keptBetween(entries, dayBefore(until, span - 1), until);
	const was = keptBetween(entries, dayBefore(until, span * 2 - 1), dayBefore(until, span));
	return { kept: now, delta: was === 0 ? null : Math.round(((now - was) / was) * 100) };
}

export default createWidget(function HabitFavorites({ settings, data }) {
	const [chosen, setChosen] = useState("");
	const field = settings.field || "entries";
	const span = Math.max(1, Number(settings.window) || 30);
	const until = isoOf(new Date());

	const bars = (data?.habits?.rows ?? []).map((row) => ({
		name: row.props?.title ?? row.name,
		...readingOf((row.props?.[field] ?? []).filter((date) => typeof date === "string"), until, span),
	}));

	const top = Math.max(...bars.map((bar) => bar.kept), 1);
	const heightOf = (bar) => FLOOR + (bar.kept / top) * (1 - FLOOR);
	// CONTEXT: nothing chosen means the strongest speaks, which is the question "favourite" asks
	const said = bars.some((bar) => bar.name === chosen) ? chosen : bars.reduce((best, bar) => (bar.kept > (best?.kept ?? -1) ? bar : best), null)?.name;
	const at = bars.findIndex((bar) => bar.name === said);
	const shown = bars[at];

	return (
		<WidgetRoot background="var(--wg-kit-fill)" className="habit-favorites">
			<style>{STYLE}</style>
			<h3 className="hf-title">Favourite habit</h3>

			{bars.length === 0 ? (
				<p className="habit-empty">No habit notes in this folder yet.</p>
			) : (
				<div className="hf-plot">
					{shown ? (
						<span
							className="hf-peak"
							style={{ bottom: `calc(${(heightOf(shown) * 100).toFixed(1)}% - ${LABEL_PX}px)`, width: `${(((at + 0.5) / bars.length) * 100).toFixed(1)}%` }}
						/>
					) : null}

					{bars.map((bar) => (
						<button type="button" key={bar.name} className={`hf-col${bar.name === said ? " is-on" : ""}`} onClick={() => setChosen(bar.name)}>
							<span className="hf-bar" style={{ height: `${(heightOf(bar) * 100).toFixed(1)}%` }}>
								<i className="hf-dot" />
								<i className="hf-mark">{bar.name.charAt(0).toUpperCase()}</i>
							</span>
							<span className="hf-label">{bar.name}</span>
						</button>
					))}

					{shown ? (
						<span className="hf-card">
							<span className="hf-card-name">{shown.name}</span>
							<span className="hf-card-value">{`${shown.kept} days`}</span>
							<span className={`hf-card-delta${shown.delta === null ? "" : shown.delta >= 0 ? " is-up" : " is-down"}`}>
								{shown.delta === null ? `in the last ${span} days` : `${shown.delta >= 0 ? "▲" : "▼"} ${Math.abs(shown.delta)}% vs the ${span} before`}
							</span>
						</span>
					) : null}
				</div>
			)}
		</WidgetRoot>
	);
});

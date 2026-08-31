import { createWidget, WidgetRoot } from "widgetarium";
import { useState } from "react";
import { Field, Icon } from "widgetarium/kit";
import { isoOf } from "@habit/lib";

const STYLE = `
.habit-favorites {
	display: flex;
	flex-direction: column;
	padding: var(--size-4-4, 16px);
	gap: var(--size-4-3, 12px);
	overflow: hidden;
}

.hf-head {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
}

.hf-title {
	flex: 1;
	margin: 0;
	font-size: calc(var(--font-ui-medium, 15px) * 1.15);
	font-weight: var(--font-bold, 700);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.hf-search {
	max-width: 180px;
}

.hf-month {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 6px 12px;
	border: 1px solid var(--background-modifier-border);
	border-radius: 999px;
	background: none;
	color: var(--text-normal);
	font-size: var(--font-ui-small, 14px);
	cursor: pointer;
	white-space: nowrap;
}

.hf-days {
	display: flex;
	border-bottom: 1px solid var(--background-modifier-border);
}

.hf-day {
	flex: 1;
	padding: 8px 4px 10px;
	border: 0;
	border-bottom: 2px solid transparent;
	margin-bottom: -1px;
	background: none;
	color: var(--text-muted);
	font-size: var(--font-ui-small, 14px);
	white-space: nowrap;
	cursor: pointer;
}

.hf-day.is-on {
	color: var(--text-normal);
	border-bottom-color: var(--interactive-accent);
}

.hf-plot {
	position: relative;
	flex: 1;
	/* CONTEXT: a definite height here is what lets a bar be a percentage of anything */
	min-height: 190px;
	display: flex;
	align-items: stretch;
	gap: var(--size-4-2, 8px);
	padding-top: 34px;
}

.hf-col {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	justify-content: flex-end;
	border: 0;
	padding: 0;
	background: none;
	cursor: pointer;
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
	color: transparent;
}

.hf-bar {
	position: relative;
	width: 100%;
	border-radius: 14px;
	background:
		repeating-linear-gradient(115deg, transparent 0 6px, var(--background-primary) 6px 7px),
		var(--background-modifier-hover);
	display: flex;
	align-items: flex-start;
	justify-content: center;
	padding-top: 10px;
}

.hf-col.is-on .hf-bar {
	background:
		repeating-linear-gradient(115deg, transparent 0 6px, color-mix(in srgb, var(--text-on-accent) 45%, transparent) 6px 7px),
		var(--interactive-accent);
}

.hf-mark {
	display: none;
	width: 26px;
	height: 26px;
	border-radius: 50%;
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

.hf-badge {
	position: absolute;
	top: -8px;
	transform: translate(-50%, -100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1px;
	padding: 6px 12px;
	border-radius: 10px;
	background: var(--background-primary);
	box-shadow: var(--wg-widget-shadow, 0 3px 14px rgba(0, 0, 0, 0.12));
	pointer-events: none;
	white-space: nowrap;
}

.hf-badge b {
	font-size: var(--font-ui-small, 14px);
}

.hf-badge span {
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}
`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STRIP = 5;
const FLOOR = 0.12;

// CONTEXT: the strip ends on today, so the last tab is the day a person is actually in
function stripOf(shift) {
	const days = [];
	const now = new Date();
	for (let at = STRIP - 1 + shift; at >= shift; at -= 1) {
		const when = new Date(now);
		when.setDate(now.getDate() - at);
		days.push({ iso: isoOf(when), label: `${DAYS[when.getDay()]} ${when.getDate()}`, month: when.getMonth() });
	}
	return days;
}

function rateOf(entries, until, span) {
	const from = new Date(Date.parse(`${until}T00:00:00Z`));
	from.setUTCDate(from.getUTCDate() - span + 1);
	const first = from.toISOString().slice(0, 10);
	const kept = entries.filter((date) => date >= first && date <= until).length;
	return kept / span;
}

export default createWidget(function HabitFavorites({ settings, data }) {
	const [needle, setNeedle] = useState("");
	const [shift, setShift] = useState(0);
	const [chosen, setChosen] = useState("");

	const field = settings.field || "entries";
	const span = Math.max(1, Number(settings.window) || 30);
	const strip = stripOf(shift);
	const onDay = strip[strip.length - 1];

	const bars = (data?.habits?.rows ?? [])
		.filter((row) => (row.props?.title ?? row.name).toLowerCase().includes(needle.toLowerCase()))
		.map((row) => ({
			name: row.props?.title ?? row.name,
			rate: rateOf((row.props?.[field] ?? []).filter((date) => typeof date === "string"), onDay.iso, span),
		}));

	const top = Math.max(...bars.map((bar) => bar.rate), 0.01);
	// CONTEXT: nothing chosen means the best one speaks, which is what "favorite" is asking
	const said = bars.some((bar) => bar.name === chosen) ? chosen : bars.reduce((best, bar) => (bar.rate > (best?.rate ?? -1) ? bar : best), null)?.name;

	return (
		<WidgetRoot className="habit-favorites">
			<style>{STYLE}</style>
			<div className="hf-head">
				<h3 className="hf-title">Favorite habits</h3>
				{settings.search === false ? null : (
					<Field className="hf-search" size="s" icon={<Icon name="search" size={14} />} placeholder="Search" value={needle} onInput={(event) => setNeedle(event.target.value)} />
				)}
				<button type="button" className="hf-month" onClick={() => setShift(shift + STRIP)}>
					{MONTHS[onDay.month]}
					<Icon name="chevron" size={13} />
				</button>
			</div>

			<div className="hf-days">
				{strip.map((day, at) => (
					<button
						type="button"
						key={day.iso}
						className={`hf-day${at === strip.length - 1 ? " is-on" : ""}`}
						onClick={() => setShift(shift + (strip.length - 1 - at))}
					>
						{day.label}
					</button>
				))}
			</div>

			{bars.length === 0 ? (
				<p className="habit-empty">Nothing here by that name.</p>
			) : (
				<div className="hf-plot">
					{bars.map((bar) => {
						const on = bar.name === said;
						const height = FLOOR + (bar.rate / top) * (1 - FLOOR);
						return (
							<button type="button" key={bar.name} className={`hf-col${on ? " is-on" : ""}`} onClick={() => setChosen(bar.name)}>
								<span className="hf-label">{bar.name}</span>
								<span className="hf-bar" style={{ height: `${(height * 100).toFixed(1)}%` }}>
									<i className="hf-mark">{bar.name.charAt(0).toUpperCase()}</i>
									{on ? (
										<span className="hf-badge" style={{ left: "50%" }}>
											<b>{bar.name}</b>
											<span>{`${Math.round(bar.rate * 100)}%`}</span>
										</span>
									) : null}
								</span>
							</button>
						);
					})}
				</div>
			)}
		</WidgetRoot>
	);
});

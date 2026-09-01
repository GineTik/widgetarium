import { createWidget, WidgetRoot } from "widgetarium";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "widgetarium/kit";
import { isoOf } from "@habit/lib";

const STYLE = `
.habit-streak {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	padding: var(--size-4-4, 16px);
	overflow: hidden;
}

.hk-title {
	margin: 0;
	font-size: calc(var(--font-ui-medium, 15px) * 1.15);
	font-weight: var(--font-bold, 700);
}

.hk-rail {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	min-width: 0;
}

.hk-step {
	flex: none;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid var(--background-modifier-border);
	border-radius: 50%;
	background: var(--background-primary);
	color: var(--text-muted);
	cursor: pointer;
}

.hk-step:hover {
	color: var(--text-normal);
}

.hk-back {
	transform: rotate(180deg);
}

.hk-strip {
	flex: 1;
	min-width: 0;
	display: flex;
	gap: 6px;
	overflow-x: auto;
	overscroll-behavior-x: contain;
	scrollbar-width: none;
	padding-bottom: 10px;
}

.hk-strip::-webkit-scrollbar {
	display: none;
}

.hk-day {
	position: relative;
	flex: none;
	width: 46px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 10px 0 12px;
	border: 0;
	border-radius: 14px;
	background: var(--background-primary);
	cursor: pointer;
}

.hk-day.is-done {
	background: color-mix(in srgb, var(--text-success) 14%, transparent);
}

.hk-day.is-part {
	background: var(--wg-kit-warning-wash);
}

.hk-day.is-missed {
	background: color-mix(in srgb, var(--text-error) 12%, transparent);
}

.hk-day.is-on {
	background: var(--interactive-accent);
}

.hk-weekday {
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.hk-day.is-on .hk-weekday {
	color: color-mix(in srgb, var(--text-on-accent, #fff) 80%, transparent);
}

.hk-num {
	font-size: var(--font-ui-small, 14px);
	color: var(--text-muted);
}

.hk-day.is-on .hk-num {
	color: var(--text-on-accent, #fff);
	font-weight: var(--font-bold, 700);
}

.hk-mark {
	width: 24px;
	height: 24px;
	border-radius: 8px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-bold, 700);
	background: var(--background-primary);
	color: var(--text-faint);
}

.hk-day.is-done .hk-mark {
	background: var(--text-success);
	color: var(--background-primary);
}

.hk-day.is-missed .hk-mark {
	background: var(--text-error);
	color: var(--background-primary);
}

.hk-ring {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	background: conic-gradient(var(--hk-ink) var(--hk-part), var(--hk-rest) 0);
	display: flex;
	align-items: center;
	justify-content: center;
}

.hk-ring::after {
	content: "";
	width: 12px;
	height: 12px;
	border-radius: 50%;
	background: var(--hk-hole);
}

.hk-tab {
	position: absolute;
	bottom: -6px;
	left: 50%;
	width: 16px;
	height: 4px;
	margin-left: -8px;
	border-radius: 2px;
	background: var(--interactive-accent);
	display: none;
}

.hk-day.is-on .hk-tab {
	display: block;
}
`;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// CONTEXT: a day still ahead wears no tone — the base is what "not yet" looks like
const TONES = { done: "is-done", part: "is-part", missed: "is-missed" };
const STEP = 14;
const EDGE_PX = 120;

function dayShifted(from, by) {
	const when = new Date(Date.parse(`${from}T00:00:00Z`));
	when.setUTCDate(when.getUTCDate() + by);
	return when.toISOString().slice(0, 10);
}

// CONTEXT: a day nobody could have kept yet is not a day anybody missed
function stateOf(kept, total, iso, today) {
	if (kept === total && total > 0) return "done";
	if (kept > 0) return "part";
	return iso < today ? "missed" : "ahead";
}

export default createWidget(function HabitStreak({ settings, data }) {
	const stripRef = useRef(null);
	const anchorRef = useRef(null);
	const today = isoOf(new Date());
	const [chosen, setChosen] = useState(today);
	const [span, setSpan] = useState({ back: 21, ahead: 10 });

	const field = settings.field || "entries";
	const rows = data?.habits?.rows ?? [];
	const marked = rows.map((row) => new Set((row.props?.[field] ?? []).filter((date) => typeof date === "string")));

	const days = [];
	for (let at = -span.back; at <= span.ahead; at += 1) {
		const iso = dayShifted(today, at);
		const kept = marked.filter((held) => held.has(iso)).length;
		days.push({
			iso,
			kept,
			total: marked.length,
			weekday: WEEKDAYS[new Date(Date.parse(`${iso}T00:00:00Z`)).getUTCDay()],
			state: stateOf(kept, marked.length, iso, today),
		});
	}

	// CONTEXT: growing the left edge moves everything right, so the anchor is the distance to the END
	useLayoutEffect(() => {
		const node = stripRef.current;
		if (!node || anchorRef.current === null) return;
		node.scrollLeft = node.scrollWidth - anchorRef.current;
		anchorRef.current = null;
	}, [span.back]);

	const reach = () => {
		const node = stripRef.current;
		if (!node) return;
		if (node.scrollLeft < EDGE_PX) {
			anchorRef.current = node.scrollWidth - node.scrollLeft;
			setSpan((held) => ({ ...held, back: held.back + STEP }));
			return;
		}
		if (node.scrollWidth - node.scrollLeft - node.clientWidth < EDGE_PX) {
			setSpan((held) => ({ ...held, ahead: held.ahead + STEP }));
		}
	};

	const slide = (way) => {
		const node = stripRef.current;
		if (node) node.scrollBy({ left: way * Math.max(node.clientWidth * 0.7, 120), behavior: "smooth" });
	};

	// CONTEXT: React listens to wheel passively, so turning it sideways needs the native listener
	useEffect(() => {
		const node = stripRef.current;
		if (!node) return undefined;
		const onWheel = (event) => {
			const by = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
			if (by === 0) return;
			event.preventDefault();
			node.scrollLeft += by;
		};
		node.addEventListener("wheel", onWheel, { passive: false });
		return () => node.removeEventListener("wheel", onWheel);
	}, []);

	// CONTEXT: opening on today, not on the oldest day the window happens to hold
	useEffect(() => {
		const node = stripRef.current;
		const seat = node?.querySelector(".is-on");
		if (seat) node.scrollLeft = seat.offsetLeft - node.clientWidth / 2 + seat.offsetWidth / 2;
	}, []);

	return (
		<WidgetRoot background="var(--wg-kit-fill)" className="habit-streak">
			<style>{STYLE}</style>
			<h3 className="hk-title">Habit streak</h3>
			{rows.length === 0 ? (
				<p className="habit-empty">No habit notes in this folder yet.</p>
			) : (
				<div className="hk-rail">
					<button type="button" className="hk-step" aria-label="Earlier days" onClick={() => slide(-1)}>
						<Icon name="chevron" size={15} className="hk-back" />
					</button>
					<div className="hk-strip" ref={stripRef} onScroll={reach}>
					{days.map((day) => {
						const on = day.iso === chosen;
						const part = day.total > 0 ? day.kept / day.total : 0;
						return (
							<button
								type="button"
								key={day.iso}
								className={`hk-day${TONES[day.state] ? ` ${TONES[day.state]}` : ""}${on ? " is-on" : ""}`}
								title={`${day.iso} — ${day.kept} of ${day.total}`}
								onClick={() => setChosen(day.iso)}
							>
								{day.state === "done" || day.state === "missed" ? (
									<span className="hk-mark">{day.state === "done" ? "✓" : "!"}</span>
								) : (
									<span
										className="hk-ring"
										style={{
											"--hk-part": `${(part * 360).toFixed(0)}deg`,
											"--hk-ink": on ? "var(--text-on-accent, #fff)" : "var(--interactive-accent)",
											"--hk-rest": on ? "color-mix(in srgb, var(--text-on-accent, #fff) 35%, transparent)" : "var(--background-modifier-border)",
											"--hk-hole": on ? "var(--interactive-accent)" : "var(--background-primary)",
										}}
									/>
								)}
								<span className="hk-weekday">{day.weekday}</span>
								<span className="hk-num">{Number(day.iso.slice(8))}</span>
								<i className="hk-tab" />
							</button>
						);
						})}
					</div>
					<button type="button" className="hk-step" aria-label="Later days" onClick={() => slide(1)}>
						<Icon name="chevron" size={15} />
					</button>
				</div>
			)}
		</WidgetRoot>
	);
});

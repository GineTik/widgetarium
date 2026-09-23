import { useEffect, useState } from "react";
import { canDo, createWidget, defineManifest, defineProp, useData } from "widgetarium";
import type { Row, WidgetProps } from "widgetarium";
import { Card, Icon } from "widgetarium/kit";

const MOST_STEPS = 50;
const TICK_MS = 1000;
const NO_STEPS = "No steps yet.";
const STEPS_DONE = "{done} of {total} steps done";
const OPEN_STEPS = "Show the steps";
const CLOSE_STEPS = "Hide the steps";

const CSS = `
.wg-task-progress {
	--wg-task-progress-mark: 28px;
	--wg-task-progress-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
	--wg-task-progress-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
	interpolate-size: allow-keywords;
	display: flex;
	flex-direction: column;
	width: fit-content;
	max-width: 100%;
	min-width: 0;
	transition: width 360ms var(--wg-task-progress-ease), border-radius 360ms var(--wg-task-progress-ease), padding 360ms var(--wg-task-progress-ease);
}

.wg-root .wg-task-progress.wg-kit-surface[data-surface] {
	padding: 6px 12px 6px 6px;
}

/* TRADE-OFF: the folded pill rounds to half its own height, not --wg-kit-pill: 999px has no smooth path to the plate corner */
.wg-root .wg-task-progress.wg-kit-surface[data-surface]:not([data-open]) {
	border-radius: calc(var(--wg-task-progress-mark) / 2 + 6px);
}

.wg-root .wg-task-progress.wg-kit-surface[data-surface][data-open] {
	width: 100%;
	padding: 10px;
}

.wg-task-progress-head {
	display: flex;
	align-items: center;
	gap: 10px;
	width: 100%;
	min-width: 0;
	margin: 0;
	padding: 0;
	border: 0;
	background: transparent;
	box-shadow: none;
	color: var(--wg-kit-text);
	font: inherit;
	text-align: start;
	cursor: pointer;
}

.wg-task-progress-head:disabled {
	cursor: default;
}

.wg-task-progress-head:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 4px;
	border-radius: var(--wg-kit-item);
}

.wg-task-progress-mark {
	display: grid;
	flex: none;
	place-items: center;
	width: var(--wg-task-progress-mark);
	height: var(--wg-task-progress-mark);
	border-radius: 50%;
	background: var(--wg-kit-accent);
	color: var(--text-on-accent);
	transition: background 240ms ease;
}

[data-state="running"] .wg-task-progress-mark {
	animation: wg-task-progress-morph 2400ms var(--wg-task-progress-ease) infinite;
}

[data-state="done"] .wg-task-progress-mark {
	background: var(--wg-kit-success);
	animation: wg-task-progress-pop 480ms var(--wg-task-progress-spring);
}

[data-state="failed"] .wg-task-progress-mark {
	background: var(--wg-kit-error);
	animation: wg-task-progress-shake 420ms var(--wg-task-progress-ease);
}

[data-state="stopped"] .wg-task-progress-mark {
	background: var(--wg-kit-fill);
	color: var(--wg-kit-text-muted);
}

@keyframes wg-task-progress-morph {
	0% { border-radius: 50%; transform: rotate(0deg) scale(1); }
	20% { border-radius: 30% 70% 62% 38% / 38% 32% 68% 62%; transform: rotate(70deg) scale(0.92); }
	40% { border-radius: 28%; transform: rotate(140deg) scale(1); }
	60% { border-radius: 50% 50% 12% 50%; transform: rotate(220deg) scale(0.9); }
	80% { border-radius: 42% 58% 50% 50% / 60% 40% 60% 40%; transform: rotate(300deg) scale(1); }
	100% { border-radius: 50%; transform: rotate(360deg) scale(1); }
}

@keyframes wg-task-progress-pop {
	from { transform: scale(0.5); }
	to { transform: scale(1); }
}

@keyframes wg-task-progress-shake {
	0%, 100% { transform: translateX(0); }
	25% { transform: translateX(-4px); }
	75% { transform: translateX(4px); }
}

.wg-task-progress-said {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-width: 0;
}

.wg-task-progress-title {
	overflow: hidden;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
	white-space: nowrap;
	text-overflow: ellipsis;
}

.wg-task-progress-now {
	display: grid;
	grid-template-rows: 1fr;
	transition: grid-template-rows 360ms var(--wg-task-progress-ease), opacity 240ms ease;
}

[data-open] .wg-task-progress-now {
	grid-template-rows: 0fr;
	opacity: 0;
}

.wg-task-progress-now > span {
	overflow: hidden;
	min-height: 0;
	color: var(--wg-kit-text-muted);
	font-size: var(--font-ui-smaller, 12px);
	white-space: nowrap;
	text-overflow: ellipsis;
	animation: wg-task-progress-arrive 420ms var(--wg-task-progress-spring);
}

@keyframes wg-task-progress-arrive {
	from { opacity: 0; transform: translateY(8px); }
	to { opacity: 1; transform: none; }
}

.wg-task-progress-clock {
	flex: none;
	color: var(--text-faint);
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	font-variant-numeric: tabular-nums;
}

.wg-task-progress-chevron {
	flex: none;
	color: var(--text-faint);
	transform: rotate(0deg);
	transition: transform 360ms var(--wg-task-progress-spring);
}

[data-open] .wg-task-progress-chevron {
	transform: rotate(180deg);
}

.wg-task-progress-fold {
	display: grid;
	grid-template-rows: 0fr;
	opacity: 0;
	transition: grid-template-rows 360ms var(--wg-task-progress-ease), opacity 240ms ease;
}

[data-open] .wg-task-progress-fold {
	grid-template-rows: 1fr;
	opacity: 1;
}

.wg-task-progress-steps {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-height: 0;
	margin: 0;
	padding: 0;
	overflow: hidden;
	list-style: none;
}

.wg-task-progress-steps::before {
	content: "";
	display: block;
	height: 8px;
}

.wg-task-progress-step {
	display: grid;
	grid-template-columns: 20px 1fr;
	gap: 0 10px;
	align-items: center;
	padding: 6px 8px 6px 4px;
	border-radius: var(--wg-kit-item);
	transition: background 240ms ease;
}

.wg-task-progress-step[data-status="active"] {
	background: var(--wg-kit-group-inset);
}

.wg-task-progress-dot {
	display: grid;
	grid-row: 1 / span 2;
	align-self: start;
	place-items: center;
	width: 20px;
	height: 20px;
	margin-top: 1px;
	border: 1.5px solid color-mix(in srgb, var(--wg-kit-text-muted) 45%, transparent);
	border-radius: 50%;
	color: var(--text-on-accent);
	transition: background 240ms ease, border-color 240ms ease, transform 360ms var(--wg-task-progress-spring);
}

[data-status="done"] > .wg-task-progress-dot {
	border-color: var(--wg-kit-success);
	background: var(--wg-kit-success);
}

[data-status="failed"] > .wg-task-progress-dot {
	border-color: var(--wg-kit-error);
	background: var(--wg-kit-error);
}

[data-status="active"] > .wg-task-progress-dot {
	border-color: var(--wg-kit-accent);
	border-top-color: transparent;
	animation: wg-task-progress-spin 800ms linear infinite;
}

@keyframes wg-task-progress-spin {
	to { transform: rotate(360deg); }
}

.wg-task-progress-label {
	overflow: hidden;
	color: var(--text-faint);
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	white-space: nowrap;
	text-overflow: ellipsis;
}

[data-status="done"] > .wg-task-progress-label {
	color: var(--wg-kit-text-muted);
	font-weight: var(--font-normal, 400);
}

[data-status="active"] > .wg-task-progress-label,
[data-status="failed"] > .wg-task-progress-label {
	color: var(--wg-kit-text);
}

.wg-task-progress-hint {
	overflow: hidden;
	color: var(--wg-kit-text-muted);
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	white-space: nowrap;
	text-overflow: ellipsis;
}

[data-status="failed"] > .wg-task-progress-hint {
	color: var(--text-error);
}

.wg-task-progress-empty {
	min-height: 0;
	overflow: hidden;
	margin: 0;
	padding: 8px 4px 0;
	color: var(--text-faint);
	font-size: var(--font-ui-smaller, 12px);
}

@media (prefers-reduced-motion: reduce) {
	.wg-task-progress,
	.wg-task-progress * {
		animation: none !important;
		transition: none !important;
	}
}
`;

type StepStatus = "pending" | "active" | "done" | "failed";
type Step = { label: string; status: StepStatus; hint?: string };
type OverallStatus = "running" | "done" | "failed" | "stopped";
type Progress = { title: string; rows: Row<Step>[]; isOpen: boolean; clock: string };

const STEP_STATUSES: readonly unknown[] = ["pending", "active", "done", "failed"];

const MARK_GLYPH: Record<OverallStatus, string | null> = {
	running: null,
	done: "tick",
	failed: "close",
	stopped: "minus",
};
const DOT_GLYPH: Record<StepStatus, string | null> = { pending: null, active: null, done: "tick", failed: "close" };

export const manifest = defineManifest({
	title: "Task progress",
	description:
		"A task and its steps, each with a status: folded to one line saying what is happening now, opened into the whole list.",
	keywords: ["progress", "status", "steps", "stages", "task", "build", "loading", "agent", "checklist", "running"],
	role: "indicator",
	size: { preferredWidth: "full", preferredHeight: "auto" },
	props: {
		title: defineProp<string>()({
			hint: "The one line naming the task, the way a person says it: Building Habit streak.",
			default: "Building a widget",
		}),
		steps: defineProp<Step[]>()({
			hint: "Every step in order. A status is pending, active, done or failed; the hint is the one line under an active step.",
			default: [
				{ label: "Write the widget", status: "done" },
				{ label: "Check it", status: "active", hint: "widgets.mjs check" },
				{ label: "Place it on the board", status: "pending" },
			],
		}),
		open: defineProp<boolean>()({
			hint: "Whether the steps are shown. Pressing the line flips it.",
			keep: "screen",
			default: false,
			writes: ["update"],
		}),
		startedAt: defineProp<number>()({
			hint: "When the task started, in milliseconds since 1970. Zero draws no clock.",
			default: 0,
		}),
		endedAt: defineProp<number>()({
			hint: "When the task ended, in milliseconds since 1970. Zero while it runs, so the clock keeps counting.",
			default: 0,
		}),
	},
});

function overallOf(steps: readonly Step[]): OverallStatus {
	if (steps.some((step) => step.status === "active")) return "running";
	if (steps.some((step) => step.status === "failed")) return "failed";
	if (steps.length > 0 && steps.every((step) => step.status === "done")) return "done";
	return "stopped";
}

function saidNow(steps: readonly Step[]): string {
	if (steps.length === 0) return NO_STEPS;
	const named = steps.find((step) => step.status === "active") ?? steps.find((step) => step.status === "failed");
	if (named) return named.label;
	const done = steps.filter((step) => step.status === "done").length;
	return STEPS_DONE.replace("{done}", String(done)).replace("{total}", String(steps.length));
}

function saidClock(ms: number): string {
	const seconds = Math.max(0, Math.floor(ms / TICK_MS));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function useNow(isTicking: boolean): number {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!isTicking) return undefined;
		const timer = setInterval(() => setNow(Date.now()), TICK_MS);
		return () => clearInterval(timer);
	}, [isTicking]);
	return now;
}

function StepRow({ step }: { step: Row<Step> }) {
	const glyph = DOT_GLYPH[step.status] ?? null;
	const hint = step.status === "active" || step.status === "failed" ? (step.hint ?? "") : "";
	return (
		<li className="wg-task-progress-step" data-status={step.status}>
			<span className="wg-task-progress-dot">{glyph ? <Icon name={glyph} size={12} /> : null}</span>
			<span className="wg-task-progress-label">{step.label}</span>
			{hint === "" ? null : <span className="wg-task-progress-hint">{hint}</span>}
		</li>
	);
}

function stepOf(row: Row<Step>): Row<Step> {
	const status = (STEP_STATUSES.includes(row.status) ? row.status : "pending") as StepStatus;
	return { ref: row.ref, label: String(row.label ?? ""), status, hint: String(row.hint ?? "") };
}

function useProgress({ title, steps, open, startedAt, endedAt }: WidgetProps<typeof manifest>): Progress {
	const rows = (useData(steps.list, { limit: MOST_STEPS }).data ?? []) as readonly Row<Step>[];
	const began = Number(useData(startedAt.get).data ?? 0);
	const ended = Number(useData(endedAt.get).data ?? 0);
	const clockNow = useNow(began > 0 && ended === 0);
	return {
		title: String(useData(title.get).data ?? ""),
		rows: rows.map(stepOf),
		isOpen: useData(open.get).data === true,
		clock: began > 0 ? saidClock((ended || clockNow) - began) : "",
	};
}

function ProgressHead({ progress, onToggleOpen }: { progress: Progress; onToggleOpen: (() => void) | null }) {
	const mark = MARK_GLYPH[overallOf(progress.rows)];
	const statusLine = saidNow(progress.rows);
	return (
		<button
			type="button"
			className="wg-task-progress-head"
			aria-expanded={progress.isOpen}
			aria-label={progress.isOpen ? CLOSE_STEPS : OPEN_STEPS}
			disabled={!onToggleOpen}
			onClick={onToggleOpen ?? undefined}
		>
			<span className="wg-task-progress-mark">{mark ? <Icon name={mark} size={16} /> : null}</span>
			<span className="wg-task-progress-said">
				<span className="wg-task-progress-title">{progress.title}</span>
				<span className="wg-task-progress-now">
					<span key={statusLine}>{statusLine}</span>
				</span>
			</span>
			{progress.clock === "" ? null : <span className="wg-task-progress-clock">{progress.clock}</span>}
			<Icon name="chevron-down" size={14} className="wg-task-progress-chevron" />
		</button>
	);
}

function StepsFold({ progress }: { progress: Progress }) {
	return (
		<div className="wg-task-progress-fold" aria-hidden={!progress.isOpen}>
			{progress.rows.length === 0 ? (
				<p className="wg-task-progress-empty">{NO_STEPS}</p>
			) : (
				<ol className="wg-task-progress-steps">
					{progress.rows.map((step) => (
						<StepRow key={step.ref} step={step} />
					))}
				</ol>
			)}
		</div>
	);
}

export default createWidget(manifest, (props) => {
	const progress = useProgress(props);
	const onToggleOpen = canDo(props.open.update) ? () => props.open.update(!progress.isOpen) : null;
	return (
		<Card
			className="wg-task-progress"
			data-state={overallOf(progress.rows)}
			data-open={progress.isOpen ? "" : undefined}
		>
			<style>{CSS}</style>
			<ProgressHead progress={progress} onToggleOpen={onToggleOpen} />
			<StepsFold progress={progress} />
		</Card>
	);
});

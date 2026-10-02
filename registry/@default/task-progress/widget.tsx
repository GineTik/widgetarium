import { ICommand, IQuery, createWidget, defineLayout, defineMetadata, defineProps, z } from "widgetarium";
import { Card } from "widgetarium/kit";
import { overallOf } from "./overall";
import { ProgressHead } from "./progress-head";
import { StepsFold } from "./steps-fold";
import { useProgress } from "./use-progress";

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

export const StepSchema = z.object({
	label: z.string(),
	status: z.enum(["pending", "active", "done", "failed"]),
	hint: z.string().optional(),
});

export const props = defineProps({
	getTitle: IQuery.expects(z.string().default("Building a widget")),
	getSteps: IQuery.expects(
		z.array(StepSchema).default([
			{ label: "Write the widget", status: "done" },
			{ label: "Check it", status: "active", hint: "widgets.mjs check" },
			{ label: "Place it on the board", status: "pending" },
		]),
	),
	getIsOpen: IQuery.expects(z.boolean().default(false)),
	setIsOpen: ICommand.sends(z.boolean()),
	getStartedAt: IQuery.expects(z.number().default(0)),
	getEndedAt: IQuery.expects(z.number().default(0)),
});

const TaskProgress = createWidget({
	inject: props,
	draw: (drawn) => {
		const progress = useProgress(drawn);
		const onToggleOpen = drawn.setIsOpen.can().can ? () => void drawn.setIsOpen(!progress.isOpen) : null;
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
	},
});

export const metadata = defineMetadata(TaskProgress, {
	title: "Task progress",
	description:
		"A task and its steps, each with a status: folded to one line saying what is happening now, opened into the whole list.",
	keywords: ["progress", "status", "steps", "stages", "task", "build", "loading", "agent", "checklist", "running"],
	props: {
		getTitle: {
			aka: ["title"],
			hint: "The one line naming the task, the way a person says it: Building Habit streak.",
		},
		getSteps: {
			aka: ["steps"],
			hint: "Every step in order. A status is pending, active, done or failed; the hint is the one line under an active step.",
		},
		getIsOpen: {
			aka: ["open"],
			keep: "screen",
			hint: "Whether the steps are shown. Pressing the line flips it.",
		},
		setIsOpen: {
			label: "Show or hide the steps",
			source: { implementation: "@core/value-set", fields: { target: "getIsOpen" } },
		},
		getStartedAt: {
			aka: ["startedAt"],
			hint: "When the task started, in milliseconds since 1970. Zero draws no clock.",
		},
		getEndedAt: {
			aka: ["endedAt"],
			hint: "When the task ended, in milliseconds since 1970. Zero while it runs, so the clock keeps counting.",
		},
	},
});

export const layout = defineLayout({
	role: "indicator",
	size: { preferredWidth: "full", preferredHeight: "auto" },
});

export default TaskProgress;

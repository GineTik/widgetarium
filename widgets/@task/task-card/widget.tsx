import { createWidget, useValue, WidgetRoot } from "widgetarium";
import type { GetAction, UpdateAction, ValueGateway } from "widgetarium";
import type { ReactNode } from "react";
import { APPROVAL_TONES, Icon, PRIORITY_TONES, Pill, cx, toneClass, toneOf } from "widgetarium/kit";

// CONTEXT: the card IS the widget root, and .wg-widget-root[data-…] outweighs .wg-kit-card
// CONTEXT: [data-rounded] is always set, so this scores (0,3,0) and stops tying on source order
const CSS = `
.orbi-task-card.wg-widget-root[data-rounded] {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-3, 12px);
	border-radius: var(--wg-kit-item);
	transition: transform var(--orbi-press) var(--orbi-ease);
}

.orbi-task-card.wg-widget-root:active {
	transform: scale(0.955);
}

.orbi-task-card-stripes {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--size-2-2, 4px);
}

/* CONTEXT: a tag the map says nothing about is grey, which is the kit's own neutral */
.orbi-task-card-stripe {
	flex: none;
	width: 32px;
	height: 4px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill-hover);
}

.orbi-task-card-stripe.is-accent { background: var(--interactive-accent); }
.orbi-task-card-stripe.is-ok { background: var(--text-success); }
.orbi-task-card-stripe.is-warn { background: var(--wg-kit-warning); }
.orbi-task-card-stripe.is-err { background: var(--text-error); }

.orbi-task-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
}

/* ONE LINE SITS ON THE PILLS' LINE, TWO LINES START AT THE TOP. The box is as tall as a pill
   (measured: 20px against a title line's 17.5px), so a single line centres inside it and a
   second line grows the box past it, which puts the text back where it started on its own. */
.orbi-task-card-titlebox {
	display: flex;
	align-items: center;
	min-height: 20px;
	min-width: 0;
}

/* CONTEXT: max-height is the fallback where -webkit-box is unsupported — two lines, no ellipsis */
.orbi-task-card-title {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	min-width: 0;
	max-height: calc(var(--font-ui-small, 14px) * var(--line-height-tight, 1.25) * 2);
	margin: 0;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	line-height: var(--line-height-tight, 1.25);
}

.orbi-task-card-badges {
	display: flex;
	flex: none;
	align-items: center;
	gap: var(--size-2-2, 4px);
}

.orbi-task-card-track {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
}

.orbi-task-card-bar {
	overflow: hidden;
	flex: 1;
	height: 6px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.orbi-task-card-bar-fill {
	display: block;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--interactive-accent);
}

.orbi-task-card-percent {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-muted);
}

.orbi-task-card-meta {
	display: flex;
	align-items: center;
	gap: var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

/* TRADE-OFF: the text gives first — the avatar group is already capped, so nothing else can */
.orbi-task-card-meta-item {
	display: inline-flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
}

.orbi-task-card-meta-text {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.orbi-task-card-avatars {
	display: flex;
	flex: none;
	margin-left: auto;
}

/* CONTEXT: the 2px ring in the surface colour is what makes the -8px overlap readable */
.orbi-task-card-avatar {
	display: grid;
	flex: none;
	place-content: center;
	box-sizing: border-box;
	width: 28px;
	height: 28px;
	margin-left: -8px;
	border-radius: var(--wg-kit-pill);
	box-shadow: 0 0 0 2px var(--background-primary);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

.orbi-task-card-avatar:first-child {
	margin-left: 0;
}

/* CONTEXT: the count is not a person, so it carries the neutral pill's tone */
.orbi-task-card-avatar-rest {
	background: var(--wg-kit-fill);
	color: var(--text-muted);
}

/* CONTEXT: the row used to vanish whole below 220px, which is most of a 258px column */
@container widget (width < 240px) {
	.orbi-task-card .orbi-task-card-meta {
		gap: var(--size-4-2, 8px);
	}
}

@container widget (width < 150px) {
	.orbi-task-card .orbi-task-card-badges {
		display: none;
	}
}

@media (prefers-reduced-motion: reduce) {
	.orbi-task-card.wg-widget-root:active {
		transform: none;
	}
}
`;

const STATUS_LABELS: Record<string, string> = { approve: "Approve", check: "Check", reject: "Reject", review: "Review" };

// CONTEXT: four circles is 88px of a 256px row — a fifth pushed the dates off the card
const AVATAR_CAP = 3;

const AVATAR_TONE_STYLES = [
	{ background: "var(--wg-kit-accent-wash)", color: "var(--interactive-accent)" },
	{ background: "var(--wg-kit-success-wash)", color: "var(--text-success)" },
	{ background: "var(--wg-kit-error-wash)", color: "var(--text-error)" },
	{ background: "var(--wg-kit-warning-wash)", color: "var(--wg-kit-warning)" },
];

function MetaItem({ icon, text }: { icon: ReactNode; text: ReactNode }) {
	return (
		<span className="orbi-task-card-meta-item">
			{icon}
			<span className="orbi-task-card-meta-text">{text}</span>
		</span>
	);
}

function percentOf(value: unknown): number {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.max(0, Math.min(100, Math.round(number)));
}

// CONTEXT: the note holds a person, the card draws the letter — storing "A" leaked it into the filter
function initialsOf(value: unknown): string[] {
	const held = Array.isArray(value) ? value : String(value ?? "").split(",");
	return held
		.map((entry) => String(entry).trim())
		.filter(Boolean)
		.map((name) => name.charAt(0).toUpperCase());
}

function toList(value: unknown): string[] {
	const held = Array.isArray(value) ? value : String(value ?? "").split(",");
	return held.map((entry) => String(entry).trim()).filter(Boolean);
}

// CONTEXT: frontmatter hands over a map, a settings field a "tag: tone" list — both are the map
function toToneMap(value: unknown): Record<string, string> {
	if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, string>;
	const map: Record<string, string> = {};
	for (const entry of toList(value)) {
		const at = entry.indexOf(":");
		if (at > 0) map[entry.slice(0, at).trim()] = entry.slice(at + 1).trim();
	}
	return map;
}

// CONTEXT: a field the note lacks is not drawn — defaults made every task render as the mock
function has(value: unknown): boolean {
	return value !== undefined && value !== null && value !== "";
}

// CONTEXT: notes write the value in either casing; the label is authored here in English
function labelOf(status: string): string {
	return STATUS_LABELS[status.toLowerCase()] ?? status;
}

type Task = {
	title?: string;
	tags?: string[] | string;
	tagTones?: Record<string, string> | string;
	priority?: string;
	status?: string;
	progress?: number | string;
	initials?: string[] | string;
	due?: string;
	files?: number | string;
};

type CardProps = {
	task: ValueGateway<Task, { get: GetAction; update?: UpdateAction }> | Task;
};

function TagStripes({ tags, tones }: { tags: string[]; tones: Record<string, string> }) {
	if (tags.length === 0) return null;
	return (
		<div className="orbi-task-card-stripes">
			{tags.map((tag, at) => (
				<span key={`${tag}-${at}`} className={cx("orbi-task-card-stripe", toneClass(tones[tag]))} title={tag} />
			))}
		</div>
	);
}

function Badges({ priority, status }: { priority: string | null; status: string | null }) {
	if (!priority && !status) return null;
	return (
		<div className="orbi-task-card-badges">
			{priority ? <Pill tone={toneOf(PRIORITY_TONES, priority)}>{priority}</Pill> : null}
			{status ? <Pill tone={toneOf(APPROVAL_TONES, status)}>{labelOf(status)}</Pill> : null}
		</div>
	);
}

function ProgressTrack({ progress }: { progress: number | null }) {
	if (progress === null) return null;
	return (
		<div className="orbi-task-card-track">
			<span className="orbi-task-card-bar">
				<i className="orbi-task-card-bar-fill" style={{ width: `${progress}%` }} />
			</span>
			<span className="orbi-task-card-percent">{progress}%</span>
		</div>
	);
}

function Avatars({ initials }: { initials: string[] }) {
	if (initials.length === 0) return null;
	const shown = initials.slice(0, AVATAR_CAP);
	const restCount = initials.length - shown.length;
	return (
		<span className="orbi-task-card-avatars">
			{shown.map((initial, index) => (
				<i key={`${initial}-${index}`} className="orbi-task-card-avatar" style={AVATAR_TONE_STYLES[index % AVATAR_TONE_STYLES.length]}>
					{initial}
				</i>
			))}
			{restCount > 0 ? <i className="orbi-task-card-avatar orbi-task-card-avatar-rest">+{restCount}</i> : null}
		</span>
	);
}

function MetaRow({ due, files, initials }: { due: Task["due"]; files: Task["files"]; initials: string[] }) {
	if (!has(due) && !has(files) && initials.length === 0) return null;
	return (
		<div className="orbi-task-card-meta">
			{has(due) ? <MetaItem icon={<Icon name="clock" size={14} />} text={due} /> : null}
			{has(files) ? <MetaItem icon={<Icon name="folder" size={14} />} text={files} /> : null}
			<Avatars initials={initials} />
		</div>
	);
}

// TRADE-OFF: an empty bar at 0% says the same as no bar, and says it in a whole row of the card
function shownProgress(value: unknown): number | null {
	if (!has(value)) return null;
	const percent = percentOf(value);
	if (percent === 0) return null;
	return percent;
}

function shownText(value: unknown): string | null {
	if (!has(value)) return null;
	return String(value);
}

export default createWidget(function OrbiTaskCard({ task }: CardProps) {
	const card: Task = useValue(task) ?? {};
	const initials = initialsOf(card.initials);

	return (
		<WidgetRoot className="orbi wg-kit-card orbi-task-card">
			<style>{CSS}</style>

			<TagStripes tags={toList(card.tags)} tones={toToneMap(card.tagTones)} />

			<div className="orbi-task-card-head">
				<div className="orbi-task-card-titlebox">
					<h4 className="orbi-task-card-title">{card.title ?? "Untitled"}</h4>
				</div>
				<Badges priority={shownText(card.priority)} status={shownText(card.status)} />
			</div>

			<ProgressTrack progress={shownProgress(card.progress)} />

			<MetaRow due={card.due} files={card.files} initials={initials} />
		</WidgetRoot>
	);
}, {
	props: {
		task: {
			label: "Task",
			hint: "The task this card draws. Held in a board it is handed down; standing alone it is the one typed here.",
			default: {
				from: "typed",
				value: {
					title: "Design the onboarding flow",
					tags: ["design", "research"],
					tagTones: { design: "warning", research: "accent" },
					priority: "P1",
					status: "approve",
					progress: 60,
					due: "12 Aug",
					files: 2,
					initials: ["Alex Morgan", "Mia Tan", "Theo Ruiz"],
				},
			},
		},
	},
});

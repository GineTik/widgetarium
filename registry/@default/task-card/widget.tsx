import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Badges } from "./badges";
import { has } from "./has";
import { MetaRow } from "./meta-row";
import { ProgressTrack } from "./progress-track";
import { TagStripes } from "./tag-stripes";
import type { Task } from "./types";

const CSS = `
.orbi-task-card {
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
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
	color: var(--wg-kit-text-muted);
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
	color: var(--wg-kit-text-muted);
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
`;

function percentOf(value: unknown): number {
	const number = Number(value);
	if (!Number.isFinite(number)) return 0;
	return Math.max(0, Math.min(100, Math.round(number)));
}

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

function toToneMap(value: Task["tagTones"]): Record<string, string> {
	if (typeof value === "object") return value;
	const map: Record<string, string> = {};
	for (const entry of toList(value)) {
		const at = entry.indexOf(":");
		if (at > 0) map[entry.slice(0, at).trim()] = entry.slice(at + 1).trim();
	}
	return map;
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

export const TaskSchema = z.object({
	title: z.string().optional(),
	tags: z.union([z.array(z.string()), z.string()]).optional(),
	tagTones: z.union([z.record(z.string(), z.string()), z.string()]).optional(),
	priority: z.string().optional(),
	status: z.string().optional(),
	progress: z.union([z.number(), z.string()]).optional(),
	initials: z.union([z.array(z.string()), z.string()]).optional(),
	due: z.string().optional(),
	files: z.union([z.number(), z.string()]).optional(),
});

const TaskCard = createWidget({
	inject: {
		getTask: IQuery.expects(
			TaskSchema.default({
				title: "Design the onboarding flow",
				tags: ["design", "research"],
				tagTones: { design: "warning", research: "accent" },
				priority: "P1",
				status: "approve",
				progress: 60,
				due: "12 Aug",
				files: 2,
				initials: ["Alex Morgan", "Mia Tan", "Theo Ruiz"],
			}),
		),
	},
	draw: ({ getTask: card }) => {
		const initials = initialsOf(card.initials);

		return (
			<div className="orbi orbi-task-card">
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
			</div>
		);
	},
});

export const metadata = defineMetadata(TaskCard, {
	title: "Task card",
	description: "One task as a card: title, tags, priority, progress, deadline and who is on it.",
	keywords: [
		"task",
		"card",
		"tile",
		"todo",
		"item",
		"ticket",
		"issue",
		"priority",
		"tag",
		"assignee",
		"progress",
		"due",
		"deadline",
		"avatar",
	],
	preview: {
		size: { w: 4, h: 2 },
		props: {
			getTask: {
				value: {
					title: "Record the release notes",
					tags: ["launch", "notes"],
					tagTones: { launch: "accent" },
					priority: "P3",
					status: "approve",
					progress: 80,
					due: "4 Sep",
					files: 1,
					initials: ["Dana Reid"],
				},
			},
		},
		shot: { of: "943539583" },
	},
	props: {
		getTask: {
			label: "Task",
			aka: ["task"],
			hint: "The task this card draws. Held in a board it is handed down; standing alone it is the one typed here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: {
		preferredWidth: 360,
		preferredHeight: "auto",
		at: [{ belowPx: 440, preferredWidth: "full" }],
		collapseBelowPx: 90,
		stackBelowPx: 220,
	},
});

export default TaskCard;

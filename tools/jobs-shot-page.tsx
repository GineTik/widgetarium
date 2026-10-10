import { createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { Segmented } from "../packages/kit/src/index.ts";
import { JobSchema } from "../packages/core/src/app-jobs.ts";
import type { Job } from "../packages/core/src/app-jobs.ts";
import type { JobControls } from "../apps/studio/src/design/design-job.ts";
import { PlannedPageRegion, pageLabelOf } from "../apps/studio/src/design/design-job.ts";
import { JobLine } from "../apps/studio/src/design/design-job-line.ts";
import { ReferencesRegion } from "../apps/studio/src/design/design-references.ts";

const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420'><rect width='640' height='420' fill='#f3f3f1'/></svg>")}`;
import { Group } from "../apps/studio/src/design/design-group.ts";

const MINUTE = 60000;
const NOW = Date.now();

const job = (fields: Partial<Job> & Pick<Job, "id" | "title" | "page" | "phase">): Job =>
	JobSchema.parse({ app: "Studio", says: "Draw it.", createdAt: NOW - 30 * MINUTE, ...fields });

const JOBS: Job[] = [
	job({
		id: "studio-design",
		title: "Design the Studio page",
		page: "Studio",
		phase: "design",
		status: "waiting",
		spent: 48210,
		startedAt: NOW - 14 * MINUTE,
		endedAt: NOW - MINUTE,
		said: "Drew Studio three ways: A leads with this week's numbers, B with the covers, C with the week's plan.",
		question: { said: "Which direction should every page follow?", options: ["A", "B", "C"] },
	}),
	job({
		id: "ideas-design",
		title: "Design the Ideas page",
		page: "Ideas",
		phase: "design",
		status: "running",
		after: ["studio-design"],
		spent: 9120,
		startedAt: NOW - 6 * MINUTE,
	}),
	job({
		id: "filming-design",
		title: "Design the Filming page",
		page: "Filming",
		phase: "design",
		status: "queued",
		after: ["ideas-design"],
	}),
	job({
		id: "studio-implement",
		title: "Build the Studio page",
		page: "Studio",
		phase: "implement",
		status: "paused",
		reason: "budget",
		spent: 120000,
		startedAt: NOW - 20 * MINUTE,
		endedAt: NOW - 2 * MINUTE,
	}),
	job({
		id: "hooks-review",
		title: "Review the Hooks page",
		page: "Hooks",
		phase: "review",
		status: "failed",
		reason: "claude exited with code 1. Usage limit reached.",
		startedAt: NOW - 9 * MINUTE,
		endedAt: NOW - 8 * MINUTE,
	}),
];

const LINES = [
	'Widgetarium · find — --about "idea board"',
	"Write — .widgetarium/widgets/@studio/idea-card/widget.tsx",
	"Widgetarium · check — @studio/idea-card",
	'Widgetarium · screen — Studio "Ideas" --widget @studio/ideas-page',
];

const controls: JobControls = {
	live: (id) =>
		id === "ideas-design" ? { activity: "Widgetarium · shot — --design Studio", lines: LINES, spent: 9120 } : null,
	stop: () => undefined,
};

const host = document.getElementById("host");
if (!host) throw new Error("jobs shot: the page has no #host");
const pages = ["Docs", "Studio", "Ideas", "Filming", "Hooks", "References", "Components", "Jobs"];
const byId = (id: string): Job =>
	JOBS.find((one) => one.id === id) ?? JOBS[0] ?? job({ id: "x", title: "x", page: null, phase: "task" });

createRoot(host).render(
	h("div", { className: "wg-portal", style: { display: "flex", flexDirection: "column", gap: "24px" } }, [
		h(Segmented<string>, {
			key: "tabs",
			size: "s",
			items: pages.map((page) => ({ value: page, label: pageLabelOf(page, JOBS) })),
			value: "Ideas",
			onValueChange: () => undefined,
		}),
		h(
			"div",
			{
				key: "draft",
				style: {
					transform: "scale(0.5)",
					transformOrigin: "0 0",
					width: "200%",
					display: "flex",
					flexDirection: "column",
					gap: "48px",
				},
			},
			[
				h(ReferencesRegion, {
					key: "references",
					opener: {
						open: () => undefined,
						nameOf: (widget: string) => (widget === "@studio/video-board" ? "Video pipeline board" : "Video card"),
					},
					references: [
						{
							name: "notion-board.png",
							src: PICTURE,
							why: "Notion board of a content calendar",
							kind: "app",
							pages: [],
							notes: [
								{
									text: "Columns by stage, a count on each",
									tone: "take",
									into: "@studio/video-board",
									at: [0.3, 0.2],
								},
								{ text: "Status chip on every card", tone: "take", into: "@studio/video-card", at: [0.6, 0.5] },
								{ text: "Board under a week strip became the Ideas layout", tone: "take", at: [0.5, 0.1] },
								{ text: "Property list on every card: too busy on a phone", tone: "dislike", at: [0.7, 0.8] },
							],
						},
					],
				}),
				h(
					Group,
					{
						key: "page",
						title: "Ideas",
						sub: "4 states",
						status: h(JobLine, {
							job: JobSchema.parse({
								id: "ideas-review",
								app: "Studio",
								title: "Polish Ideas",
								page: "Ideas",
								phase: "review",
								says: "x",
								status: "running",
								spent: 3400,
								startedAt: NOW - 2 * MINUTE,
							}),
							controls,
							isInline: true,
						}),
					},
					h("div", {
						style: {
							width: "1280px",
							height: "320px",
							background: "var(--background-primary)",
							boxShadow: "0 0 0 1px var(--background-modifier-border)",
						},
					}),
				),
			],
		),
		h(
			"div",
			{
				key: "field",
				style: {
					transform: "scale(0.35)",
					transformOrigin: "0 0",
					width: "285%",
					display: "flex",
					flexWrap: "wrap",
					gap: "48px",
				},
			},
			[
				...["ideas-design"].map((id) =>
					h(PlannedPageRegion, { key: id, job: byId(id), controls, size: { width: 1280, height: 832 } }),
				),
			],
		),
	]),
);

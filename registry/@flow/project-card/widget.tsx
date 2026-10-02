import { IQuery, createWidget, defineLayout, defineMetadata, z } from "widgetarium";
import { Face } from "./face";

const CSS = `
.flow-project-card {
	container-type: inline-size;
	container-name: widget;
	display: flex;
	flex-direction: column;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-said {
	margin: 0;
	font-size: var(--font-ui-small);
	color: var(--wg-kit-text-muted);
}

.flow-project-card-head {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-mark {
	display: grid;
	flex: none;
	place-content: center;
	width: 34px;
	height: 34px;
	border-radius: var(--wg-kit-plate) var(--wg-kit-plate) var(--wg-kit-plate) var(--wg-kit-pill);
	background: var(--wg-kit-fill);
	font-size: var(--font-ui-medium);
	line-height: 1;
}

.flow-project-card-names {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--size-2-1, 2px);
	min-width: 0;
}

.flow-project-card-name {
	overflow: hidden;
	margin: 0;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-size: var(--font-ui-small);
	font-weight: var(--font-semibold);
	line-height: var(--line-height-tight);
}

.flow-project-card-repo {
	overflow: hidden;
	direction: rtl;
	white-space: nowrap;
	text-align: left;
	text-overflow: ellipsis;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller);
	color: var(--text-faint);
}

.flow-project-card-track {
	display: flex;
	align-items: center;
	gap: var(--wg-gap-parts);
	min-width: 0;
}

.flow-project-card-bar {
	overflow: hidden;
	flex: 1 1 auto;
	height: 6px;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-fill);
}

.flow-project-card-bar-fill {
	display: block;
	height: 100%;
	border-radius: var(--wg-kit-pill);
	background: var(--wg-kit-accent);
}

.flow-project-card-percent {
	flex: none;
	font-family: var(--font-monospace);
	font-size: var(--font-ui-smaller);
	color: var(--wg-kit-text-muted);
}

.flow-project-card-counts {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
}

.flow-project-card .flow-project-card-count {
	flex: 0 1 auto;
	min-width: 0;
}

.flow-project-card-count-number {
	flex: none;
}

.flow-project-card-count-label {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	font-weight: var(--font-normal);
}

.flow-project-card-touched {
	display: flex;
	align-items: center;
	gap: var(--size-2-2, 4px);
	min-width: 0;
	font-size: var(--font-ui-smaller);
	color: var(--text-faint);
}

.flow-project-card-touched-text {
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

@container widget (width < 200px) {
	.flow-project-card .flow-project-card-percent { display: none; }

	.flow-project-card .flow-project-card-mark {
		width: 26px;
		height: 26px;
	}
}
`;

export const ProjectSchema = z.object({
	mark: z.string().nullish(),
	name: z.string().nullish(),
	repository: z.string().nullish(),
	open: z.union([z.number(), z.string()]).nullish(),
	doing: z.union([z.number(), z.string()]).nullish(),
	done: z.union([z.number(), z.string()]).nullish(),
	touched: z.string().nullish(),
});

const ProjectCard = createWidget({
	inject: {
		getProject: IQuery.of(
			ProjectSchema.default({
				mark: "🧭",
				name: "Harbour",
				repository: "~/Projects/harbour",
				open: 4,
				doing: 1,
				done: 27,
				touched: "2026-09-11",
			}),
		),
	},
	draw: ({ getProject: project }) => {
		return (
			<div className="flow-project-card">
				<style>{CSS}</style>
				<Face project={project} />
			</div>
		);
	},
});

export const metadata = defineMetadata(ProjectCard, {
	title: "Project card",
	description: "One project as a card: its mark and name, the repository it lives in, how far it is and when it moved.",
	keywords: [
		"project",
		"card",
		"repository",
		"repo",
		"git",
		"progress",
		"counts",
		"open",
		"doing",
		"done",
		"detail",
		"tile",
	],
	preview: {
		size: { w: 4, h: 2 },
		props: {
			getProject: {
				value: {
					mark: "🧩",
					name: "Widgetarium",
					repository: "~/Projects/Obsidian Plugins/widgetarium",
					open: 12,
					doing: 3,
					done: 48,
					touched: "2026-09-18",
				},
			},
		},
	},
	props: {
		getProject: {
			label: "Project",
			aka: ["project"],
			hint: "The project this card draws. Held in a grid it is handed down; standing alone it is the one bound here.",
		},
	},
});

export const layout = defineLayout({
	role: "detail",
	size: {
		preferredWidth: 360,
		preferredHeight: "auto",
		at: [{ belowPx: 440, preferredWidth: "full" }],
		collapseBelowPx: 120,
		stackBelowPx: 200,
	},
});

export default ProjectCard;

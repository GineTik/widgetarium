import { useCallback } from "react";
import {
	IListGateway,
	ISlot,
	IValueGateway,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	pickedValue,
	useData,
	z,
} from "widgetarium";
import type { Row } from "widgetarium";
import { Cells } from "./cells";
import { GridSaid } from "./grid-said";
import type { Drawn, Project, ProjectSlot } from "./types";
import { useShown } from "./use-shown";

const PAGE_SIZE = 12;

const NO_SLOT = "This grid has no widget to draw its projects with.";
const NOTHING = "No projects in what this tile is bound to.";

export const ProjectSchema = VaultRecordSchema.extend({
	mark: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["emoji", "icon", "symbol"] }),
	repository: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["repo", "git", "source", "folder"] }),
	open: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["todo", "backlog", "waiting"] }),
	doing: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["active", "wip", "inProgress"] }),
	done: z
		.union([z.number(), z.string()])
		.nullable()
		.optional()
		.meta({ aka: ["closed", "finished", "complete"] }),
	touched: z
		.string()
		.nullable()
		.optional()
		.meta({ aka: ["updated", "modified", "lastTouched", "changed"] }),
});

const ProjectGrid = createWidget({
	inject: {
		projects: IListGateway.of(ProjectSchema, { default: [] }),
		selection: IValueGateway.of(z.unknown()).pick("get", "update"),
		pageSize: IValueGateway.of(z.number().default(PAGE_SIZE)).pick("get"),
		card: ISlot.of<{ project: Row<Project> }>({
			default: "@flow/project-card",
			surface: "group",
			gives: { project: ["mark", "name", "repository", "open", "doing", "done", "touched"] },
		}),
	},
	draw: ({ projects, selection, pageSize, card }) => {
		const size = askedSize(pageSize);
		const { shown, more } = useShown(projects.id, size);
		const listed = useData(projects.list, { offset: 0, limit: shown });
		const picked = pickedValue(selection.value);
		const pick = useCallback((ref: string) => void selection.update(ref), [selection.update]);
		const said = saidInstead(card, listed);
		if (said) return <GridSaid text={said} />;
		return (
			<Cells
				Drawn={card as Drawn}
				rows={listed.data as Row<Project>[]}
				picked={picked}
				onPick={pick}
				rest={restOf(listed.total, listed.data.length)}
				onMore={more}
			/>
		);
	},
});

export const metadata = defineMetadata(ProjectGrid, {
	title: "Project grid",
	description: "Every project as an equal card across the row, and pressing one picks it for the rest of the screen.",
	keywords: [
		"projects",
		"grid",
		"cards",
		"portfolio",
		"repositories",
		"repos",
		"overview",
		"tiles",
		"collection",
		"picker",
		"work",
	],
	preview: {
		size: { w: 6, h: 4 },
		props: {
			projects: {
				rows: [
					{
						path: "Projects/widgetarium.md",
						name: "Widgetarium",
						mark: "🧩",
						repository: "~/Projects/Obsidian Plugins/widgetarium",
						open: 12,
						doing: 3,
						done: 48,
						touched: "2026-09-18",
					},
					{
						path: "Projects/paperclip.md",
						name: "Paperclip",
						mark: "📎",
						repository: "~/Projects/paperclip",
						open: 4,
						doing: 1,
						done: 27,
						touched: "2026-09-11",
					},
					{ path: "Projects/field-notes.md", name: "Field notes", mark: "🗒️", touched: "2026-08-30" },
					{
						path: "Projects/harbour.md",
						name: "Harbour",
						repository: "~/Projects/harbour",
						open: 0,
						doing: 2,
						done: 9,
					},
				],
			},
		},
	},
	props: {
		projects: {
			label: "Projects",
			hint: "One note per project. Bind the folder they live in.",
			describes: {
				mark: { label: "Mark", type: "line" },
				repository: { label: "Repository", type: "line" },
				open: { label: "Open", type: "number" },
				doing: { label: "Doing", type: "number" },
				done: { label: "Done", type: "number" },
				touched: { label: "Touched", type: "date" },
			},
		},
		selection: {
			label: "Selected project",
			hint: "The project the pressed card names. Bind a task list or a docs tree to it and they follow the press.",
			source: {
				implementation: "@core/selection",
				fields: { rows: "projects", field: "name", whenNothingPicked: "first" },
			},
		},
		pageSize: {
			label: "Projects per load",
			hint: "How many cards are drawn before the rest are asked for.",
		},
	},
});

export const layout = defineLayout({
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 320 },
});

export default ProjectGrid;

function saidInstead(
	slot: ProjectSlot | undefined,
	listed: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	return !listed.isLoading && listed.total === 0 ? NOTHING : null;
}

function askedSize(pageSize: number) {
	const asked = Math.round(Number(pageSize));
	return asked > 0 ? asked : PAGE_SIZE;
}

function restOf(total: number | null, drawn: number) {
	return Math.max(0, (total ?? drawn) - drawn);
}

import { useCallback, useEffect, useState } from "react";
import { createWidget, defineManifest, defineProp, pickedValue, useData } from "widgetarium";
import type { Row, Slot, VaultRecord, WidgetProps } from "widgetarium";
import { Button, Count, SlotList, cx } from "widgetarium/kit";

const CSS = `
.flow-project-grid {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: var(--wg-gap-items);
	min-width: 0;
	min-height: 0;
	overflow: auto;
}

.flow-project-grid .flow-project-grid-cells.wg-kit-slot-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
	align-content: start;
}

.flow-project-grid-cell {
	display: flex;
	min-width: 0;
	border-radius: var(--wg-kit-plate);
	cursor: pointer;
	transition:
		box-shadow var(--wg-quick) var(--wg-ease),
		transform var(--wg-press) var(--wg-ease);
}

.flow-project-grid-cell > * {
	flex: 1 1 auto;
	min-width: 0;
}

.flow-project-grid-cell:active {
	transform: scale(0.985);
}

.flow-project-grid-cell.is-picked {
	box-shadow: 0 0 0 2px var(--wg-kit-accent);
}

.flow-project-grid-cell:focus-visible {
	outline: 2px solid var(--wg-kit-accent);
	outline-offset: 2px;
}

.flow-project-grid-more {
	flex: none;
	align-self: flex-start;
}

.flow-project-grid-said {
	margin: 0;
	font-size: var(--font-ui-small);
	color: var(--wg-kit-text-muted);
}
`;

const PAGE_SIZE = 12;
const MORE = "Show more";
const NO_SLOT = "This grid has no widget to draw its projects with.";
const NOTHING = "No projects in what this tile is bound to.";
const PRESS_KEYS = ["Enter", " "];

type Project = VaultRecord & {
	mark?: string | null;
	repository?: string | null;
	open?: number | string | null;
	doing?: number | string | null;
	done?: number | string | null;
	touched?: string | null;
};

type GridProps = WidgetProps<typeof manifest>;
type ProjectSlot = Slot<{ project: Row<Project> }>;
type Drawn = NonNullable<ProjectSlot>;

export const manifest = defineManifest({
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
	role: "collection",
	size: { preferredWidth: "full", preferredHeight: "auto", collapseBelowPx: 200, stackBelowPx: 320 },
	slots: {
		card: {
			of: "widget",
			default: "@flow/project-card",
			surface: "group",
			gives: { project: ["mark", "name", "repository", "open", "doing", "done", "touched"] },
		},
	},
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
		projects: defineProp<Project[]>()({
			label: "Projects",
			hint: "One note per project. Bind the folder they live in.",
			default: [],
			describes: {
				mark: { label: "Mark", type: "line", aka: ["emoji", "icon", "symbol"] },
				repository: { label: "Repository", type: "line", aka: ["repo", "git", "source", "folder"] },
				open: { label: "Open", type: "number", aka: ["todo", "backlog", "waiting"] },
				doing: { label: "Doing", type: "number", aka: ["active", "wip", "inProgress"] },
				done: { label: "Done", type: "number", aka: ["closed", "finished", "complete"] },
				touched: { label: "Touched", type: "date", aka: ["updated", "modified", "lastTouched", "changed"] },
			},
		}),
		selection: defineProp<string>()({
			label: "Selected project",
			hint: "The project the pressed card names. Bind a task list or a docs tree to it and they follow the press.",
			of: "projects",
			field: "name",
			fallback: "first",
			writes: ["update"],
		}),
		pageSize: defineProp<number>()({
			label: "Projects per load",
			hint: "How many cards are drawn before the rest are asked for.",
			default: PAGE_SIZE,
		}),
	},
});

export default createWidget(manifest, ({ projects, selection, pageSize, slots }) => {
	const size = useAsked(pageSize);
	const { shown, more } = useShown(projects.id, size);
	const listed = useData(projects.list, { offset: 0, limit: shown });
	const picked = pickedValue(useData(selection.get).data);
	const pick = useCallback((ref: string) => void selection.update(ref), [selection]);
	const said = saidInstead(slots?.card, listed);
	if (said) return <GridSaid text={said} />;
	return (
		<Cells
			Drawn={slots?.card as Drawn}
			rows={listed.data as Row<Project>[]}
			picked={picked}
			onPick={pick}
			rest={restOf(listed.total, listed.data.length)}
			onMore={more}
		/>
	);
});

function saidInstead(
	slot: ProjectSlot | undefined,
	listed: { failure: string | null; isLoading: boolean; total: number | null },
) {
	if (!slot) return NO_SLOT;
	if (listed.failure) return listed.failure;
	return !listed.isLoading && listed.total === 0 ? NOTHING : null;
}

function useAsked(pageSize: GridProps["pageSize"]) {
	const asked = Math.round(Number(useData(pageSize.get).data));
	return asked > 0 ? asked : PAGE_SIZE;
}

function useShown(source: string, size: number) {
	const [shown, setShown] = useState(size);
	const more = useCallback(() => setShown((held) => held + size), [size]);
	useEffect(() => setShown(size), [source, size]);
	return { shown, more };
}

function restOf(total: number | null, drawn: number) {
	return Math.max(0, (total ?? drawn) - drawn);
}

function GridSaid({ text }: { text: string }) {
	return (
		<div className="flow-project-grid">
			<style>{CSS}</style>
			<p className="flow-project-grid-said">{text}</p>
		</div>
	);
}

type CellsProps = {
	Drawn: Drawn;
	rows: Row<Project>[];
	picked: string;
	onPick: (ref: string) => void;
	rest: number;
	onMore: () => void;
};

function Cells({ Drawn, rows, picked, onPick, rest, onMore }: CellsProps) {
	return (
		<div className="flow-project-grid">
			<style>{CSS}</style>
			<SlotList slot={Drawn} className="flow-project-grid-cells">
				{rows.map((row) => (
					<Cell key={row.ref} Drawn={Drawn} project={row} isPicked={isPicked(row, picked)} onPick={onPick} />
				))}
			</SlotList>
			{rest > 0 ? (
				<Button className="flow-project-grid-more" onClick={onMore}>
					{MORE}
					<Count>{rest}</Count>
				</Button>
			) : null}
		</div>
	);
}

function isPicked(row: Row<Project>, picked: string) {
	return picked !== "" && String(row.name ?? "") === picked;
}

type CellProps = { Drawn: Drawn; project: Row<Project>; isPicked: boolean; onPick: (ref: string) => void };

function Cell({ Drawn, project, isPicked: isOn, onPick }: CellProps) {
	const press = () => onPick(project.ref);
	return (
		<div
			className={cx("flow-project-grid-cell", isOn && "is-picked")}
			role="button"
			tabIndex={0}
			aria-pressed={isOn}
			onClick={press}
			onKeyDown={(event) => {
				if (!PRESS_KEYS.includes(event.key)) return;
				event.preventDefault();
				press();
			}}
		>
			<Drawn project={project} />
		</div>
	);
}

import {
	IListGateway,
	IValueGateway,
	createWidget,
	defineLayout,
	defineMetadata,
	defineProps,
	textOf,
	useData,
	z,
} from "widgetarium";
import { Button, Popover, PopoverSearch, useRoomForLabel } from "widgetarium/kit";
import { useRef, useState } from "react";
import { PEOPLE, RADIO, valuesFor } from "./control-kinds";
import { FilterTrigger } from "./filter-trigger";
import { GroupList } from "./group-list";
import type { Chosen, Group, TaskRow } from "./types";
import { useChosenDraft } from "./use-chosen-draft";

const ALL_TASKS = 2000;

const CSS = `
.orbi-filter { justify-content: flex-start; align-items: stretch; }

.orbi-filter .ofp-open { gap: var(--size-4-2, 8px); }
.orbi-filter .ofp-open.is-on { color: var(--interactive-accent); }
.orbi-filter .ofp-open.is-on::before { background: var(--wg-kit-accent-wash); }
.orbi-filter .ofp-open .ofp-icon { width: 17px; height: 17px; }
.orbi-filter .ofp-count { flex: none; }

.orbi-filter .ofp-icon { width: 16px; height: 16px; flex: none; }

.orbi-filter .ofp-pop {
	visibility: visible;
	width: 320px;
	max-width: min(320px, calc(100vw - 32px));
}

.orbi-filter .ofp-panel {
	display: flex;
	flex-direction: column;
	gap: var(--size-4-3, 12px);
	max-height: 70vh;
	overflow-y: auto;
}

.orbi-filter .ofp-group { display: flex; flex-direction: column; }

.orbi-filter .ofp-group-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--size-4-2, 8px);
	width: 100%;
	appearance: none;
	-webkit-appearance: none;
	margin: 0;
	padding: var(--size-2-2, 4px) var(--size-4-2, 8px);
	border: none;
	border-radius: 0;
	background: none;
	box-shadow: none;
	font-family: inherit;
	font-size: var(--font-ui-small, 14px);
	font-weight: var(--font-semibold, 600);
	color: var(--wg-kit-text);
	text-align: left;
	cursor: pointer;
}

.orbi-filter .ofp-group-head::before { border-radius: var(--wg-kit-item); }
.orbi-filter .ofp-group-head:hover::before { background: var(--background-modifier-hover); }

.orbi-filter .ofp-chev {
	color: var(--text-faint);
	transition: transform var(--wg-quick) var(--wg-ease);
}

.orbi-filter .ofp-group-head.is-on .ofp-chev { transform: rotate(90deg); }

.orbi-filter .ofp-option { width: 100%; justify-content: flex-start; }

.orbi-filter .ofp-av {
	display: grid;
	place-content: center;
	flex: none;
	width: 28px;
	height: 28px;
	border-radius: var(--wg-kit-pill, 999px);
	font-size: var(--font-ui-smaller, 12px);
	font-weight: var(--font-semibold, 600);
}

.orbi-filter .ofp-av.is-accent { background: var(--wg-kit-accent-wash); color: var(--interactive-accent); }
.orbi-filter .ofp-av.is-ok { background: var(--wg-kit-success-wash); color: var(--text-success); }
.orbi-filter .ofp-av.is-warn { background: var(--wg-kit-warning-wash); color: var(--wg-kit-warning); }
.orbi-filter .ofp-av.is-err { background: var(--wg-kit-error-wash); color: var(--text-error); }

.orbi-filter .ofp-name {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.orbi-filter .ofp-empty {
	margin: 0;
	padding: var(--size-4-2, 8px) var(--size-4-3, 12px);
	font-size: var(--font-ui-smaller, 12px);
	color: var(--text-faint);
}

.orbi-filter .ofp-foot {
	display: flex;
	align-items: center;
	gap: var(--size-4-2, 8px);
	padding: var(--size-4-2, 8px) var(--size-2-2, 4px) var(--size-2-2, 4px);
}

.orbi-filter .ofp-reset { flex: 1; }
.orbi-filter .ofp-apply { flex: 2; }

.orbi.orbi-filter .ofp-open.is-tight { justify-content: center; padding: 0; }
`;

const CHECKBOX = "checkbox";

const PROP = "prop";
const LABEL = "label";
const CONTROL = "control";
const RECORD_NAME = "name";

type Held = Record<string, unknown> & { props?: Record<string, unknown> };

const PEOPLE_NAMES = ["assignees", "members", "people", "owner", "owners"];
const NEVER_FILTERED = ["title", "board", "status", "deadline", "due"];
// TRADE-OFF: a mostly-distinct property is an identifier; ticking it leaves one row, a search the bar already has.
const MOST_DISTINCT_SHARE = 0.75;

function controlFor(prop: string, named: string): string {
	if (named === RADIO || named === PEOPLE || named === CHECKBOX) return named;
	return PEOPLE_NAMES.includes(prop.toLowerCase()) ? PEOPLE : CHECKBOX;
}

function groupOf(held: Held): Group {
	const prop = textOf(held, PROP) || textOf(held, RECORD_NAME);
	return { prop, label: textOf(held, LABEL) || prop, control: controlFor(prop, textOf(held, CONTROL)) };
}

function isCounted(rows: TaskRow[], prop: string): boolean {
	const values = valuesFor(rows, prop);
	return values.length > 0 && values.every((value) => value !== "" && Number.isFinite(Number(value)));
}

function groupsFromData(rows: TaskRow[]): Group[] {
	const seen = new Map<string, string>();
	for (const row of rows) {
		for (const key of Object.keys(row.props ?? {})) seen.set(key.toLowerCase(), key);
	}
	return [...seen.values()]
		.filter((key) => !NEVER_FILTERED.includes(key.toLowerCase()))
		.filter((key) => !isCounted(rows, key))
		.filter((key) => {
			const values = valuesFor(rows, key);
			return values.length > 1 && values.length <= Math.max(2, rows.length * MOST_DISTINCT_SHARE);
		})
		.sort()
		.map((key) => ({
			prop: key,
			control: controlFor(key, ""),
			label: `${key.charAt(0).toUpperCase()}${key.slice(1)}`,
		}));
}

function groupsFromBoard(names: string[], rows: TaskRow[]): Group[] {
	return names
		.map((name) => {
			const prop = keyCarrying(rows, name) ?? String(name).toLowerCase();
			return { prop, control: controlFor(prop, ""), label: String(name) };
		})
		.filter((group) => valuesFor(rows, group.prop).length > 0)
		.filter((group) => !NEVER_FILTERED.includes(group.prop.toLowerCase()));
}

function keyCarrying(rows: TaskRow[], name: string): string | null {
	const wanted = String(name).toLowerCase();
	for (const row of rows) {
		const found = Object.keys(row.props ?? {}).find((key) => key.toLowerCase() === wanted);
		if (found) return found;
	}
	return null;
}

function countOf(chosen: Chosen): number {
	return Object.values(chosen ?? {}).reduce(
		(total: number, values) => total + (Array.isArray(values) ? values.length : 1),
		0,
	);
}

// TRADE-OFF: an authored list outranks a derived one — a board may want its own order and labels
function groupsShown(authored: Group[], fromBoard: Group[], rows: TaskRow[]): Group[] {
	if (authored.length > 0) return authored;
	if (fromBoard.length > 0) return fromBoard;
	return groupsFromData(rows);
}

export const props = defineProps({
	tasks: IListGateway.of(z.custom<Held>(), {
		where: [{ prop: "board", op: "is", value: { wants: "@default/editable-tabs/selection" } }],
	}),
	groups: IListGateway.of(z.custom<Held>()),
	openGroup: IValueGateway.of(z.string().default("")).pick("get"),
	properties: IListGateway.of(z.custom<Held>()),
	chosen: IValueGateway.of(z.custom<Chosen>().default({})).pick("get", "update"),
});

const FilterPanel = createWidget({
	inject: props,
	draw: ({ tasks, groups, openGroup, properties, chosen }) => {
		const listed = useData(tasks.list, { limit: ALL_TASKS });
		const rows: TaskRow[] = listed.data;
		const authored = useData(groups.list, { limit: ALL_TASKS })
			.data.map((held) => groupOf(held))
			.filter((group: Group) => group.prop !== "");
		const named = useData(properties.list, { limit: ALL_TASKS })
			.data.map((held) => textOf(held, "name") || textOf(held, RECORD_NAME))
			.filter(Boolean);
		const shownGroups = groupsShown(authored, groupsFromBoard(named, rows), rows);
		const applied: Chosen = chosen.value ?? {};

		const triggerRef = useRef<HTMLButtonElement | null>(null);
		const hasRoomForWord = useRoomForLabel(triggerRef);

		const picking = useChosenDraft(applied, chosen);
		const [pressed, setPressed] = useState<string | null>(null);
		const shown = pressed ?? openGroup;

		return (
			<div className="orbi orbi-filter">
				<style>{CSS}</style>

				<Popover
					className="ofp-pop"
					trigger={<FilterTrigger triggerRef={triggerRef} count={countOf(applied)} hasRoomForWord={hasRoomForWord} />}
					isOpen={picking.isOpen}
					onOpenChange={picking.change}
				>
					<div className="ofp-panel">
						<PopoverSearch placeholder="Keyword" hint="Narrows the choices below, not the board">
							{(needle: string) => (
								<GroupList
									groups={shownGroups}
									rows={rows}
									needle={needle}
									unfolded={shown}
									onUnfold={setPressed}
									picking={picking}
								/>
							)}
						</PopoverSearch>

						<div className="ofp-foot">
							<Button className="ofp-reset" onClick={picking.reset}>
								Reset
							</Button>
							<Button className="ofp-apply" variant="accent" onClick={picking.apply}>
								Apply
							</Button>
						</div>
					</div>
				</Popover>
			</div>
		);
	},
});

export const metadata = defineMetadata(FilterPanel, {
	title: "Filter",
	description: "Narrows every widget bound to it by a task property, from one row of dropdowns.",
	keywords: [
		"filter",
		"narrow",
		"refine",
		"facet",
		"property",
		"dropdown",
		"condition",
		"sift",
		"query",
		"search",
		"panel",
		"controls",
		"where",
	],
	preview: {
		size: { w: 3, h: 1 },
		properties: ["Status", "Priority", "Assignees"],
		props: {
			tasks: {
				rows: [
					{
						path: "preview/1.md",
						title: "Design the onboarding flow",
						status: "To Do",
						priority: "P1",
						assignees: ["Alex Morgan"],
					},
					{
						path: "preview/2.md",
						title: "Build the board layout engine",
						status: "Doing",
						priority: "P1",
						assignees: ["Dana Reid"],
					},
					{
						path: "preview/3.md",
						title: "Ship the colour token set",
						status: "Done",
						priority: "P2",
						assignees: ["Kai Lawson"],
					},
				],
			},
		},
		shot: { of: "330087152" },
	},
	props: {
		tasks: {
			label: "Tasks",
		},
		groups: {
			label: "Filter by",
			hint: "The properties offered. Empty offers what the board names or the tasks carry.",
			describes: {
				prop: { label: "Property", type: "text", required: true },
				label: { label: "Label", type: "text" },
				control: { label: "Control", type: "text" },
			},
		},
		openGroup: {
			label: "Open by default",
			hint: "Whose choices unfold on opening. Name none and it opens folded.",
		},
		properties: {
			label: "Board properties",
			hint: "The properties this board names. Empty offers what the tasks carry.",
			describes: { name: { label: "Property", type: "text", required: true } },
		},
		chosen: {
			keep: "screen",
			label: "Chosen filters",
			hint: "What is ticked, as a box. Point a widget's Where at it and this narrows it.",
			shape: "conditions",
		},
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", stackBelowPx: 320 },
});

export default FilterPanel;

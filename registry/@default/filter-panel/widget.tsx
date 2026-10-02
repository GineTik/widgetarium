import {
	ICommand,
	IQuery,
	VaultRecordSchema,
	createWidget,
	defineLayout,
	defineMetadata,
	textOf,
	useData,
	z,
} from "widgetarium";
import { Button, Popover, PopoverSearch, useRoomForLabel } from "widgetarium/kit";
import { useRef, useState } from "react";
import { PEOPLE, RADIO, valuesFor } from "./control-kinds";
import { FilterTrigger } from "./filter-trigger";
import { GroupList } from "./group-list";
import { CSS } from "./style";
import type { Chosen, Group, TaskRow } from "./types";
import { useChosenDraft } from "./use-chosen-draft";

const ALL_TASKS = 2000;

const CHECKBOX = "checkbox";

const PROP = "prop";
const LABEL = "label";
const CONTROL = "control";
const RECORD_NAME = "name";

const FilterGroupSchema = VaultRecordSchema.extend({
	prop: z.string().optional(),
	label: z.string().optional(),
	control: z.string().optional(),
});

export const ChosenSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const PEOPLE_NAMES = ["assignees", "members", "people", "owner", "owners"];
const NEVER_FILTERED = ["title", "board", "status", "deadline", "due"];
// TRADE-OFF: a mostly-distinct property is an identifier; ticking it leaves one row, a search the bar already has.
const MOST_DISTINCT_SHARE = 0.75;

function controlFor(prop: string, named: string): string {
	if (named === RADIO || named === PEOPLE || named === CHECKBOX) return named;
	return PEOPLE_NAMES.includes(prop.toLowerCase()) ? PEOPLE : CHECKBOX;
}

function groupOf(held: z.infer<typeof FilterGroupSchema>): Group {
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
	return Object.values(chosen).reduce(
		(total: number, values) => total + (Array.isArray(values) ? values.length : 1),
		0,
	);
}

// TRADE-OFF: an authored list outranks a derived one — a board may want its own order and labels
function groupsToShow(authored: Group[], fromBoard: Group[], rows: TaskRow[]): Group[] {
	if (authored.length > 0) return authored;
	if (fromBoard.length > 0) return fromBoard;
	return groupsFromData(rows);
}

function onBoard(board: unknown) {
	if (board === undefined || board === null || board === "") return [];
	if (!Array.isArray(board)) return [{ prop: "board", op: "is", value: board }];
	return board.length === 0 ? [] : [{ prop: "board", op: "in", value: board }];
}

const FilterPanel = createWidget({
	inject: {
		getTasks: IQuery.expects(z.array(VaultRecordSchema)),
		getBoard: IQuery.expects(z.unknown().default(null)),
		getGroups: IQuery.expects(z.array(FilterGroupSchema)),
		getOpenGroup: IQuery.expects(z.string().default("")),
		getProperties: IQuery.expects(z.array(VaultRecordSchema)),
		getChosen: IQuery.expects(ChosenSchema.default({})),
		setChosen: ICommand.sends(ChosenSchema),
	},
	draw: ({
		getTasks,
		getBoard: board,
		getGroups,
		getOpenGroup: openGroup,
		getProperties,
		getChosen: chosen,
		setChosen,
	}) => {
		const listed = useData(getTasks, { where: onBoard(board), limit: ALL_TASKS });
		const rows: TaskRow[] = listed.data;
		const authored = useData(getGroups, { limit: ALL_TASKS })
			.data.map((held) => groupOf(held))
			.filter((group: Group) => group.prop !== "");
		const named = useData(getProperties, { limit: ALL_TASKS })
			.data.map((held) => textOf(held, "name") || textOf(held, RECORD_NAME))
			.filter(Boolean);
		const shownGroups = groupsToShow(authored, groupsFromBoard(named, rows), rows);

		const triggerRef = useRef<HTMLButtonElement | null>(null);
		const hasRoomForWord = useRoomForLabel(triggerRef);

		const picking = useChosenDraft(chosen, setChosen);
		const [pressed, setPressed] = useState<string | null>(null);
		const shown = pressed ?? openGroup;

		return (
			<div className="orbi orbi-filter">
				<style>{CSS}</style>

				<Popover
					className="ofp-pop"
					trigger={<FilterTrigger triggerRef={triggerRef} count={countOf(chosen)} hasRoomForWord={hasRoomForWord} />}
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
			getTasks: {
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
		getTasks: {
			label: "Tasks",
			aka: ["tasks"],
		},
		getBoard: {
			label: "Board",
			hint: "Which board's tasks are offered. Bind the board tabs and only the tasks of the board on screen are counted.",
			wants: "@default/editable-tabs/getSelection",
		},
		getGroups: {
			label: "Filter by",
			aka: ["groups"],
			hint: "The properties offered. Empty offers what the board names or the tasks carry.",
			describes: {
				prop: { label: "Property", type: "text", required: true },
				label: { label: "Label", type: "text" },
				control: { label: "Control", type: "text" },
			},
		},
		getOpenGroup: {
			label: "Open by default",
			aka: ["openGroup"],
			hint: "Whose choices unfold on opening. Name none and it opens folded.",
		},
		getProperties: {
			label: "Board properties",
			aka: ["properties"],
			hint: "The properties this board names. Empty offers what the tasks carry.",
			describes: { name: { label: "Property", type: "text", required: true } },
		},
		getChosen: {
			keep: "screen",
			label: "Chosen filters",
			aka: ["chosen"],
			hint: "What is ticked, as a box. Point a widget's Where at it and this narrows it.",
			shape: "conditions",
		},
		setChosen: {
			label: "Apply the filters",
			hint: "Runs when Apply or Reset is pressed, with everything that is now ticked.",
			source: { implementation: "@core/value-set", fields: { target: "getChosen" } },
		},
	},
});

export const layout = defineLayout({
	role: "control",
	size: { preferredWidth: "full", preferredHeight: "auto", stackBelowPx: 320 },
});

export default FilterPanel;

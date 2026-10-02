import { pathToFileURL } from "node:url";

import { isObject } from "../packages/core/src/engine/is-object.js";
import { stage, widgetFiles, WIDGETS_AT } from "./harness.ts";

export { stage, widgetFiles, WIDGETS_AT };

const PROBE = `import { IValueGateway, createWidget, defineLayout, defineMetadata, defineProps, z } from "widgetarium";
const props = defineProps({ seen: IValueGateway.of(z.unknown().default(null)).pick("get") });
export const metadata = defineMetadata(props, { title: "Box probe", description: "", props: { seen: { label: "Reads" } } });
export const layout = defineLayout({ size: { preferredWidth: 320, preferredHeight: "auto" } });
export default createWidget({
	inject: props,
	draw: ({ seen }) => (
		<div className="wg-probe"><i class="wg-probe-seen">{JSON.stringify(seen ?? null)}</i></div>
	),
});
`;

export function probeFiles() {
	return { [`${WIDGETS_AT}/@probe/context/widget.tsx`]: PROBE };
}

const KANBAN = "@default/kanban-board";
const ARCHIVED = "@default/archived-columns";
const CHOSEN = "Archived columns";

const TABS_COMMAND_ROWS = [
	"Add a tabAdds a row to a list on this board.",
	"Rename or archive a tabRewrites a row of a list on this board.",
	"Delete a tabDrops a row from a list on this board.",
	"Pick a tabSets a value on this board.",
];
const TABS_ROWS = ["Tabs", "Label field", "Value field", "Selected tab", ...TABS_COMMAND_ROWS];

const boundSwitcher = {
	id: "views",
	widget: "@default/view-tabs",
	props: { getOptions: { from: "ref", ref: "group/holds" }, getSelection: { from: "ref", ref: "group/selection" } },
};
const looseSwitcher = { id: "views", widget: "@default/view-tabs", props: { getOptions: { rows: [] } } };
const probeOn = (ref: string) => ({ id: "probe", widget: "@probe/context", props: { seen: { from: "ref", ref } } });

const kept = (of: readonly unknown[]) => ({ dir: "row", of: [{ dir: "column", keep: true, of }] });

function rowsOver(held: string) {
	return kept([
		{ id: "boards", height: 56 },
		{ id: "views", height: 56 },
		{ id: held, height: 620 },
	]);
}

function rowsAlone(held: string) {
	return kept([
		{ id: "boards", height: 56 },
		{ id: held, height: 680 },
	]);
}

const GROUPED = {
	tiles: [
		{
			id: "boards",
			widget: "@default/editable-tabs",
			props: { getTabs: { rows: [{ name: "One" }, { name: "Two" }] } },
		},
		boundSwitcher,
		{
			id: "group",
			widget: "@default/view-group",
			settings: { views: `${KANBAN}, ${ARCHIVED}` },
			mounted: { [KANBAN]: { props: { getTasks: { path: "Orbitask/Tasks" } } } },
		},
	],
	layout: rowsOver("group"),
};

const STRIPPED = {
	tiles: [
		{
			id: "boards",
			widget: "@default/editable-tabs",
			props: { getTabs: { rows: [{ name: "One" }, { name: "Two" }] } },
		},
		{
			id: "group",
			widget: "@default/view-group",
			settings: { views: `${KANBAN}, ${ARCHIVED}` },
			mounted: { [KANBAN]: { props: { getTasks: { path: "Orbitask/Tasks" } } } },
		},
	],
	layout: rowsAlone("group"),
};

const LOOSE = {
	tiles: [
		{
			id: "boards",
			widget: "@default/editable-tabs",
			props: { getTabs: { rows: [{ name: "One" }, { name: "Two" }] } },
		},
		looseSwitcher,
		{
			id: "board",
			widget: KANBAN,
			settings: { columns: "To Do, Doing, Done" },
			props: { getTasks: { path: "Orbitask/Tasks" } },
		},
	],
	layout: rowsOver("board"),
};

function narrowed<Board extends { readonly layout: unknown }>(board: Board, id: string, ratio: number): Board {
	const narrowIn = (node: unknown): unknown => {
		if (!isObject(node)) return node;
		const children = node["of"];
		if (Array.isArray(children)) return { ...node, of: children.map(narrowIn) };
		return node["id"] === id ? { ...node, ratio } : node;
	};
	return { ...board, layout: narrowIn(board.layout) };
}

const STUCK = {
	tiles: [
		{
			id: "boards",
			widget: "@default/editable-tabs",
			props: { getTabs: { rows: [{ name: "One" }, { name: "Two" }] } },
		},
		looseSwitcher,
		{
			id: "board",
			widget: KANBAN,
			settings: { columns: "To Do, Doing, Done" },
			props: { getTasks: { path: "Orbitask/Tasks" } },
		},
		{ id: "filters", widget: "@default/filter-panel" },
	],
	layout: kept([
		{ id: "boards", height: 56 },
		{
			dir: "row",
			of: [
				{ id: "views", ratio: 16 },
				{ id: "filters", ratio: 4 },
			],
			height: 56,
		},
		{ id: "board", height: 640 },
	]),
};

const SETTINGS_STEP = {
	name: "settings",
	within: ".orbi-view-tabs",
	click: '.wg-tile-actions button[aria-label="Settings"]',
};
const BOARD_SETTINGS_STEP = {
	name: "boardSettings",
	within: '[data-cell="boards"]',
	click: '.wg-tile-actions button[aria-label="Settings"]',
};
const CLOSE_STEP = { name: "closed", click: '.wg-set-head button[aria-label="Close without keeping the changes"]' };

const at = (value: unknown, ...keys: readonly string[]): unknown =>
	keys.reduce<unknown>((held, key) => (isObject(held) ? held[key] : undefined), value);
const listAt = (value: unknown, ...keys: readonly string[]): unknown[] => {
	const held = at(value, ...keys);
	return Array.isArray(held) ? held : [];
};
const tileIn = (staged: unknown, step: string, id: string): unknown =>
	listAt(staged, step, "tiles").find((tile) => at(tile, "id") === id);

let bad = 0;
function check(said: string, got: unknown, wanted: unknown): void {
	const same = JSON.stringify(got) === JSON.stringify(wanted);
	if (!same) bad += 1;
	console.log(
		`${same ? "ok  " : "FAIL"}  ${said}${same ? "" : `\n        got ${JSON.stringify(got)}\n        want ${JSON.stringify(wanted)}`}`,
	);
}

async function gate() {
	const files = widgetFiles();
	const grouped = await stage({
		board: GROUPED,
		files,
		editing: true,
		steps: [
			{ name: "opened", click: ".orbi-view-tabs .ovt-pick" },
			{ name: "picked", click: ".wg-kit-pop-item", said: CHOSEN },
			{ name: "reopened", click: ".orbi-view-tabs .ovt-pick" },
			{ name: "back", click: ".wg-kit-pop-item", said: "Kanban" },
			SETTINGS_STEP,
			CLOSE_STEP,
			BOARD_SETTINGS_STEP,
		],
	});
	check("a group draws the view its box names with no click", at(grouped, "arrival", "drawn"), ["Kanban"]);
	check("the switcher labels the same view", at(grouped, "arrival", "tabLabel"), "Kanban");
	check("the switcher offers every view the group holds", at(grouped, "opened", "items"), ["Kanban", CHOSEN]);
	check("picking another view draws it", at(grouped, "picked", "drawn"), [CHOSEN]);
	check("picking back draws the first view again", at(grouped, "back", "drawn"), ["Kanban"]);
	check("a bound switcher draws no notice", at(grouped, "arrival", "deaf"), null);
	check("the switcher follows the box it wrote", at(grouped, "back", "tabLabel"), "Kanban");
	check(
		"opening a tile's settings complains about nothing",
		[at(grouped, "boardSettings", "failures"), at(grouped, "boardSettings", "warnings")],
		[[], []],
	);
	check("a field name is offered as a name, not as JSON", at(grouped, "boardSettings", "rowValues"), [
		"Tabs = Typed here",
		"Label field = name",
		"Value field = board",
		"Selected tab = Its own",
		...TABS_COMMAND_ROWS.map((row) => `${row} = `),
	]);

	const TYPED = {
		tiles: [
			{ id: "boards", widget: "@default/editable-tabs", props: { getTabs: { rows: [{ name: "One", board: "one" }] } } },
			probeOn("boards/selection"),
		],
		layout: kept([
			{ id: "boards", height: 56 },
			{ id: "probe", height: 56 },
		]),
	};
	const TYPE_AN_ITEM = [
		BOARD_SETTINGS_STEP,
		{ name: "opened", click: ".wg-set-panel .wg-set-row", saying: "Tabs" },
		{ name: "adding", click: ".wg-set-pop .wg-set-row", saying: "Add item" },
		{ name: "broke", click: ".wg-set-pop textarea", type: "name: [" },
		{ name: "stray", click: ".wg-set-pop textarea", type: 'name: "Two"\nnope: 1' },
		{ name: "blank", click: ".wg-set-pop textarea", type: 'name: ""' },
		{ name: "dated", click: ".wg-set-pop textarea", type: 'name: "Two"\narchivedAt: "not a day"' },
		{ name: "typed", click: ".wg-set-pop textarea", type: 'name: "Two"\nboard: "two"' },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
		{ name: "picked", click: ".wg-tabs .wg-tabs-tab", said: "Two" },
	];
	const typed = await stage({ board: TYPED, files: { ...files, ...probeFiles() }, editing: true, steps: TYPE_AN_ITEM });
	check(
		"every step of typing an item found something to press",
		TYPE_AN_ITEM.map((step) => at(typed, step.name, "pressed")),
		TYPE_AN_ITEM.map(() => true),
	);
	check("a list typed into the tile is the strip", at(typed, "arrival", "strip"), ["One"]);
	check("the label is drawn and the value is handed down", at(typed, "arrival", "probe"), '"one"');
	check(
		"the panel holds one row for the prop, and the list is inside it",
		[at(typed, "boardSettings", "rows"), at(typed, "opened", "popRows")],
		[TABS_ROWS, ["One", "Add item"]],
	);
	check("and says the rows live in the tile", at(typed, "boardSettings", "rowValues", "0"), "Tabs = Typed here");
	check(
		"and the popup names the source and says what it is",
		[at(typed, "opened", "popTitle"), at(typed, "opened", "popHint")],
		["Tabs", "Every tab is a record. A folder makes each a note; a typed list lives in this tile."],
	);
	check(
		"a new item is spelled out as YAML, every field on its own line",
		at(typed, "adding", "popArea"),
		'name: "" # text\nboard: null # optional, text\narchivedAt: null # optional, datetime',
	);
	check(
		"broken YAML is said, and Apply refuses",
		[at(typed, "broke", "popError"), at(typed, "broke", "applyOff")],
		["That is not valid YAML, so nothing was kept.", "Apply"],
	);
	check(
		"a field the list does not keep is named",
		at(typed, "stray", "popError"),
		'The field "nope" is not one this list keeps.',
	);
	check(
		"a required field left empty is named",
		at(typed, "blank", "popError"),
		'The field "name" is required, so it cannot be left empty.',
	);
	check(
		"a date that is not one is named",
		at(typed, "dated", "popError"),
		'The field "archivedAt" must be a date and time, like 2026-09-01T09:00:00Z.',
	);
	check(
		"and a valid item complains about nothing",
		[at(typed, "typed", "popError"), at(typed, "typed", "applyOff")],
		[null, null],
	);
	check(
		"Done writes the item beside the one already there",
		at(typed, "done", "tiles", "0", "props", "getTabs", "rows"),
		[
			{ name: "One", board: "one" },
			{ name: "Two", board: "two" },
		],
	);
	check("and the strip draws it", at(typed, "done", "strip"), ["One", "Two"]);
	check("picking it hands down the value that was typed, not the label", at(typed, "picked", "probe"), '"two"');

	const ARCHIVE_TYPED = [
		{ name: "menu", click: ".wg-tabs .wg-tabs-more" },
		{ name: "archived", click: ".wg-tabs .wg-kit-pop-item", saying: "Archive" },
		BOARD_SETTINGS_STEP,
		{ name: "opened", click: ".wg-set-panel .wg-set-row", saying: "Tabs" },
		{ name: "item", click: ".wg-set-pop .wg-set-row", saying: "One" },
	];
	const filed = await stage({
		board: TYPED,
		files: { ...files, ...probeFiles() },
		editing: true,
		steps: ARCHIVE_TYPED,
	});
	check(
		"every step of archiving a typed tab found something to press",
		ARCHIVE_TYPED.map((step) => at(filed, step.name, "pressed")),
		ARCHIVE_TYPED.map(() => true),
	);
	check("archiving takes the tab off the strip", at(filed, "archived", "strip"), ["Untitled 1"]);
	check("the archived one is still a row in the list", listAt(filed, "opened", "popRows").includes("One"), true);
	check(
		"and its YAML carries the day it was archived, not null",
		/^archivedAt: "\d{4}-\d\d-\d\dT/m.test(String(at(filed, "item", "popArea") ?? "")),
		true,
	);

	const RENAME_VALUE = [
		BOARD_SETTINGS_STEP,
		{ name: "valueRow", click: ".wg-set-panel .wg-set-row", saying: "Value field" },
		{ name: "typedKey", click: ".wg-set-pop input", type: "team" },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const reread = await stage({
		board: TYPED,
		files: { ...files, ...probeFiles() },
		editing: true,
		steps: RENAME_VALUE,
	});
	check(
		"every step of naming another value field found something to press",
		RENAME_VALUE.map((step) => at(reread, step.name, "pressed")),
		RENAME_VALUE.map(() => true),
	);
	check("the field a tab reads is the one that changed", at(reread, "done", "tiles", "0", "props", "getValue"), {
		from: "typed",
		value: "team",
	});
	check(
		"and the typed items keep every key they were written with",
		at(reread, "done", "tiles", "0", "props", "getTabs", "rows"),
		[{ name: "One", board: "one" }],
	);

	const BOUND = {
		tiles: [{ id: "boards", widget: "@default/editable-tabs", props: { getTabs: { path: "Orbitask/Boards" } } }],
		layout: kept([{ id: "boards", height: 56 }]),
	};
	const SOURCES_BUTTON = '.wg-set-pop button[aria-label="Where the data comes from"]';
	const SOURCE_ROW = ".wg-set-pop .wg-set-sources button";
	const SWITCH_KIND = [
		BOARD_SETTINGS_STEP,
		{ name: "opened", click: ".wg-set-panel .wg-set-row", saying: "Tabs" },
		{ name: "sources", click: SOURCES_BUTTON },
		{ name: "switched", click: SOURCE_ROW, saying: "Typed here" },
		{ name: "adding", click: ".wg-set-pop .wg-set-row", saying: "Add item" },
		{ name: "named", click: ".wg-set-pop textarea", type: 'name: "Solo"' },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "backSources", click: SOURCES_BUTTON },
		{ name: "back", click: SOURCE_ROW, saying: "Folder" },
		{ name: "againSources", click: SOURCES_BUTTON },
		{ name: "again", click: SOURCE_ROW, saying: "Typed here" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const switched = await stage({ board: BOUND, files, editing: true, steps: SWITCH_KIND });
	check(
		"every step of switching the source found something to press",
		SWITCH_KIND.map((step) => at(switched, step.name, "pressed")),
		SWITCH_KIND.map(() => true),
	);
	check("a folder-bound strip draws the notes it lists", Number(at(switched, "arrival", "strip", "length")) > 0, true);
	check("the prop names no source until its source button is pressed", at(switched, "opened", "kinds"), []);
	check(
		"the source list offers every place the rows can live on a board of one tile",
		at(switched, "sources", "kinds"),
		["Typed here", "From the web", "Folder", "Tagged notes", "Notes matching"],
	);
	check(
		"and the same source says the same thing whichever kind it is bound to",
		[at(switched, "opened", "popHint"), at(switched, "opened", "popHint") === at(typed, "opened", "popHint")],
		["Every tab is a record. A folder makes each a note; a typed list lives in this tile.", true],
	);
	check("the typed list draws instead of the folder", at(switched, "applied", "strip"), ["Solo"]);
	check("going back to the folder brings its notes again", Number(at(switched, "back", "strip", "length")) > 1, true);
	check(
		"and coming back finds the typed list where it was left",
		[at(switched, "again", "strip"), at(switched, "again", "popRows")],
		[["Solo"], ["Solo", "Add item"]],
	);
	check("both live in the tile, and only one of them is read", at(switched, "done", "tiles", "0", "props", "getTabs"), {
		path: "Orbitask/Boards",
		from: "typed",
		rows: [{ name: "Solo" }],
		allow: ["list", "get"],
	});
	check("the strip draws the typed list at the end", at(switched, "done", "strip"), ["Solo"]);
	check(
		"and the popup offers a row to add one",
		[at(switched, "switched", "rows"), at(switched, "switched", "popRows")],
		[TABS_ROWS, ["Add item"]],
	);

	const loose = await stage({ board: LOOSE, files, editing: true, steps: [SETTINGS_STEP] });
	check("with no group the board still draws the kanban", at(loose, "arrival", "drawn"), ["Kanban"]);
	check(
		"a switcher with nothing to offer shows the way out instead of a picker",
		at(loose, "arrival", "deaf"),
		"Add a view group",
	);
	check("and offers no picker", at(loose, "arrival", "picker"), false);

	const FILTERED = {
		tiles: [
			{
				id: "filters",
				widget: "@default/filter-panel",
				props: {
					getTasks: { path: "Orbitask/Tasks" },
					getGroups: { rows: [{ prop: "status", label: "Stage" }] },
					getOpenGroup: { value: "status" },
				},
			},
			probeOn("filters/chosen"),
		],
		layout: kept([
			{
				dir: "row",
				of: [
					{ id: "filters", ratio: 4 },
					{ id: "probe", ratio: 16 },
				],
				height: 56,
			},
		]),
	};
	const NARROW_BY = [
		{ name: "opened", click: ".ofp-open" },
		{ name: "ticked", click: ".ofp-option", saying: "Doing" },
		{ name: "applied", click: ".ofp-apply" },
		{ name: "settings", within: '[data-cell="filters"]', click: '.wg-tile-actions button[aria-label="Settings"]' },
	];
	const narrowing = await stage({
		board: FILTERED,
		files: { ...files, ...probeFiles() },
		editing: true,
		steps: NARROW_BY,
	});
	check(
		"every step of narrowing the board found something to press",
		NARROW_BY.map((step) => at(narrowing, step.name, "pressed")),
		NARROW_BY.map(() => true),
	);
	check("a typed group is drawn under the label it was given", at(narrowing, "opened", "filterGroups"), ["Stage"]);
	check("the group named as open is unfolded, its choices coming from the notes", at(narrowing, "opened", "items"), [
		"Doing",
		"Done",
		"To Do",
	]);
	check("and what was ticked is what its box holds", at(narrowing, "applied", "probe"), '{"status":["Doing"]}');
	check("every one of the panel's props is a row of its own", at(narrowing, "settings", "rows"), [
		"Tasks",
		"Board",
		"Filter by",
		"Open by default",
		"Board properties",
		"Chosen filters",
		"Apply the filtersRuns when Apply or Reset is pressed, with everything that is now ticked.",
	]);

	const NARROWED = {
		tiles: [
			{
				id: "boards",
				widget: "@default/editable-tabs",
				props: {
					getTabs: {
						rows: [
							{ name: "One", board: "one" },
							{ name: "Two", board: "two" },
						],
					},
				},
			},
			{
				id: "board",
				widget: KANBAN,
				settings: { columns: "To Do, Doing, Done" },
				props: { getTasks: { path: "Orbitask/Tasks" } },
			},
		],
		layout: kept([
			{ id: "boards", height: 56 },
			{ id: "board", height: 620 },
		]),
	};
	const DATA_TAB = { name: "data", click: '.wg-set-window [role="tab"]', said: "Data" };
	const KANBAN_SETTINGS = {
		name: "settings",
		within: '[data-cell="board"]',
		click: '.wg-tile-actions button[aria-label="Settings"]',
	};
	const BUILD_A_CONDITION = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "field", click: ".wg-set-pop .wg-kit-pop-item", said: "status" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is not" },
		{ name: "value", click: ".wg-set-pop .wg-kit-pop-item", said: "Done" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const built = await stage({ board: NARROWED, files, editing: true, steps: BUILD_A_CONDITION });
	check(
		"every step of building a condition found something to press",
		BUILD_A_CONDITION.map((step) => at(built, step.name, "pressed")),
		BUILD_A_CONDITION.map(() => true),
	);
	check("the Where list offers a way to add one", listAt(built, "data", "rows").includes("Add condition"), true);
	check(
		"the first step offers the properties the notes carry, and says what it wants",
		[at(built, "adding", "popItems"), at(built, "adding", "popNote")],
		[["order", "status", "title"], "Which property of the data are we looking at?"],
	);
	check(
		"the second offers the conditions that property takes, and says what it wants",
		[at(built, "field", "popItems"), at(built, "field", "popNote")],
		[["is", "is not", "contains", "is empty", "is not empty"], "How should that property be compared?"],
	);
	check(
		"the third offers the values the notes hold under it",
		[listAt(built, "condition", "popItems").slice(0, 3), at(built, "condition", "popNote")],
		[["Doing", "Done", "To Do"], "What is it compared against?"],
	);
	check(
		"and the row lands as the operator the engine reads",
		at(tileIn(built, "done", "board"), "props", "getTasks", "where"),
		[{ prop: "status", op: "ne", value: "Done" }],
	);
	check("the list reads it back as a sentence", at(built, "value", "rows", "0"), "status is not Done");

	const NEEDS_NO_VALUE = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "field", click: ".wg-set-pop .wg-kit-pop-item", said: "status" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is empty" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const emptied = await stage({ board: NARROWED, files, editing: true, steps: NEEDS_NO_VALUE });
	check(
		"every step of a condition that needs no value found something to press",
		NEEDS_NO_VALUE.map((step) => at(emptied, step.name, "pressed")),
		NEEDS_NO_VALUE.map(() => true),
	);
	check(
		"a condition that needs no value asks for none, and is whole at the second step",
		[at(emptied, "condition", "popNote"), at(emptied, "condition", "rows", "0")],
		[null, "status is empty"],
	);
	check(
		"and it is written with the value the operator wants",
		at(tileIn(emptied, "done", "board"), "props", "getTasks", "where"),
		[{ prop: "status", op: "exists", value: false }],
	);

	const POINT_AT_A_WIDGET = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "named", click: ".wg-set-pop input", type: "board" },
		{ name: "took", click: ".wg-set-pop button", said: "Use it" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is" },
		{ name: "widget", click: ".wg-set-pop .wg-kit-side-group .wg-kit-pop-item", said: "boards" },
		{ name: "picked", click: ".wg-set-pop .wg-kit-side-group .wg-kit-pop-item", said: "getSelection" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const pointed = await stage({ board: NARROWED, files, editing: true, steps: POINT_AT_A_WIDGET });
	check(
		"every step of pointing at another widget found something to press",
		POINT_AT_A_WIDGET.map((step) => at(pointed, step.name, "pressed")),
		POINT_AT_A_WIDGET.map(() => true),
	);
	check(
		"a property the notes do not carry is still nameable by hand",
		at(pointed, "took", "popNote"),
		"How should that property be compared?",
	);
	check("the value step offers the widgets, never their fields at once", at(pointed, "condition", "popBoxes"), [
		"boards",
	]);
	check("pressing a widget types it in, with the dot waiting", at(pointed, "widget", "popDraft"), "{{boards.}}");
	check("and only then are that widget's own fields offered", at(pointed, "widget", "popBoxes"), [
		"getLabel",
		"getValue",
		"getSelection",
	]);
	check("only the boxes are grouped, the typing is left bare", at(pointed, "condition", "popGroups"), [
		"From another widget",
	]);
	check("picking one writes a ref, not a value", at(tileIn(pointed, "done", "board"), "props", "getTasks", "where"), [
		{ prop: "board", op: "is", value: { ref: "boards/getSelection" } },
	]);
	check("and the board is narrowed by what the strip has picked", at(pointed, "done", "kanbans"), 1);
	check(
		"a board with no filter on it is not offered a filter to spread",
		listAt(pointed, "data", "rows").includes("Everything a filter has picked"),
		false,
	);

	const WITH_A_FILTER = {
		tiles: [
			...NARROWED.tiles,
			{
				id: "filters",
				widget: "@default/filter-panel",
				props: { getTasks: { path: "Orbitask/Tasks" }, getGroups: { rows: [{ prop: "status", label: "Stage" }] } },
			},
		],
		layout: kept([...listAt(NARROWED.layout, "of", "0", "of"), { id: "filters", height: 56 }]),
	};
	const SPREAD_A_FILTER = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "field", click: ".wg-set-pop .wg-kit-pop-item", said: "status" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is" },
		{ name: "spreading", click: ".wg-set-panel .wg-set-row", saying: "Everything a filter has picked" },
		{ name: "picked", click: ".wg-set-pop .wg-kit-pop-item", saying: "Chosen filters" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const spread = await stage({ board: WITH_A_FILTER, files, editing: true, steps: SPREAD_A_FILTER });
	check(
		"every step of spreading a filter found something to press",
		SPREAD_A_FILTER.map((step) => at(spread, step.name, "pressed")),
		SPREAD_A_FILTER.map(() => true),
	);
	check(
		"a box holding conditions is never offered as one value",
		listAt(spread, "condition", "popBoxes").some((said) => String(said).includes("Chosen filters")),
		false,
	);
	check(
		"the spread row offers it, and nothing else",
		listAt(spread, "spreading", "popBoxes").map((said) => String(said).split(" = ")[0]),
		["Filter · Chosen filters"],
	);
	check(
		"and it is written as a spread, not as a condition",
		listAt(tileIn(spread, "done", "board"), "props", "getTasks", "where").at(-1),
		{ spread: { ref: "filters/getChosen" } },
	);

	const NEW_SHAPE = {
		tiles: [
			GROUPED.tiles[0],
			boundSwitcher,
			{
				id: "group",
				widget: "@default/view-group",
				settings: {
					holds: [
						{ name: "Kanban", widget: KANBAN },
						{ name: CHOSEN, widget: ARCHIVED },
					],
				},
				mounted: { Kanban: { widget: KANBAN, props: { getTasks: { path: "Orbitask/Tasks" } } } },
			},
		],
		layout: rowsOver("group"),
	};

	const fresh = await stage({
		board: NEW_SHAPE,
		files,
		editing: true,
		steps: [{ name: "opened", click: ".orbi-view-tabs .ovt-pick" }],
	});
	check(
		"a note in the new shape draws the same board as the old one",
		at(fresh, "arrival", "painted"),
		at(grouped, "arrival", "painted"),
	);
	check("and offers the same views", at(fresh, "opened", "tabItems"), ["Kanban", CHOSEN]);
	check("reading an old-shape note writes nothing", at(grouped, "arrival", "writes"), 0);
	check("and neither does reading a new-shape one", at(fresh, "arrival", "writes"), 0);

	const twice = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "group", widget: "@default/view-group", settings: { views: `${KANBAN}, ${KANBAN}` } },
		],
		layout: rowsAlone("group"),
	};
	const doubled = await stage({
		board: twice,
		files,
		editing: true,
		steps: [{ name: "picked", click: ".wg-tree-swap-strip .wg-tabs-tab", said: "Kanban 2" }],
	});
	check("two mounts of one widget are two names, not one twice", at(doubled, "arrival", "groupStrip"), [
		"Kanban",
		"Kanban 2",
	]);
	check("and the second one can be selected on its own", at(doubled, "picked", "groupSelected"), "Kanban 2");
	check("with the group drawing it rather than complaining", at(doubled, "picked", "stray"), null);

	const untitled = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "group", widget: "@default/view-group", settings: { views: "@default/filter-panel" } },
		],
		layout: rowsAlone("group"),
	};
	const plain = await stage({ board: untitled, files, editing: true });
	check("a widget declaring no view name is still offered under one", at(plain, "arrival", "groupStrip"), ["Filter"]);

	const RENAME = [
		{ name: "menu", click: ".wg-tree-swap-strip .wg-tabs-more" },
		{ name: "renaming", click: ".wg-tree-swap-strip .wg-kit-pop-item", saying: "Rename" },
		{ name: "typed", click: ".wg-tree-swap-strip .wg-tabs-tab.is-editing", type: "Planner" },
	];
	const renamed = await stage({ board: STRIPPED, files, editing: true, steps: RENAME });
	check(
		"every step of renaming a view in the strip found something to press",
		RENAME.map((step) => at(renamed, step.name, "pressed")),
		RENAME.map(() => true),
	);
	check("the rename reaches the tab strip", at(renamed, "typed", "groupStrip"), ["Planner", CHOSEN]);
	const heldBox = at(renamed, "typed", "holds", "0");
	check(
		"the view carries its new name in the layout",
		listAt(heldBox, "of").map((view) => at(view, "name")),
		["Planner", CHOSEN],
	);
	check("and the widget in it is the very tile it always was", at(heldBox, "of", "0", "id"), "group:Kanban");
	check(
		"which is why the folder it reads never moved",
		at(tileIn(renamed, "typed", "group:Kanban"), "props", "getTasks", "path"),
		"Orbitask/Tasks",
	);
	check("an edited note is written", Number(at(renamed, "typed", "writes")) > 0, true);

	const CLASH = RENAME.map((step) => (step.name === "typed" ? { ...step, type: CHOSEN } : step));
	const clashed = await stage({ board: STRIPPED, files, editing: true, steps: CLASH });
	check("a rename onto a taken name is refused by the strip", at(clashed, "typed", "groupStrip"), ["Kanban", CHOSEN]);
	check("and the note is not written for it", at(clashed, "typed", "writes"), 0);

	const after = await stage({
		board: STRIPPED,
		files,
		editing: true,
		steps: [...RENAME, { name: "picked", click: ".wg-tree-swap-strip .wg-tabs-tab", said: "Planner" }],
	});
	check("a renamed view can be picked, and the box draws it", at(after, "picked", "drawn"), ["Kanban"]);
	check("with no complaint about a name nothing answers to", at(after, "picked", "stray"), null);

	const pressed = await stage({
		board: STUCK,
		files,
		editing: true,
		steps: [
			{ name: "held", click: ".orbi-view-tabs .ovt-deaf" },
			{ name: "opened", click: ".orbi-view-tabs .ovt-pick" },
			{ name: "picked", click: ".orbi-view-tabs .wg-kit-pop-item", said: CHOSEN },
			{ name: "reopened", click: ".orbi-view-tabs .ovt-pick" },
			{ name: "back", click: ".orbi-view-tabs .wg-kit-pop-item", said: "Kanban" },
		],
	});
	check(
		"the board that cannot switch draws one kanban and no picker",
		[at(pressed, "arrival", "kanbans"), at(pressed, "arrival", "picker")],
		[1, false],
	);

	const narrow = await stage({ board: narrowed(STUCK, "views", 3), files, editing: true });
	check("the way out stays readable three columns wide", at(narrow, "arrival", "deafClipped"), false);
	check("one press is enough to be heard", at(pressed, "held", "deaf"), null);
	const folded = at(pressed, "held", "holds", "0");
	check("the kanban MOVED into the box rather than being copied", at(pressed, "held", "kanbans"), 1);
	check(
		"and it is still a tile of the board's own, settings and all",
		at(tileIn(pressed, "held", "board"), "settings"),
		{ columns: "To Do, Doing, Done" },
	);
	check("the box holds it under its declared name", at(folded, "of"), [{ name: "Kanban", id: "board", hidden: false }]);
	check(
		"the box stands where the kanban stood, with the tile inside it",
		listAt(pressed, "held", "layout").at(-1),
		"board@0/2/0",
	);
	check(
		"and the switcher is bound to the box that was just made",
		at(tileIn(pressed, "held", "views"), "props", "getOptions", "ref"),
		`${String(at(folded, "id"))}/holds`,
	);
	const NO_KEPT_BOX = {
		...STUCK,
		layout: {
			dir: "row",
			of: [
				{ id: "boards", height: 56 },
				{ dir: "column", of: [at(STUCK.layout, "of", "0", "of", "1")] },
			],
		},
	};
	const keptless = await stage({
		board: NO_KEPT_BOX,
		files,
		editing: true,
		steps: [{ name: "held", click: ".orbi-view-tabs .ovt-deaf" }],
	});
	check(
		"a board whose root names no box to keep still folds its views into one",
		at(keptless, "held", "holds", "length"),
		1,
	);
	check(
		"and the box is placed in the first box that can hold it, never in a leaf",
		listAt(keptless, "held", "layout").at(-1),
		"board@1/2/0",
	);
	check("beside every tile that was already standing", at(keptless, "held", "layout"), [
		"boards@0",
		"views@1/0",
		"filters@1/1",
		"board@1/2/0",
	]);

	check("the switcher now offers the view the box holds", at(pressed, "opened", "tabItems"), ["Kanban"]);
	const ADDED = [
		{ name: "held", click: ".orbi-view-tabs .ovt-deaf" },
		{ name: "menu", click: ".wg-tree-swap-strip .wg-tabs-more" },
		{ name: "added", click: ".wg-tree-swap-strip .wg-kit-pop-item", saying: "Add" },
	];
	const grew = await stage({ board: STUCK, files, editing: true, steps: ADDED });
	check(
		"every step of adding a view found something to press",
		ADDED.map((step) => at(grew, step.name, "pressed")),
		ADDED.map(() => true),
	);
	check(
		"a view added in the strip stands beside the first",
		listAt(grew, "added", "holds", "0", "of").map((view) => at(view, "name")),
		["Kanban", "Untitled 1"],
	);
	check("it is a box of its own, holding nothing yet", at(grew, "added", "holds", "0", "of", "1", "id"), null);
	check("so it offers the press that fills it", Number(at(grew, "added", "addZones")) > 0, true);
	check(
		"and the kanban is put away while it stands",
		[at(grew, "added", "drawn"), at(grew, "added", "mountedViews")],
		[[], 1],
	);
	check("nothing complained on the way", [at(pressed, "back", "failures"), at(pressed, "back", "warnings")], [[], []]);

	console.log(bad === 0 ? "view gate: clean" : `view gate: ${bad} failed`);
	process.exit(bad === 0 ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await gate();

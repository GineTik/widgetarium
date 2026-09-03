import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

import { findBrowser, widgetFiles, WIDGETS_AT } from "./harness.mjs";

export { widgetFiles, WIDGETS_AT };

const PROBE = `import { createWidget, useData, WidgetRoot } from "widgetarium";
export default createWidget(function Probe({ seen }) {
	const held = useData(seen.get).data;
	return <WidgetRoot className="wg-probe"><i class="wg-probe-seen">{JSON.stringify(held ?? null)}</i></WidgetRoot>;
});
`;

const PROBE_MANIFEST = {
	id: "@probe/context",
	title: "Box probe",
	defaultSize: { w: 4, h: 1 },
	props: { seen: { kind: "value", label: "Reads", verbs: { get: "required" } } },
};

export function probeFiles() {
	return {
		[`${WIDGETS_AT}/@probe/context/widget.jsx`]: PROBE,
		[`${WIDGETS_AT}/@probe/context/manifest.json`]: JSON.stringify(PROBE_MANIFEST),
	};
}

const ROWS = ["To Do", "Doing", "Done"].flatMap((status, at) =>
	[1, 2].map((nth) => ({
		path: `Orbitask/Tasks/${status}-${nth}.md`,
		ref: { path: `Orbitask/Tasks/${status}-${nth}.md` },
		name: `${status} ${nth}`,
		props: { title: `${status} ${nth}`, status, order: at * 2 + nth },
		meta: { created: 1, modified: 2 },
		attachments: 0,
	})),
);

export async function stage({ board, files, steps, editing }) {
	const bundle = await esbuild.build({
		entryPoints: ["tools/view-page.jsx"],
		bundle: true,
		write: false,
		format: "iife",
		platform: "browser",
		target: "es2020",
		jsxFactory: "h",
		jsxFragment: "Fragment",
		logLevel: "warning",
	});

	const page = `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("styles.css", "utf8")}</style>
<style>body { margin: 0; background: #fff; color: #222; --background-primary: #fff; --background-secondary: #f6f6f6;
	--background-modifier-border: #e4e4e4; --text-normal: #222; --text-muted: #707070; --text-faint: #ababab;
	--text-on-accent: #fff; --interactive-accent: #6d4ee0; }
.wg-host { width: 1340px; }
* { transition: none !important; animation: none !important; }</style>
</head><body><div class="wg-host"></div>
<script id="wg-widgets" type="application/json">${JSON.stringify(files ?? widgetFiles())}</script>
<script id="wg-board" type="application/json">${JSON.stringify(board)}</script>
<script id="wg-rows" type="application/json">${JSON.stringify(ROWS)}</script>
<script id="wg-measure" type="application/json"></script>
<script>window.wgSteps = ${JSON.stringify(steps ?? [])}; window.wgEditing = ${JSON.stringify(Boolean(editing))};</script>
<script>${bundle.outputFiles[0].text}</script>
</body></html>`;

	const work = mkdtempSync(path.join(tmpdir(), "wg-view-"));
	const file = path.join(work, "view.html");
	writeFileSync(file, page);
	const dom = execFileSync(
		findBrowser("view"),
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1440,960", "--virtual-time-budget=9000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
	);
	const found = /<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/.exec(dom);
	if (!found || !found[1]) return { failure: "the page reported nothing", file };
	return { ...JSON.parse(found[1]), file };
}

const KANBAN = "@task/kanban-board";
const ARCHIVED = "@task/archived-columns";
const CHOSEN = "Archived columns";

const boundSwitcher = { id: "views", widget: "@task/view-tabs", props: { options: { from: "ref", ref: "group/holds" }, selection: { from: "ref", ref: "group/selection" } } };
const looseSwitcher = { id: "views", widget: "@task/view-tabs", props: { options: { value: [] } } };
const probeOn = (ref) => ({ id: "probe", widget: "@probe/context", props: { seen: { from: "ref", ref } } });

function places(held) {
	return { 20: { places: [
		{ id: "boards", x: 0, y: 0, w: 16, h: 1 },
		{ id: "views", x: 0, y: 1, w: 16, h: 1 },
		{ id: held, x: 0, y: 2, w: 16, h: 10 },
	] } };
}

function placesAlone(held) {
	return { 20: { places: [
		{ id: "boards", x: 0, y: 0, w: 16, h: 1 },
		{ id: held, x: 0, y: 1, w: 16, h: 11 },
	] } };
}

// CONTEXT: board is consumed only INSIDE the group's mounts, which is what proves the descent
const GROUPED = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One" }, { name: "Two" }] } } },
		boundSwitcher,
		{ id: "group", widget: "@core/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` }, mounted: { [KANBAN]: { props: { tasks: { path: "Orbitask/Tasks" } } } } },
	],
	layouts: places("group"),
};

const STRIPPED = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One" }, { name: "Two" }] } } },
		{ id: "group", widget: "@core/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` }, mounted: { [KANBAN]: { props: { tasks: { path: "Orbitask/Tasks" } } } } },
	],
	layouts: placesAlone("group"),
};

const LOOSE = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One" }, { name: "Two" }] } } },
		looseSwitcher,
		{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, props: { tasks: { path: "Orbitask/Tasks" } } },
	],
	layouts: places("board"),
};

function narrowed(board, id, w) {
	const layouts = {};
	for (const [columns, layout] of Object.entries(board.layouts)) {
		layouts[columns] = { places: layout.places.map((place) => (place.id === id ? { ...place, w } : place)) };
	}
	return { ...board, layouts };
}

// CONTEXT: the shape a real board arrived in — tabs, a bare kanban, a filter panel, a dialog
const STUCK = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One" }, { name: "Two" }] } } },
		looseSwitcher,
		{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, props: { tasks: { path: "Orbitask/Tasks" } } },
		{ id: "filters", widget: "@core/filter-panel" },
		{ id: "taskdialog", widget: "@task/task-dialog", props: { tasks: { path: "Orbitask/Tasks" } } },
	],
	layouts: {
		12: { places: [
			{ id: "boards", x: 0, y: 0, w: 12, h: 1 },
			{ id: "views", x: 0, y: 1, w: 9, h: 1 },
			{ id: "filters", x: 9, y: 1, w: 3, h: 1 },
			{ id: "board", x: 0, y: 2, w: 12, h: 12 },
			{ id: "taskdialog", x: 0, y: 14, w: 1, h: 1 },
		] },
		20: { places: [
			{ id: "boards", x: 1, y: 0, w: 19, h: 1 },
			{ id: "views", x: 1, y: 1, w: 16, h: 1 },
			{ id: "filters", x: 17, y: 1, w: 3, h: 1 },
			{ id: "taskdialog", x: 0, y: 0, w: 1, h: 1 },
			{ id: "board", x: 1, y: 2, w: 19, h: 11 },
		] },
	},
};

const SETTINGS_STEP = { name: "settings", within: ".orbi-view-tabs", click: '.wg-tile-actions button[aria-label="Settings"]' };
const BOARD_SETTINGS_STEP = { name: "boardSettings", within: '[data-tile="boards"]', click: '.wg-tile-actions button[aria-label="Settings"]' };
const CLOSE_STEP = { name: "closed", click: '.wg-set-head button[aria-label="Close without keeping the changes"]' };
const editRow = (saying, type) => [
	{ name: "rowOpen", click: ".wg-set-panel .wg-set-row", saying },
	{ name: "typed", click: ".wg-set-pop input", type },
	{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
	{ name: "done", click: ".wg-set-head button", said: "Done" },
];

let bad = 0;
function check(said, got, wanted) {
	const same = JSON.stringify(got) === JSON.stringify(wanted);
	if (!same) bad += 1;
	console.log(`${same ? "ok  " : "FAIL"}  ${said}${same ? "" : `\n        got ${JSON.stringify(got)}\n        want ${JSON.stringify(wanted)}`}`);
}

async function gate() {
	const files = widgetFiles();
	const grouped = await stage({ board: GROUPED, files, editing: true, steps: [
		{ name: "opened", click: ".orbi-view-tabs .ovt-pick" },
		{ name: "picked", click: ".wg-kit-pop-item", said: CHOSEN },
		{ name: "reopened", click: ".orbi-view-tabs .ovt-pick" },
		{ name: "back", click: ".wg-kit-pop-item", said: "Kanban" },
		SETTINGS_STEP,
		CLOSE_STEP,
		BOARD_SETTINGS_STEP,
	] });
	check("a group draws the view its box names with no click", grouped.arrival?.drawn, ["Kanban"]);
	check("the switcher labels the same view", grouped.arrival?.tabLabel, "Kanban");
	check("the switcher offers every view the group holds", grouped.opened?.items, ["Kanban", CHOSEN]);
	check("picking another view draws it", grouped.picked?.drawn, [CHOSEN]);
	check("picking back draws the first view again", grouped.back?.drawn, ["Kanban"]);
	check("a bound switcher draws no notice", grouped.arrival?.deaf, null);
	check("the switcher follows the box it wrote", grouped.back?.tabLabel, "Kanban");
	check("opening a tile's settings complains about nothing", [grouped.boardSettings?.failures, grouped.boardSettings?.warnings], [[], []]);
	check("a field name is offered as a name, not as JSON", grouped.boardSettings?.rowValues, ["Tabs = Typed here", "Label field = name", "Value field = board", "Selected tab = Its own"]);

	const TYPED = {
		tiles: [
			{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One", board: "one" }] } } },
			probeOn("boards/selection"),
		],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 16, h: 1 }, { id: "probe", x: 0, y: 1, w: 16, h: 1 }] } },
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
	check("every step of typing an item found something to press", TYPE_AN_ITEM.map((step) => typed[step.name]?.pressed), TYPE_AN_ITEM.map(() => true));
	check("a list typed into the tile is the strip", typed.arrival?.strip, ["One"]);
	check("the label is drawn and the value is handed down", typed.arrival?.probe, '"one"');
	check("the panel holds one row for the prop, and the list is inside it", [typed.boardSettings?.rows, typed.opened?.popRows], [["Tabs", "Label field", "Value field", "Selected tab"], ["One", "Add item"]]);
	check("and says the rows live in the tile", typed.boardSettings?.rowValues[0], "Tabs = Typed here");
	check(
		"and the popup names the source and says what it is",
		[typed.opened?.popTitle, typed.opened?.popHint],
		["Tabs", "Every tab is a record. A folder makes each a note; a typed list lives in this tile."],
	);
	check(
		"a new item is spelled out as YAML, every field on its own line",
		typed.adding?.popArea,
		'name: "" # text\nboard: null # optional, text\narchivedAt: null # optional, datetime',
	);
	check("broken YAML is said, and Apply refuses", [typed.broke?.popError, typed.broke?.applyOff], ["That is not valid YAML, so nothing was kept.", "Apply"]);
	check("a field the list does not keep is named", typed.stray?.popError, 'The field "nope" is not one this list keeps.');
	check("a required field left empty is named", typed.blank?.popError, 'The field "name" is required, so it cannot be left empty.');
	check("a date that is not one is named", typed.dated?.popError, 'The field "archivedAt" must be a date and time, like 2026-09-01T09:00:00Z.');
	check("and a valid item complains about nothing", [typed.typed?.popError, typed.typed?.applyOff], [null, null]);
	check("Done writes the item beside the one already there", typed.done?.tiles[0]?.props?.tabs?.value, [{ name: "One", board: "one" }, { name: "Two", board: "two" }]);
	check("and the strip draws it", typed.done?.strip, ["One", "Two"]);
	check("picking it hands down the value that was typed, not the label", typed.picked?.probe, '"two"');

	const ARCHIVE_TYPED = [
		{ name: "menu", click: ".wg-tabs .wg-tabs-more" },
		{ name: "archived", click: ".wg-tabs .wg-kit-pop-item", saying: "Archive" },
		BOARD_SETTINGS_STEP,
		{ name: "opened", click: ".wg-set-panel .wg-set-row", saying: "Tabs" },
		{ name: "item", click: ".wg-set-pop .wg-set-row", saying: "One" },
	];
	const filed = await stage({ board: TYPED, files: { ...files, ...probeFiles() }, editing: true, steps: ARCHIVE_TYPED });
	check("every step of archiving a typed tab found something to press", ARCHIVE_TYPED.map((step) => filed[step.name]?.pressed), ARCHIVE_TYPED.map(() => true));
	check("archiving takes the tab off the strip", filed.archived?.strip, ["Untitled 1"]);
	check("the archived one is still a row in the list", filed.opened?.popRows?.includes("One"), true);
	check("and its YAML carries the day it was archived, not null", /^archivedAt: "\d{4}-\d\d-\d\dT/m.test(filed.item?.popArea ?? ""), true);

	const RENAME_VALUE = [
		BOARD_SETTINGS_STEP,
		{ name: "valueRow", click: ".wg-set-panel .wg-set-row", saying: "Value field" },
		{ name: "typedKey", click: ".wg-set-pop input", type: "team" },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const reread = await stage({ board: TYPED, files: { ...files, ...probeFiles() }, editing: true, steps: RENAME_VALUE });
	check("every step of naming another value field found something to press", RENAME_VALUE.map((step) => reread[step.name]?.pressed), RENAME_VALUE.map(() => true));
	check("the field a tab reads is the one that changed", reread.done?.tiles[0]?.props?.value, { from: "typed", value: "team" });
	check("and the typed items keep every key they were written with", reread.done?.tiles[0]?.props?.tabs?.value, [{ name: "One", board: "one" }]);

	const BOUND = {
		tiles: [{ id: "boards", widget: "@task/board-tabs", props: { tabs: { path: "Orbitask/Boards" } } }],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 16, h: 1 }] } },
	};
	const SWITCH_KIND = [
		BOARD_SETTINGS_STEP,
		{ name: "opened", click: ".wg-set-panel .wg-set-row", saying: "Tabs" },
		{ name: "switched", click: '.wg-set-pop [role="tab"]', said: "Typed here" },
		{ name: "adding", click: ".wg-set-pop .wg-set-row", saying: "Add item" },
		{ name: "named", click: ".wg-set-pop textarea", type: 'name: "Solo"' },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "back", click: '.wg-set-pop [role="tab"]', said: "Folder" },
		{ name: "again", click: '.wg-set-pop [role="tab"]', said: "Typed here" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const switched = await stage({ board: BOUND, files, editing: true, steps: SWITCH_KIND });
	check("every step of switching the source found something to press", SWITCH_KIND.map((step) => switched[step.name]?.pressed), SWITCH_KIND.map(() => true));
	check("a folder-bound strip draws the notes it lists", switched.arrival?.strip.length > 0, true);
	check("the row offers every place the rows can live", switched.opened?.kinds, ["Folder", "Typed here", "From a widget"]);
	check(
		"and the same source says the same thing whichever kind it is bound to",
		[switched.opened?.popHint, switched.opened?.popHint === typed.opened?.popHint],
		["Every tab is a record. A folder makes each a note; a typed list lives in this tile.", true],
	);
	check("the typed list draws instead of the folder", switched.applied?.strip, ["Solo"]);
	check("going back to the folder brings its notes again", switched.back?.strip.length > 1, true);
	check("and coming back finds the typed list where it was left", [switched.again?.strip, switched.again?.popRows], [["Solo"], ["Solo", "Add item"]]);
	check("both live in the tile, and only one of them is read", switched.done?.tiles[0]?.props?.tabs, {
		path: "Orbitask/Boards",
		from: "typed",
		value: [{ name: "Solo" }],
	});
	check("the strip draws the typed list at the end", switched.done?.strip, ["Solo"]);
	check("and the popup offers a row to add one", [switched.switched?.rows, switched.switched?.popRows], [["Tabs", "Label field", "Value field", "Selected tab"], ["Add item"]]);

	const loose = await stage({ board: LOOSE, files, editing: true, steps: [SETTINGS_STEP] });
	check("with no group the board still draws the kanban", loose.arrival?.drawn, ["Kanban"]);
	check("a switcher with nothing to offer shows the way out instead of a picker", loose.arrival?.deaf, "Add a view group");
	check("and offers no picker", loose.arrival?.picker, false);

	const FILTERED = {
		tiles: [
			{
				id: "filters",
				widget: "@core/filter-panel",
				props: {
					tasks: { path: "Orbitask/Tasks" },
					groups: { value: [{ prop: "status", label: "Stage" }] },
					openGroup: { value: "status" },
				},
			},
			probeOn("filters/chosen"),
		],
		layouts: { 20: { places: [{ id: "filters", x: 0, y: 0, w: 4, h: 1 }, { id: "probe", x: 4, y: 0, w: 16, h: 1 }] } },
	};
	const NARROW_BY = [
		{ name: "opened", click: ".ofp-open" },
		{ name: "ticked", click: ".ofp-option", saying: "Doing" },
		{ name: "applied", click: ".ofp-apply" },
		{ name: "settings", within: '[data-tile="filters"]', click: '.wg-tile-actions button[aria-label="Settings"]' },
	];
	const narrowing = await stage({ board: FILTERED, files: { ...files, ...probeFiles() }, editing: true, steps: NARROW_BY });
	check("every step of narrowing the board found something to press", NARROW_BY.map((step) => narrowing[step.name]?.pressed), NARROW_BY.map(() => true));
	check("a typed group is drawn under the label it was given", narrowing.opened?.filterGroups, ["Stage"]);
	check("the group named as open is unfolded, its choices coming from the notes", narrowing.opened?.items, ["Doing", "Done", "To Do"]);
	check("and what was ticked is what its box holds", narrowing.applied?.probe, '{"status":["Doing"]}');
	check("every one of the panel's props is a row of its own", narrowing.settings?.rows, ["Tasks", "Filter by", "Open by default", "Board properties", "Chosen filters"]);

	const NARROWED = {
		tiles: [
			{ id: "boards", widget: "@task/board-tabs", props: { tabs: { value: [{ name: "One", board: "one" }, { name: "Two", board: "two" }] } } },
			{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, props: { tasks: { path: "Orbitask/Tasks" } } },
		],
		layouts: { 20: { places: [{ id: "boards", x: 0, y: 0, w: 16, h: 1 }, { id: "board", x: 0, y: 1, w: 16, h: 10 }] } },
	};
	const DATA_TAB = { name: "data", click: '.wg-set-window [role="tab"]', said: "Data" };
	const KANBAN_SETTINGS = { name: "settings", within: '[data-tile="board"]', click: '.wg-tile-actions button[aria-label="Settings"]' };
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
	check("every step of building a condition found something to press", BUILD_A_CONDITION.map((step) => built[step.name]?.pressed), BUILD_A_CONDITION.map(() => true));
	check("the Where list offers a way to add one", built.data?.rows.includes("Add condition"), true);
	check("the first step offers the properties the notes carry, and says what it wants", [built.adding?.popItems, built.adding?.popNote], [["order", "status", "title"], "Which property of the data are we looking at?"]);
	check("the second offers the conditions that property takes, and says what it wants", [built.field?.popItems, built.field?.popNote], [["is", "is not", "contains", "is empty", "is not empty"], "How should that property be compared?"]);
	check("the third offers the values the notes hold under it", [built.condition?.popItems.slice(0, 3), built.condition?.popNote], [["Doing", "Done", "To Do"], "What is it compared against?"]);
	check("and the row lands as the operator the engine reads", built.done?.tiles.find((tile) => tile.id === "board")?.props?.tasks?.where, [{ prop: "status", op: "ne", value: "Done" }]);
	check("the list reads it back as a sentence", built.value?.rows[0], "status is not Done");

	const NEEDS_NO_VALUE = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "field", click: ".wg-set-pop .wg-kit-pop-item", said: "status" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is empty" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const emptied = await stage({ board: NARROWED, files, editing: true, steps: NEEDS_NO_VALUE });
	check("every step of a condition that needs no value found something to press", NEEDS_NO_VALUE.map((step) => emptied[step.name]?.pressed), NEEDS_NO_VALUE.map(() => true));
	check("a condition that needs no value asks for none, and is whole at the second step", [emptied.condition?.popNote, emptied.condition?.rows[0]], [null, "status is empty"]);
	check("and it is written with the value the operator wants", emptied.done?.tiles.find((tile) => tile.id === "board")?.props?.tasks?.where, [{ prop: "status", op: "exists", value: false }]);

	const POINT_AT_A_WIDGET = [
		KANBAN_SETTINGS,
		DATA_TAB,
		{ name: "adding", click: ".wg-set-panel .wg-set-row", saying: "Add condition" },
		{ name: "named", click: ".wg-set-pop input", type: "board" },
		{ name: "took", click: ".wg-set-pop button", said: "Use it" },
		{ name: "condition", click: ".wg-set-pop .wg-kit-pop-item", said: "is" },
		{ name: "widget", click: ".wg-set-pop .wg-kit-side-group .wg-kit-pop-item", said: "boards" },
		{ name: "picked", click: ".wg-set-pop .wg-kit-side-group .wg-kit-pop-item", said: "selection" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
	];
	const pointed = await stage({ board: NARROWED, files, editing: true, steps: POINT_AT_A_WIDGET });
	check("every step of pointing at another widget found something to press", POINT_AT_A_WIDGET.map((step) => pointed[step.name]?.pressed), POINT_AT_A_WIDGET.map(() => true));
	check("a property the notes do not carry is still nameable by hand", pointed.took?.popNote, "How should that property be compared?");
	check("the value step offers the widgets, never their fields at once", pointed.condition?.popBoxes, ["boards"]);
	check("pressing a widget types it in, with the dot waiting", pointed.widget?.popDraft, "{{boards.}}");
	check("and only then are that widget's own fields offered", pointed.widget?.popBoxes, ["label", "value", "selection"]);
	check("only the boxes are grouped, the typing is left bare", pointed.condition?.popGroups, ["From another widget"]);
	check("picking one writes a ref, not a value", pointed.done?.tiles.find((tile) => tile.id === "board")?.props?.tasks?.where, [{ prop: "board", op: "is", value: { ref: "boards/selection" } }]);
	check("and the board is narrowed by what the strip has picked", pointed.done?.kanbans, 1);
	check("a board with no filter on it is not offered a filter to spread", pointed.data?.rows.includes("Everything a filter has picked"), false);

	const WITH_A_FILTER = {
		tiles: [
			...NARROWED.tiles,
			{ id: "filters", widget: "@core/filter-panel", props: { tasks: { path: "Orbitask/Tasks" }, groups: { value: [{ prop: "status", label: "Stage" }] } } },
		],
		layouts: { 20: { places: [...NARROWED.layouts[20].places, { id: "filters", x: 16, y: 0, w: 4, h: 1 }] } },
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
	check("every step of spreading a filter found something to press", SPREAD_A_FILTER.map((step) => spread[step.name]?.pressed), SPREAD_A_FILTER.map(() => true));
	check("a box holding conditions is never offered as one value", spread.condition?.popBoxes.some((said) => said.includes("Chosen filters")), false);
	check("the spread row offers it, and nothing else", spread.spreading?.popBoxes.map((said) => said.split(" = ")[0]), ["Filter · Chosen filters"]);
	check("and it is written as a spread, not as a condition", spread.done?.tiles.find((tile) => tile.id === "board")?.props?.tasks?.where.at(-1), { spread: { ref: "filters/chosen" } });

	// THE BOARD OWNS THE NAME. Every check below is read off a real rendered board: the tab
	// strip, the group's own body, and what reached board.tiles after Done.
	const NEW_SHAPE = {
		tiles: [
			GROUPED.tiles[0],
			boundSwitcher,
			{
				id: "group",
				widget: "@core/view-group",
				settings: { holds: [{ name: "Kanban", widget: KANBAN }, { name: CHOSEN, widget: ARCHIVED }] },
				mounted: { Kanban: { widget: KANBAN, props: { tasks: { path: "Orbitask/Tasks" } } } },
			},
		],
		layouts: places("group"),
	};

	const fresh = await stage({ board: NEW_SHAPE, files, editing: true, steps: [{ name: "opened", click: ".orbi-view-tabs .ovt-pick" }] });
	check("a note in the new shape draws the same board as the old one", fresh.arrival?.painted, grouped.arrival?.painted);
	check("and offers the same views", fresh.opened?.tabItems, ["Kanban", CHOSEN]);
	// CONTEXT: VACUOUS unless a write is possible at all — the counter is moved further down
	check("reading an old-shape note writes nothing", grouped.arrival?.writes, 0);
	check("and neither does reading a new-shape one", fresh.arrival?.writes, 0);

	// TWO MOUNTS OF ONE WIDGET. The key used to be the widget id, so the strip drew one name twice.
	const twice = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "group", widget: "@core/view-group", settings: { views: `${KANBAN}, ${KANBAN}` } },
		],
		layouts: placesAlone("group"),
	};
	const doubled = await stage({ board: twice, files, editing: true, steps: [{ name: "picked", click: ".ovg-strip .wg-tabs-tab", said: "Kanban 2" }] });
	check("two mounts of one widget are two names, not one twice", doubled.arrival?.groupStrip, ["Kanban", "Kanban 2"]);
	check("and the second one can be selected on its own", doubled.picked?.groupSelected, "Kanban 2");
	check("with the group drawing it rather than complaining", doubled.picked?.stray, null);

	// A WIDGET THAT DECLARES NO VIEW NAME still has to be usable — it used to answer to its title
	const untitled = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "group", widget: "@core/view-group", settings: { views: "@core/filter-panel" } },
		],
		layouts: placesAlone("group"),
	};
	const plain = await stage({ board: untitled, files, editing: true });
	check("a widget declaring no view name is still offered under one", plain.arrival?.groupStrip, ["Filter"]);

	// RENAMING, PRESSED THROUGH. Settings, the row, the field, Apply, Done — then the strip.
	const RENAME = [
		// CONTEXT: the group renders its child's root, not its own, so the TILE is what names it
		{ name: "settings", within: '[data-tile="group"]', click: '.wg-tile-actions button[aria-label="Settings"]' },
		...editRow(KANBAN, "Planner"),
	];
	const renamed = await stage({ board: STRIPPED, files, editing: true, steps: RENAME });
	check("the settings window lists the views by name", renamed.settings?.rows.some((row) => row.startsWith("Kanban")), true);
	check("every step of the rename found something to press", RENAME.map((step) => renamed[step.name]?.pressed), RENAME.map(() => true));
	check("the rename reaches the tab strip", renamed.done?.groupStrip, ["Planner", CHOSEN]);
	const heldGroup = renamed.done?.tiles.find((tile) => tile.id === "group");
	check("and the board is written in the new shape only", heldGroup?.settings, { holds: [{ name: "Planner", widget: KANBAN }, { name: CHOSEN, widget: ARCHIVED }] });
	check("the record follows the name it was renamed to", heldGroup?.mounted?.Planner?.props?.tasks?.path, "Orbitask/Tasks");
	check("and nothing is left under the widget id it arrived as", Object.keys(heldGroup?.mounted ?? {}), ["Planner"]);
	// THE COUNTER CAN MOVE, which is what makes the two zeros above mean anything
	check("an edited note is written", renamed.done?.writes > 0, true);

	// RENAMING ONTO A NAME ALREADY TAKEN — disambiguated, and the strip shows it
	const CLASH = RENAME.map((step) => (step.name === "typed" ? { ...step, type: CHOSEN } : step));
	const clashed = await stage({ board: STRIPPED, files, editing: true, steps: CLASH });
	check("a rename onto a taken name is disambiguated in the strip", clashed.done?.groupStrip, [`${CHOSEN} 2`, CHOSEN]);
	check("and the row it collided with keeps its own name", clashed.done?.tiles.find((tile) => tile.id === "group")?.settings?.holds?.[1]?.name, CHOSEN);

	// AND THE GROUP STILL SWITCHES, on a real pick and on the setting alone
	const after = await stage({ board: STRIPPED, files, editing: true, steps: [...RENAME, { name: "picked", click: ".ovg-strip .wg-tabs-tab", said: "Planner" }] });
	check("a renamed view can be picked, and the group draws it", after.picked?.drawn, ["Kanban"]);
	check("with no complaint about a name nothing answers to", after.picked?.stray, null);

	// CONTEXT: the owner's board shape, pressed through and read off the rendered board
	const pressed = await stage({ board: STUCK, files, editing: true, steps: [
		{ name: "held", click: ".orbi-view-tabs .ovt-deaf" },
		{ name: "opened", click: ".orbi-view-tabs .ovt-pick" },
		{ name: "picked", click: ".orbi-view-tabs .wg-kit-pop-item", said: CHOSEN },
		{ name: "reopened", click: ".orbi-view-tabs .ovt-pick" },
		{ name: "back", click: ".orbi-view-tabs .wg-kit-pop-item", said: "Kanban" },
	] });
	check("the board that cannot switch draws one kanban and no picker", [pressed.arrival?.kanbans, pressed.arrival?.picker], [1, false]);

	// CONTEXT: the notice arrived clipped, so a narrow tile is where readability is measured
	const narrow = await stage({ board: narrowed(STUCK, "views", 3), files, editing: true });
	check("the way out stays readable three columns wide", narrow.arrival?.deafClipped, false);
	check("one press is enough to be heard", pressed.held?.deaf, null);
	const born = pressed.held?.tiles.find((tile) => tile.widget === "@core/view-group");
	check("the kanban MOVED into the group rather than being copied", pressed.held?.kanbans, 1);
	check("and is gone from the board's own tiles", pressed.held?.tiles.map((tile) => tile.widget).includes(KANBAN), false);
	check("the group holds it under its declared name, beside a second view", born?.settings?.holds, [
		{ name: "Kanban", widget: KANBAN },
		{ name: CHOSEN, widget: ARCHIVED },
	]);
	check("with the settings the loose tile had", born?.mounted?.Kanban?.settings, { columns: "To Do, Doing, Done" });
	check("and the folder it read", born?.mounted?.Kanban?.props?.tasks?.path, "Orbitask/Tasks");
	check("the group stands where the kanban stood, at every authored width", [pressed.held?.layouts["12"].at(-1), pressed.held?.layouts["20"].at(-1)], [
		`${born?.id} 0,2 12x12`,
		`${born?.id} 1,2 19x11`,
	]);
	check("and no width was left holding the tile it swallowed", Object.values(pressed.held?.layouts ?? {}).flat().filter((place) => place.startsWith("board ")), []);
	check("the strip now offers both views", pressed.opened?.tabItems, ["Kanban", CHOSEN]);
	check("picking the second one draws it and puts the kanban away", [pressed.picked?.drawn, pressed.picked?.kanbans], [[CHOSEN], 0]);
	check("picking back brings the kanban again", [pressed.back?.drawn, pressed.back?.kanbans], [["Kanban"], 1]);
	check("nothing complained on the way", [pressed.back?.failures, pressed.back?.warnings], [[], []]);

	console.log(bad === 0 ? "view gate: clean" : `view gate: ${bad} failed`);
	process.exit(bad === 0 ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await gate();

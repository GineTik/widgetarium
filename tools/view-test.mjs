import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import esbuild from "esbuild";

const BROWSERS = [
	process.env.WG_CHROME,
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
	"/Applications/Chromium.app/Contents/MacOS/Chromium",
	"/usr/bin/google-chrome",
	"/usr/bin/chromium",
].filter(Boolean);

function browser() {
	for (const candidate of BROWSERS) {
		try {
			execFileSync(candidate, ["--version"], { stdio: "ignore" });
			return candidate;
		} catch {}
	}
	console.error("view gate: no Chrome found — set WG_CHROME to a Chromium binary");
	process.exit(1);
}

const WIDGETS_AT = ".widgetarium/widgets";

export function widgetFiles(from = "widgets") {
	const files = {};
	const walk = (at, to) => {
		for (const entry of fs.readdirSync(at, { withFileTypes: true })) {
			if (entry.isDirectory()) walk(path.join(at, entry.name), `${to}/${entry.name}`);
			else files[`${to}/${entry.name}`] = fs.readFileSync(path.join(at, entry.name), "utf8");
		}
	};
	walk(from, WIDGETS_AT);
	return files;
}

const PROBE = `import { createWidget, WidgetRoot } from "widgetarium";
export default createWidget(function Probe({ context }) {
	const seen = context.offered().map((key) => key + "=" + String(context.get(key))).join(" | ");
	return <WidgetRoot className="wg-probe"><i class="wg-probe-seen">{seen}</i></WidgetRoot>;
});
`;

const PROBE_MANIFEST = {
	id: "@probe/context",
	title: "Context probe",
	defaultSize: { w: 4, h: 1 },
	consumes: ["board"],
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
		browser(),
		["--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--window-size=1440,960", "--virtual-time-budget=9000", "--dump-dom", `file://${file}`],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", process.env.WG_DEBUG ? "inherit" : "ignore"] },
	);
	const found = /<script id="wg-measure" type="application\/json">([\s\S]*?)<\/script>/.exec(dom);
	if (!found || !found[1]) return { failure: "the page reported nothing", file };
	return { ...JSON.parse(found[1]), file };
}

const KANBAN = "@task/kanban-board";
const ARCHIVED = "@task/archived-columns";
const VIEWS = "Kanban, Archived columns";
const CHOSEN = "Archived columns";
// CONTEXT: deliberately wrong, so an item list taken from the setting rather than the group shows
const STALE = "Stale one, Stale two";

function places(held) {
	return { 20: { places: [
		{ id: "boards", x: 0, y: 0, w: 16, h: 1 },
		{ id: "views", x: 0, y: 1, w: 16, h: 1 },
		{ id: held, x: 0, y: 2, w: 16, h: 10 },
	] } };
}

// CONTEXT: board is consumed only INSIDE the group's mounts, which is what proves the descent
const GROUPED = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", settings: { tabs: "One, Two", activeTab: "One" } },
		{ id: "views", widget: "@task/view-tabs", settings: { views: STALE, activeView: CHOSEN } },
		{ id: "group", widget: "@core/view-group", settings: { views: `${KANBAN}, ${ARCHIVED}` }, mounted: { [KANBAN]: { sources: { tasks: { path: "Orbitask/Tasks" } } } } },
	],
	layouts: places("group"),
};

const LOOSE = {
	tiles: [
		{ id: "boards", widget: "@task/board-tabs", settings: { tabs: "One, Two", activeTab: "One" } },
		{ id: "views", widget: "@task/view-tabs", settings: { views: VIEWS, activeView: CHOSEN } },
		{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, sources: { tasks: { path: "Orbitask/Tasks" } } },
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
		{ id: "boards", widget: "@task/board-tabs", settings: { tabs: "One, Two", activeTab: "One" } },
		{ id: "views", widget: "@task/view-tabs" },
		{ id: "board", widget: KANBAN, settings: { columns: "To Do, Doing, Done" }, sources: { tasks: { path: "Orbitask/Tasks" } } },
		{ id: "filters", widget: "@core/filter-panel" },
		{ id: "taskdialog", widget: "@task/task-dialog", sources: { tasks: { path: "Orbitask/Tasks" } } },
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
const BOARD_SETTINGS_STEP = { name: "boardSettings", within: ".orbi-board-tabs", click: '.wg-tile-actions button[aria-label="Settings"]' };
const CLOSE_STEP = { name: "closed", click: '.wg-set-head button[aria-label="Close without keeping the changes"]' };

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
		{ name: "picked", click: ".wg-kit-pop-item", said: "Kanban" },
		{ name: "reopened", click: ".orbi-view-tabs .ovt-pick" },
		{ name: "back", click: ".wg-kit-pop-item", said: CHOSEN },
		SETTINGS_STEP,
		CLOSE_STEP,
		BOARD_SETTINGS_STEP,
	] });
	check("a group draws the selected view with no click", grouped.arrival?.drawn, [CHOSEN]);
	check("the switcher labels the selected view", grouped.arrival?.tabLabel, CHOSEN);
	check("the group offers every view it holds", grouped.opened?.items, ["Kanban", CHOSEN]);
	check("picking another view draws it", grouped.picked?.drawn, ["Kanban"]);
	check("picking back draws the first view again", grouped.back?.drawn, [CHOSEN]);
	check("a heard switcher draws no notice", grouped.arrival?.deaf, null);
	check("the switcher follows the view it wrote", grouped.back?.tabLabel, CHOSEN);
	check("a heard switcher earns no settings hint", grouped.settings?.hints, [null]);
	check("a key read only inside a mount still counts as heard", grouped.boardSettings?.hints, [null]);

	const loose = await stage({ board: LOOSE, files, editing: true, steps: [SETTINGS_STEP] });
	check("with no group the board still draws the kanban", loose.arrival?.drawn, ["Kanban"]);
	check("an unheard switcher offers the way out instead of a picker", loose.arrival?.deaf, "Add a view group");
	check("an unheard switcher offers no picker", loose.arrival?.picker, false);
	check("the settings name the key nothing reads", loose.settings?.hints, ["Nothing on this board reads view, so these settings steer nothing yet."]);

	// THE BOARD OWNS THE NAME. Every check below is read off a real rendered board: the tab
	// strip, the group's own body, and what reached board.tiles after Done.
	const NEW_SHAPE = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "views", widget: "@task/view-tabs", settings: { views: STALE, activeView: CHOSEN } },
			{
				id: "group",
				widget: "@core/view-group",
				settings: { holds: [{ name: "Kanban", widget: KANBAN }, { name: CHOSEN, widget: ARCHIVED }] },
				mounted: { Kanban: { widget: KANBAN, sources: { tasks: { path: "Orbitask/Tasks" } } } },
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
			{ id: "views", widget: "@task/view-tabs", settings: { views: STALE, activeView: "Kanban 2" } },
			{ id: "group", widget: "@core/view-group", settings: { views: `${KANBAN}, ${KANBAN}` } },
		],
		layouts: places("group"),
	};
	const doubled = await stage({ board: twice, files, editing: true, steps: [{ name: "opened", click: ".orbi-view-tabs .ovt-pick" }] });
	check("two mounts of one widget are two names, not one twice", doubled.opened?.tabItems, ["Kanban", "Kanban 2"]);
	check("and the second one can be selected on its own", doubled.arrival?.tabLabel, "Kanban 2");
	check("with the group drawing it rather than complaining", doubled.arrival?.stray, null);

	// A WIDGET THAT DECLARES NO VIEW NAME still has to be usable — it used to answer to its title
	const untitled = {
		tiles: [
			GROUPED.tiles[0],
			{ id: "views", widget: "@task/view-tabs", settings: { views: STALE, activeView: "Filter" } },
			{ id: "group", widget: "@core/view-group", settings: { views: "@core/filter-panel" } },
		],
		layouts: places("group"),
	};
	const plain = await stage({ board: untitled, files, editing: true, steps: [{ name: "opened", click: ".orbi-view-tabs .ovt-pick" }] });
	check("a widget declaring no view name is still offered under one", plain.opened?.tabItems, ["Filter"]);

	// RENAMING, PRESSED THROUGH. Settings, the row, the field, Apply, Done — then the strip.
	const RENAME = [
		// CONTEXT: the group renders its child's root, not its own, so the TILE is what names it
		{ name: "settings", within: '[data-tile="group"]', click: '.wg-tile-actions button[aria-label="Settings"]' },
		{ name: "rowOpen", click: ".wg-set-panel .wg-set-row", saying: KANBAN },
		{ name: "typed", click: ".wg-set-pop input", type: "Planner" },
		{ name: "applied", click: ".wg-set-pop button", said: "Apply" },
		{ name: "done", click: ".wg-set-head button", said: "Done" },
		{ name: "opened", click: ".orbi-view-tabs .ovt-pick" },
	];
	const renamed = await stage({ board: GROUPED, files, editing: true, steps: RENAME });
	check("the settings window lists the views by name", renamed.settings?.rows.some((row) => row.startsWith("Kanban")), true);
	check("every step of the rename found something to press", RENAME.map((step) => renamed[step.name]?.pressed), RENAME.map(() => true));
	check("the rename reaches the tab strip", renamed.opened?.tabItems, ["Planner", CHOSEN]);
	const heldGroup = renamed.done?.tiles.find((tile) => tile.id === "group");
	check("and the board is written in the new shape only", heldGroup?.settings, { holds: [{ name: "Planner", widget: KANBAN }, { name: CHOSEN, widget: ARCHIVED }] });
	check("the record follows the name it was renamed to", heldGroup?.mounted?.Planner?.sources?.tasks?.path, "Orbitask/Tasks");
	check("and nothing is left under the widget id it arrived as", Object.keys(heldGroup?.mounted ?? {}), ["Planner"]);
	// THE COUNTER CAN MOVE, which is what makes the two zeros above mean anything
	check("an edited note is written", renamed.done?.writes > 0, true);

	// RENAMING ONTO A NAME ALREADY TAKEN — disambiguated, and the strip shows it
	const CLASH = RENAME.map((step) => (step.name === "typed" ? { ...step, type: CHOSEN } : step));
	const clashed = await stage({ board: GROUPED, files, editing: true, steps: CLASH });
	check("a rename onto a taken name is disambiguated in the strip", clashed.opened?.tabItems, [`${CHOSEN} 2`, CHOSEN]);
	check("and the row it collided with keeps its own name", clashed.done?.tiles.find((tile) => tile.id === "group")?.settings?.holds?.[1]?.name, CHOSEN);

	// AND THE GROUP STILL SWITCHES, on a real pick and on the setting alone
	const after = await stage({ board: GROUPED, files, editing: true, steps: [...RENAME, { name: "picked", click: ".wg-kit-pop-item", said: "Planner" }] });
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
	check("and the folder it read", born?.mounted?.Kanban?.sources?.tasks?.path, "Orbitask/Tasks");
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

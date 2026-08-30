import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "KeyboardEvent", "MouseEvent", "Event"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 1340 });

buildMirror();
const { h, render } = await import("preact");
const { GRID } = await import("./.mjs-cache/paths.mjs");
const { CHROME, dialogBox, freeArea, openingScale, openingPan, clampPan } = await import("./.mjs-cache/settings-fit.mjs");
const { WidgetSurface, mountedTile } = await import("./.mjs-cache/surface.mjs");
const { normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");

let failed = 0;
function check(label, got, want) {
	const ok = String(got) === String(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${got}, want ${want}`}`);
}

const span = (cells) => cells * GRID.cellPx + (cells - 1) * GRID.gapPx;
const KANBAN = { width: span(12), height: span(8) };
const WIDE = { width: span(20), height: span(8) };
const WINDOW = { width: span(20) + 2 * GRID.padPx, height: 804 };

console.log("— the free area is the window minus every panel, and one cell of margin —\n");
{
	const free = freeArea(WINDOW, CHROME);
	check("it starts one cell in from the left edge", free.left, CHROME.padPx + GRID.cellPx);
	check("and one cell below the header's band", free.top, CHROME.padPx + CHROME.headerHeightPx + CHROME.gapPx + GRID.cellPx);
	check("it stops one cell short of the panel", free.right, WINDOW.width - CHROME.padPx - CHROME.panelWidthPx - CHROME.gapPx - GRID.cellPx);
	check("and one cell above the zoom bar's band", free.bottom, WINDOW.height - CHROME.padPx - CHROME.barHeightPx - CHROME.gapPx - GRID.cellPx);

	const folded = freeArea(WINDOW, { ...CHROME, panelWidthPx: CHROME.foldedPanelPx });
	check("folding the panel widens the free area", folded.width - free.width, CHROME.panelWidthPx - CHROME.foldedPanelPx);
}

console.log("\n— a widget that fits opens at 1:1, and centred —");
{
	const free = freeArea(WINDOW, CHROME);
	const opening = openingScale(KANBAN, free, CHROME.floorScale);
	check("the 12x8 kanban fits the free area", opening.fit, 1);
	check("so it opens at 1:1", opening.scale, 1);
	check("and is not panned", opening.panned, false);

	const at = openingPan(KANBAN, free, opening);
	check("centred horizontally", Math.round(at.x), Math.round(free.left + (free.width - KANBAN.width) / 2));
	check("centred vertically", Math.round(at.y), Math.round(free.top + (free.height - KANBAN.height) / 2));
}

console.log("\n— a widget wider than the free area is zoomed out, down to the floor —");
{
	const free = freeArea(WINDOW, CHROME);
	const opening = openingScale(WIDE, free, CHROME.floorScale);
	check("the fit is the width ratio, not the height", Math.round(opening.fit * 1000), Math.round((free.width / WIDE.width) * 1000));
	check("which is below the legibility floor", opening.fit < CHROME.floorScale, true);
	check("so the scale stops at the floor", opening.scale, CHROME.floorScale);
	check("and the window says it is panned", opening.panned, true);

	const at = openingPan(WIDE, free, opening);
	check("panned to the widget's top-left corner", `${at.x},${at.y}`, `${free.left},${free.top}`);
}

console.log("\n— between the floor and 1:1 it really does zoom, and stays centred —");
{
	const free = freeArea(WINDOW, CHROME);
	const slightly = { width: Math.round(free.width / 0.9), height: KANBAN.height };
	const opening = openingScale(slightly, free, CHROME.floorScale);
	check("it zooms to the ratio", Math.round(opening.scale * 100), 90);
	check("and is not panned", opening.panned, false);
	const at = openingPan(slightly, free, opening);
	check("still centred, at the zoomed size", Math.round(at.x - free.left), Math.round((free.width - slightly.width * opening.scale) / 2));
}

console.log("\n— the pan clamp keeps one whole cell of the widget outside both panels —");
{
	const free = freeArea(WINDOW, CHROME);
	const far = clampPan({ x: -100000, y: -100000 }, WIDE, 1, free, GRID.cellPx);
	check("dragged left as far as it goes, a cell is still in the free area", Math.round(far.x + WIDE.width - free.left), GRID.cellPx);
	check("and the same upward", Math.round(far.y + WIDE.height - free.top), GRID.cellPx);

	const other = clampPan({ x: 100000, y: 100000 }, WIDE, 1, free, GRID.cellPx);
	check("dragged right, a cell is still short of the panel", Math.round(free.right - other.x), GRID.cellPx);
	check("and the same downward", Math.round(free.bottom - other.y), GRID.cellPx);

	const inside = clampPan({ x: free.left + 20, y: free.top + 20 }, WIDE, 1, free, GRID.cellPx);
	check("a point already legal is left alone", `${inside.x},${inside.y}`, `${free.left + 20},${free.top + 20}`);

	const zoomed = clampPan({ x: -100000, y: 0 }, WIDE, 0.7, free, GRID.cellPx);
	check("at 0.7 the same widget stops later", Math.round(zoomed.x + WIDE.width * 0.7 - free.left), GRID.cellPx);
}

console.log("\n— on a phone the sheet takes the bottom, never the right edge —");
{
	const phone = { width: 375, height: 720 };
	const sheet = freeArea(phone, { ...CHROME, sheet: true });
	check("nothing is taken off the right for a sidebar", sheet.right, phone.width - CHROME.padPx - GRID.cellPx);
	check("the sheet's peek is taken off the bottom", sheet.bottom, phone.height - CHROME.padPx - CHROME.barHeightPx - CHROME.gapPx - CHROME.sheetPeekPx - CHROME.gapPx - GRID.cellPx);
}

console.log("\n— a mounted widget can record which widget fills its slot —");
{
	// CONTEXT: resolveSlots reads tile.slots, which mountedTile never built
	const parent = { id: "group", mounted: { kanban: { settings: { a: 1 }, slots: { card: "@other/card" } } } };
	const child = mountedTile(parent, "kanban", "@task/kanban-board");
	check("the child carries the slot pick", child.slots?.card, "@other/card");
	check("and a mount that never picked one carries an empty table", JSON.stringify(mountedTile({ id: "g" }, "k", "w").slots), "{}");
}

console.log("\n— and the panel writes what it draws —");
{
	const KANBAN_ID = "@task/kanban-board";
	const CARD_ID = "@task/task-card";
	const OTHER_ID = "@other/compact-card";

	const manifest = {
		id: KANBAN_ID,
		title: "Kanban board",
		collapseBelowPx: 240,
		settings: [{ key: "groupBy", type: "text", label: "Group tasks by", default: "status" }],
		// CONTEXT: what the parent DECLARES it hands the slot — the shape src/fit.js ranks against
		slots: { card: { of: "widget", default: CARD_ID, gives: { task: ["title", "status"] } } },
		sources: { tasks: { label: "Tasks", default: { path: "Orbitask/Tasks" } }, boards: { label: "Boards" } },
	};
	const Leaf = () => h("div", { class: "leaf" }, "leaf");
	// The misfit is the BIGGER tile on purpose: the bento sorts biggest first, so if fit were not
	// ranked ahead of size the misfit would lead the list and the ordering check below would fail.
	const fitting = { id: CARD_ID, title: "Task card", defaultSize: { w: 3, h: 2 }, accepts: { task: { required: ["title"] } } };
	const misfit = { id: OTHER_ID, title: "Compact card", defaultSize: { w: 8, h: 5 }, accepts: { task: { required: ["title", "estimate"] } } };
	const registry = {
		get: (id) => (id === KANBAN_ID ? { manifest, component: Leaf } : { manifest: { id, title: id }, component: Leaf }),
		list: () => [{ manifest }, { manifest: fitting }, { manifest: misfit }],
	};
	const slot = {
		canCreate: true,
		canUpdate: true,
		canRemove: true,
		canSubscribe: false,
		list: async () => ({ rows: [], total: 0 }),
		describe: async () => [],
	};
	const host = { platform: "test", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };

	let board = normalizeBoard({ tiles: [{ id: "t1", widget: KANBAN_ID }], layouts: { 20: [{ id: "t1", x: 0, y: 0, w: 12, h: 8 }] } });
	const mount = document.getElementById("host");
	const draw = () =>
		render(
			h(WidgetSurface, {
				board,
				registry,
				host,
				editing: true,
				initialWidth: 1340,
				onChange: (next) => {
					board = next;
					draw();
				},
			}),
			mount,
		);
	draw();

	// CONTEXT: the window mounts through a portal, and preact commits that on a frame, not a task
	const tick = async () => {
		for (let frame = 0; frame < 3; frame += 1) {
			await new Promise((done) => globalThis.requestAnimationFrame(() => setTimeout(done, 0)));
		}
	};
	const press = async (node) => {
		node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
		await tick();
	};
	// THE WINDOW LEFT THE MOUNT. It is a dialog portaled onto <body>, so a query scoped to the
	// board finds nothing — which is the whole point: it is no longer part of the note's flow.
	const find = (selector) => document.querySelector(selector);
	const all = (selector) => [...document.querySelectorAll(selector)];
	const rowSaying = (text) => all(".wg-set-panel .wg-kit-row").find((row) => row.textContent.includes(text));

	check("the tile draws a settings control", Boolean(find('.wg-tile-actions button[aria-label="Settings"]')), true);
	await press(find('.wg-tile-actions button[aria-label="Settings"]'));

	check("the window opened", Boolean(find(".wg-set-window")), true);
	check("and it opened OUTSIDE the board, on the body", Boolean(mount.querySelector(".wg-set-window")), false);
	check("over a backdrop that covers the screen", Boolean(find(".wg-dialog-overlay.wg-set-over")), true);
	check("it says it is a dialog", find(".wg-set-window")?.getAttribute("role"), "dialog");
	check("and a modal one", find(".wg-set-window")?.getAttribute("aria-modal"), "true");
	check("the page underneath cannot scroll while it is up", document.body.style.overflow, "hidden");
	check("the header names the widget", find(".wg-set-here")?.textContent, "Kanban board");
	check("the panel is one glass panel", all(".wg-set-panel.wg-kit-glass").length, 1);
	check("and there are exactly three glass surfaces", all(".wg-set-window .wg-kit-glass").length, 3);

	const settingRow = rowSaying("Group tasks by");
	check("the setting is drawn with its value", Boolean(settingRow) && settingRow.textContent.includes("status"), true);
	await press(settingRow);
	const field = find(".wg-set-pop input");
	check("pressing it opens a popover with a field", Boolean(field), true);
	field.value = "assignee";
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(".wg-set-pop button").find((button) => button.textContent.trim() === "Apply"));
	// THE WINDOW IS A DRAFT. Everything edited here is visible at once and saved by Done —
	// nothing reaches the board until then, so backing out really does back out.
	check("the board on disk has not moved yet", board.tiles[0].settings.groupBy, undefined);
	check("but the panel already draws the new value", rowSaying("Group tasks by")?.textContent.includes("assignee"), true);

	await press(rowSaying("Tasks"));
	const path = find(".wg-set-pop input");
	path.value = "Orbitask/Archive";
	path.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(".wg-set-pop button").find((button) => button.textContent.trim() === "Apply"));
	check("the source folder is written to the draft", rowSaying("Tasks")?.textContent.includes("Orbitask/Archive"), true);

	// THE SLOT PICKER IS THE CATALOGUE. What fills a slot is drawn on every row of the parent, so
	// the question is what it LOOKS like — and the same surface can say which candidates the slot
	// actually feeds, which a list of titles cannot.
	await press(rowSaying("Card"));
	check("pressing the slot row opens the catalogue", Boolean(find(".wg-cat-dialog")), true);
	check("in fill mode, so every tile offers to fill", all(".wg-cat-dialog .wg-cat-verb").every((verb) => verb.textContent === "Use"), true);

	const named = () => all(".wg-cat-dialog .wg-cat-tile").map((tile) => tile.querySelector(".wg-cat-name").textContent);
	check("it draws a tile per widget, not a row of names", named().length, 3);

	// RANK, NOT FILTER. `gives` is a declaration and drifts from the object the parent really
	// builds, so a hard filter turns normal drift into "my widget vanished and nothing said why".
	check("the candidate the slot feeds sorts first", named()[0], "Task card");
	check("and the one it cannot feed is still listed, last", named().at(-1), "Compact card");
	check("a widget that declares nothing is neither, so it sits between", named()[1], "Kanban board");

	const lacks = all(".wg-cat-dialog .wg-cat-tile").map((tile) => tile.querySelector(".wg-cat-lack")?.textContent ?? null);
	check("the misfit names the field it is missing", lacks.at(-1), "Needs estimate");
	check("the one that fits says nothing", lacks[0], null);
	check("and neither does the one that declared nothing", lacks[1], null);

	const divider = find(".wg-cat-dialog .wg-cat-divide");
	check("a divider is drawn above the misfits", Boolean(divider), true);
	const order = [...find(".wg-cat-dialog .wg-cat-grid").children];
	const firstShort = order.findIndex((node) => node.querySelector(".wg-cat-lack"));
	check("immediately above the first candidate that falls short", order.indexOf(divider), firstShort - 1);
	check("so nothing above it is a misfit", order.slice(0, firstShort - 1).every((node) => !node.querySelector(".wg-cat-lack")), true);
	check("the slot can still fall back to the widget's own default", Boolean(all(".wg-cat-dialog .wg-dialog-foot button").length), true);

	const pick = all(".wg-cat-dialog .wg-cat-tile").find((tile) => tile.textContent.includes("Compact card"));
	check("a misfit is offered, not withheld", Boolean(pick), true);
	await press(pick);
	check("picking it closes the catalogue", Boolean(find(".wg-cat-dialog")), false);
	check("the pick is written to the draft", rowSaying("Card")?.textContent.includes(OTHER_ID), true);


	const tab = (name) => all(".wg-set-panel .wg-kit-seg button").find((button) => button.textContent.trim() === name);
	await press(tab("Data"));
	const canRow = (name) => all(".wg-set-panel .wg-kit-row").find((row) => row.textContent.startsWith(name));
	check("the Data tab reports what the source can do", canRow("Create")?.textContent.includes("Orbitask/Archive"), true);
	check("and says it is on, because the folder is set", canRow("Create")?.textContent.endsWith("On"), true);
	check("Remove is reported too", canRow("Remove")?.textContent.endsWith("On"), true);

	const groupSaying = (label) => all(".wg-set-group").find((node) => node.querySelector(".wg-set-label")?.textContent === label);
	const boards = groupSaying("What Boards can do");
	check("a source with no folder reports every action off together", [...boards.querySelectorAll(".wg-kit-row")].every((row) => row.textContent.endsWith("Off")), true);
	check("and says why, once, above them", boards.querySelector(".wg-kit-row")?.textContent.includes("nowhere to put it"), true);

	await press(tab("Settings"));
	await press(rowSaying("Tasks"));
	const cleared = find(".wg-set-pop input");
	cleared.value = "";
	cleared.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(".wg-set-pop button").find((button) => button.textContent.trim() === "Apply"));
	check("clearing it falls back to the widget's own default", rowSaying("Tasks")?.textContent.includes("Orbitask/Tasks"), true);
	check("and the row says the difference out loud", Boolean(rowSaying("Tasks")?.classList.contains("is-unset")), true);
	await press(tab("Data"));
	check("so the actions stay on, because the default is the folder now", canRow("Create")?.textContent.includes("Orbitask/Tasks"), true);

	await press(tab("Design"));
	check("the Design tab draws the size on the board", Boolean(rowSaying("Width")), true);
	check("with the cells it has", rowSaying("Width")?.textContent.includes("12 cells"), true);
	await press(rowSaying("Width"));
	const wide = find(".wg-set-pop input");
	wide.value = "6";
	wide.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(".wg-set-pop button").find((button) => button.textContent.trim() === "Apply"));
	check("changing it writes the place in the draft", rowSaying("Width")?.textContent.includes("6 cells"), true);
	check("and the panel now says so", rowSaying("Width")?.textContent.includes("6 cells"), true);

	await press(tab("Settings"));
	const bar = (name) => all(".wg-set-bar button").find((button) => button.textContent.trim() === name);
	// the number is DERIVED, not pinned: the window fits the screen now, so a different screen
	// is a different scale and a pasted percentage would only ever record the last machine
	const screenFree = freeArea(dialogBox({ width: window.innerWidth, height: window.innerHeight }, false), CHROME);
	const screenFit = openingScale({ width: span(6), height: span(8) }, screenFree, CHROME.floorScale);
	check("it opened at the scale the SCREEN allows", find(".wg-set-said")?.textContent, `${Math.round(screenFit.scale * 100)}%`);
	check("and that is smaller than 1:1, or this assertion proves nothing", screenFit.scale < 1, true);
	check("below 1:1 the canvas is behind a look-only shield", Boolean(find(".wg-set-look")), true);
	await press(bar("1:1"));
	check("1:1 removes the transform the popovers and the glass cannot survive", find(".wg-set-body")?.style.transform, "none");
	check("and the shield with it", Boolean(find(".wg-set-look")), false);
	check("the canvas says it is live", Boolean(find(".wg-set-body.is-live")), true);
	await press(bar("Fit"));
	check("Fit puts the scale back", find(".wg-set-body")?.style.transform.startsWith("scale("), true);
	await press(bar("1:1"));
	await press(bar("Narrow"));
	check("Narrow draws the chip a reader would see", Boolean(find(".wg-set-chip .wg-narrow")), true);
	check("and hides the widget without unmounting it", find(".wg-set-body")?.style.visibility, "hidden");
	check("the widget is still there", Boolean(find(".wg-set-body .leaf")), true);
	await press(bar("Narrow"));
	check("pressing it again gives the widget back", find(".wg-set-body")?.style.visibility, "visible");

	await press(all(".wg-set-head button").find((button) => button.textContent.trim() === "Done"));
	check("Done saves the setting", board.tiles[0].settings.groupBy, "assignee");
	// the section cleared this field on purpose, and an empty own path is what falls back
	check("and the cleared source, still cleared", board.tiles[0].sources.tasks.path, "");
	check("and the slot that was picked", board.tiles[0].slots.card, OTHER_ID);
	check("and it survives a save", serializeBoard(board).tiles[0].slots.card, OTHER_ID);
	check("and the place the Design tab wrote", board.layouts[20].find((place) => place.id === "t1").w, 6);
	check("Done fades the panels first", Boolean(find(".wg-set-chrome.is-leaving")), true);
	check("and the box is still open while they go", Boolean(find(".wg-set-window")), true);
	await new Promise((done) => setTimeout(done, 240));
	await tick();
	check("then the window is gone", Boolean(find(".wg-set-window")), false);
	check("the backdrop with it", Boolean(find(".wg-dialog-overlay.wg-set-over")), false);
	check("and the page scrolls again", document.body.style.overflow, "");
	check("the widget came back to its tile", Boolean(mount.querySelector(".wg-tile-body .leaf")), true);
	check("and it carries none of the window\u2019s geometry", mount.querySelector(".wg-tile-body")?.getAttribute("style") || "", "");

	// BACKING OUT REALLY BACKS OUT. The bug this replaces: a size changed in the window reached
	// the file at once, so pressing the cross put the numbers back while the layout it had already
	// re-flowed stayed re-flowed — the board came back a different shape from the one it went in.
	{
		const before = JSON.stringify(serializeBoard(board));
		await press(find('.wg-tile-actions button[aria-label="Settings"]'));
		await press(tab("Design"));
		await press(rowSaying("Width"));
		const narrower = find(".wg-set-pop input");
		narrower.value = "3";
		narrower.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
		await tick();
		await press(all(".wg-set-pop button").find((button) => button.textContent.trim() === "Apply"));
		check("the window shows the change while it is open", rowSaying("Width")?.textContent.includes("3 cells"), true);
		check("and the board on disk has not moved", JSON.stringify(serializeBoard(board)), before);

		await press(find(".wg-set-head .wg-kit-icon"));
		await new Promise((done) => setTimeout(done, 240));
		await tick();
		check("closing without Done leaves the board exactly as it was", JSON.stringify(serializeBoard(board)), before);
		check("and the window is gone", Boolean(find(".wg-set-window")), false);
	}

	render(null, mount);
}

console.log(failed ? `\n${failed} things the settings window got wrong` : "\nthe settings window lands, clamps and writes");
process.exit(failed ? 1 : 0);

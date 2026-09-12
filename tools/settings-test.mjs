import { readFileSync } from "node:fs";
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
let boardWidthPx = 1340;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => boardWidthPx });

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { GRID } = await import("./.mjs-cache/paths.mjs");
boardWidthPx = 20 * GRID.cellPx + 19 * GRID.gapPx + 2 * GRID.padPx;
const { CHROME, barPlacement, dialogBox, freeArea, openingScale, openingPan, clampPan } = await import("./.mjs-cache/settings-fit.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { heldTile, normalizeBoard, serializeBoard } = await import("./.mjs-cache/model.mjs");

let failed = 0;

const OPEN_POP = '.wg-kit-anchor[aria-expanded="true"] .wg-set-pop';

// WHERE THE CONTROLS STAND WHILE THE SHEET MOVES. They were placed against the height the sheet
// RESTS at, so the moment it was dragged it grew up through them.
{
	const frame = 800;
	const resting = barPlacement(CHROME, CHROME.sheetPeekPx, frame);
	const raised = barPlacement(CHROME, 400, frame);
	const full = barPlacement(CHROME, 700, frame);
	check("the controls sit one gap above the sheet", resting.bottomPx, CHROME.padPx + CHROME.sheetPeekPx + CHROME.gapPx);
	check("and move with it, rather than staying where it used to rest", raised.bottomPx > resting.bottomPx, true);
	check("with room to spare they stay", [resting.hidden, raised.hidden], [false, false]);
	check("and once the sheet leaves them none, they go", full.hidden, true);
	check("nothing overlaps at any height the sheet can reach", [CHROME.sheetPeekPx, 300, 500, 700].every((height) => {
		const seen = barPlacement(CHROME, height, frame);
		return seen.hidden || seen.bottomPx >= CHROME.padPx + height + CHROME.gapPx;
	}), true);
}
function check(label, got, want) {
	const ok = same(got, want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? "" : `  got ${show(got)}, want ${show(want)}`}`);
}
// CONTEXT: String() made every object equal to every other
function same(got, want) {
	if (Object.is(got, want)) return true;
	if (!plain(got) || !plain(want)) return false;
	return JSON.stringify(got) === JSON.stringify(want);
}
function plain(value) {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === Array.prototype || proto === null;
}
function show(value) {
	return plain(value) ? JSON.stringify(value) : String(value);
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
	// CONTEXT: resolveSlots reads tile.slots, which the reader never built
	const parent = { id: "group", mounted: { kanban: { widget: "@task/kanban-board", settings: { a: 1 }, slots: { card: { widget: "@other/card" } } } } };
	const child = heldTile(parent, "mounted", "kanban", "@task/kanban-board");
	check("the child carries the slot pick", child.slots?.card?.widget, "@other/card");
	check("and a mount that never picked one carries an empty table", JSON.stringify(heldTile({ id: "g" }, "mounted", "k", "w").slots), "{}");
	// CONTEXT: the mount setting is the live truth; the record's widget is a mirror of it
	check("the setting's widget wins over the record's", heldTile({ id: "g", mounted: { k: { widget: "@stale/one" } } }, "mounted", "k", "@live/two").widget, "@live/two");
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

		// CONTEXT: what the parent DECLARES it hands the slot — the shape src/fit.js ranks against
		slots: { card: { of: "widget", default: CARD_ID, gives: { task: ["title", "status"] } } },
		props: {
			groupBy: { kind: "value", type: "text", label: "Group tasks by", verbs: { get: "required" }, default: { value: "status" } },
			isCompact: { kind: "value", type: "boolean", label: "Compact rows", verbs: { get: "required" }, default: { value: false } },
			tasks: { kind: "collection", label: "Tasks", verbs: { list: "required", create: "optional", update: "optional", remove: "optional" }, default: { path: "Orbitask/Tasks" } },
			boards: { kind: "collection", label: "Boards", verbs: { list: "required", create: "optional", update: "optional", remove: "optional" } },
		},
	};
	const Leaf = () => h("div", { className: "leaf" }, "leaf");
	// The misfit is the TALLER tile on purpose: the showcase packs tallest first, so if fit were not
	// ranked ahead of height the misfit would lead the list and the ordering check below would fail.
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
				initialWidth: boardWidthPx,
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
	// CONTEXT: the panel is a kit sidebar wearing the glass SURFACE, so it says is-glass, not wg-kit-glass
	check("the panel is one glass sidebar", all(".wg-set-panel.wg-kit-side.is-glass").length, 1);
	check("and there are exactly three glass surfaces", all(".wg-set-window .wg-kit-glass").length + all(".wg-set-window .wg-kit-side.is-glass").length, 3);

	const groupRow = rowSaying("Group tasks by");
	check("the typed value is drawn with its value", Boolean(groupRow) && groupRow.textContent.includes("status"), true);
	await press(groupRow);
	const field = find(OPEN_POP + " input");
	check("pressing it opens a popover with a field", Boolean(field), true);
	field.value = "assignee";
	field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
	// THE WINDOW IS A DRAFT. Everything edited here is visible at once and saved by Done —
	// nothing reaches the board until then, so backing out really does back out.
	check("the board on disk has not moved yet", board.tiles[0].props.groupBy, undefined);
	check("but the panel already draws the new value", rowSaying("Group tasks by")?.textContent.includes("assignee"), true);

	const switchRow = rowSaying("Compact rows");
	const switching = switchRow?.querySelector('.wg-set-switch [role="switch"]');
	check("a boolean is a switch on its own row, not a field behind a press", Boolean(switching), true);
	check("and it stands where the value the note holds says", switching?.getAttribute("aria-checked"), "false");
	await press(switching);
	check("flipping it writes the value into the draft", rowSaying("Compact rows")?.querySelector('[role="switch"]')?.getAttribute("aria-checked"), "true");
	check("and it opened no popover to do it", Boolean(find(OPEN_POP + " input")), false);

	await press(rowSaying("Tasks"));
	const path = find(OPEN_POP + " input");
	path.value = "Orbitask/Archive";
	path.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
	check("the source folder is written to the draft", rowSaying("Tasks")?.textContent.includes("Orbitask/Archive"), true);

	// THE SLOT PICKER IS THE CATALOGUE. What fills a slot is drawn on every row of the parent, so
	// the question is what it LOOKS like — and the same surface can say which candidates the slot
	// actually feeds, which a list of titles cannot.
	await press(rowSaying("Card"));
	check("pressing the slot row opens the catalogue", Boolean(find(".wg-cat-dialog")), true);
	check("in fill mode, so every tile offers to fill", all(".wg-cat-dialog .wg-cat-tile").every((tile) => tile.getAttribute("aria-label").startsWith("Use ")), true);

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

	// THE DIVIDER IS A LATTICE ROW, not a sibling in a list — so where it sits is a row number,
	// and what it separates is everything above that row from everything below it.
	const divider = find(".wg-cat-dialog .wg-cat-divide");
	check("a divider is drawn above the misfits", Boolean(divider), true);
	// CONTEXT: cards flow in document order now, so "above" is a position in that order
	const inOrder = all(".wg-cat-dialog .wg-cat-tile, .wg-cat-dialog .wg-cat-divide");
	const at = inOrder.indexOf(divider);
	const drawn = all(".wg-cat-dialog .wg-cat-tile");
	const short = drawn.filter((tile) => tile.querySelector(".wg-cat-lack"));
	check("every candidate that fits lies above it", drawn.filter((tile) => !tile.querySelector(".wg-cat-lack")).every((tile) => inOrder.indexOf(tile) < at), true);
	check("and every one that falls short lies below it", short.length > 0 && short.every((tile) => inOrder.indexOf(tile) > at), true);
	check("the slot can still fall back to the widget's own default", Boolean(all(".wg-cat-dialog .wg-dialog-foot button").length), true);

	// EACH CANDIDATE IS A CARD carrying its own playground — the board's lattice at the scale
	// that card needs — so the picker shows how much board a candidate would eat.
	const card = drawn.find((tile) => tile.querySelector(".wg-cat-name").textContent === "Task card");
	check("no candidate draws a lattice", drawn.some((tile) => tile.querySelector(".wg-cells")), false);
	check("with more than one span among them, or this proves nothing", new Set(drawn.map((tile) => tile.getAttribute("data-span"))).size > 1, true);
	// CONTEXT: these fixtures declare no preview, so the span falls back to the board size
	check("and the span shown is the size the manifest declares", card.getAttribute("data-span"), `${fitting.defaultSize.w}x${fitting.defaultSize.h}`);
	check("and no span badge is printed beside the name", card.querySelector(".wg-cat-span"), null);
	check("every candidate carries one button and no state mark", drawn.every((tile) => [...tile.querySelectorAll("button")].filter((node) => !node.closest(".wg-cat-pic")).length === 1 && tile.querySelectorAll(".wg-cat-badge").length === 0), true);
	check("and the press says the same word on every one", new Set(drawn.map((tile) => tile.getAttribute("aria-label").split(" ")[0])).size, 1);
	check("nothing sits under the list of candidates", find(".wg-cat-dialog .wg-cat-main").lastElementChild.className, "wg-cat-scroll");
	check("and no global strip names a selection", find(".wg-cat-dialog > .wg-cat-bar"), null);

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

	// CONTEXT: the kit took the row, so the class the old list rules were scoped under is never drawn
	check("nothing in the window draws a .wg-set-list", all(".wg-set-list").length, 0);
	check("and the rows it would have styled are drawn all the same", all(".wg-set-row").length > 0, true);

	const groupSaying = (label) => all(".wg-set-group").find((node) => node.querySelector(".wg-kit-side-label")?.textContent === label);
	const boards = groupSaying("What Boards can do");
	check("a source with no folder reports every action off together", [...boards.querySelectorAll(".wg-kit-row")].every((row) => row.textContent.endsWith("Off")), true);
	check("and says why, once, above them", boards.querySelector(".wg-kit-row")?.textContent.includes("nowhere"), true);

	await press(tab("Settings"));
	await press(rowSaying("Tasks"));
	const cleared = find(OPEN_POP + " input");
	cleared.value = "";
	cleared.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
	check("clearing it falls back to the widget's own default", rowSaying("Tasks")?.textContent.includes("Orbitask/Tasks"), true);
	check("and the row says the difference out loud", Boolean(rowSaying("Tasks")?.classList.contains("is-unset")), true);
	await press(tab("Data"));
	check("so the actions stay on, because the default is the folder now", canRow("Create")?.textContent.includes("Orbitask/Tasks"), true);

	await press(tab("Design"));
	check("the Design tab draws the size on the board", Boolean(rowSaying("Width")), true);
	check("with the cells it has", rowSaying("Width")?.textContent.includes("12 cells"), true);
	await press(rowSaying("Width"));
	const wide = find(OPEN_POP + " input");
	wide.value = "6";
	wide.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
	await tick();
	await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
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
	check("Done saves the typed value", board.tiles[0].props.groupBy.value, "assignee");
	// the section cleared this field on purpose, and an empty own path is what falls back
	check("and the cleared source, still cleared", board.tiles[0].props.tasks.path, "");
	check("and the slot that was picked", board.tiles[0].slots.card.widget, OTHER_ID);
	// CONTEXT: this file's check stringifies, so two objects always match — the comparison must be text
	check("and it survives a save, as a record", JSON.stringify(serializeBoard(board).tiles[0].slots.card), JSON.stringify({ widget: OTHER_ID }));
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
		const narrower = find(OPEN_POP + " input");
		narrower.value = "3";
		narrower.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
		await tick();
		await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
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

console.log("\n— an unfed child is a level of its own, and the trail is the way back —");
{
	const GROUP_ID = "@core/view-group";
	const KANBAN_ID = "@task/kanban-board";
	const ARCHIVE_ID = "@task/archived-columns";
	const CARD_ID = "@task/task-card";
	const PANEL_ID = "@task/side-panel";

	// CONTEXT: `views` is BOTH the mount name and the setting that fills it — resolveMounts pairs them
	// CONTEXT: the record is keyed by the NAME the board gave the row, which starts as the title
	const KANBAN_VIEW = "Kanban board";
	const shelf = {
		[GROUP_ID]: {
			id: GROUP_ID,
			title: "View group",
			// CONTEXT: the mount name is `holds`; `views` is the key notes were written with before
			mounts: { holds: { was: "views", label: "Views" } },
			props: { views: { kind: "value", type: "text", label: "Which views", verbs: { get: "required" }, default: { value: `${KANBAN_ID}, ${ARCHIVE_ID}` } } },
		},
		[KANBAN_ID]: {
			id: KANBAN_ID,
			title: "Kanban board",
	
			props: {
				groupBy: { kind: "value", type: "text", label: "Group tasks by", verbs: { get: "required" }, default: { value: "status" } },
			isCompact: { kind: "value", type: "boolean", label: "Compact rows", verbs: { get: "required" }, default: { value: false } },
				tasks: { kind: "collection", label: "Tasks", verbs: { list: "required" }, default: { path: "Orbitask/Tasks" } },
			},
			// the card is FED a task, the panel is not — one manifest carries both kinds on purpose
			slots: {
				card: { of: "widget", default: CARD_ID, gives: { task: ["title", "status"] } },
				panel: { of: "widget", default: PANEL_ID },
			},
		},
		[ARCHIVE_ID]: { id: ARCHIVE_ID, title: "Archived columns", props: { since: { kind: "value", type: "text", label: "Archived since", verbs: { get: "required" }, default: { value: "2019" } } } },
		[PANEL_ID]: { id: PANEL_ID, title: "Side panel", props: { width: { kind: "value", type: "text", label: "Panel width", verbs: { get: "required" }, default: { value: "narrow" } } } },
		[CARD_ID]: { id: CARD_ID, title: "Task card" },
	};
	const Leaf = () => h("div", { className: "leaf" }, "leaf");
	const registry = {
		get: (id) => (shelf[id] ? { manifest: shelf[id], component: Leaf } : null),
		list: () => Object.values(shelf).map((manifest) => ({ manifest })),
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

	// TWO TILES OF ONE WIDGET, because that is the shape the stale-board closure was said to eat
	let board = normalizeBoard({
		tiles: [
			{ id: "t1", widget: GROUP_ID, settings: { views: `${KANBAN_ID}, ${ARCHIVE_ID}` }, mounted: { [ARCHIVE_ID]: { settings: { since: "2020" } } } },
			{ id: "t2", widget: GROUP_ID, settings: { views: KANBAN_ID } },
		],
		layouts: { 20: [{ id: "t1", x: 0, y: 0, w: 9, h: 6 }, { id: "t2", x: 9, y: 0, w: 9, h: 6 }] },
	});
	const mount = document.getElementById("host");
	const draw = () =>
		render(
			h(WidgetSurface, {
				board,
				registry,
				host,
				editing: true,
				initialWidth: boardWidthPx,
				onChange: (next) => {
					board = next;
					draw();
				},
			}),
			mount,
		);
	draw();

	const tick = async () => {
		for (let frame = 0; frame < 3; frame += 1) {
			await new Promise((done) => globalThis.requestAnimationFrame(() => setTimeout(done, 0)));
		}
	};
	const press = async (node) => {
		node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
		await tick();
	};
	const escape = async () => {
		document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		await tick();
	};
	const find = (selector) => document.querySelector(selector);
	const all = (selector) => [...document.querySelectorAll(selector)];
	const rowSaying = (text) => all(".wg-set-panel .wg-kit-row").find((row) => row.textContent.includes(text));
	const here = () => find(".wg-set-here")?.textContent;
	const trail = () => all(".wg-set-crumbs .wg-set-crumb").map((crumb) => crumb.textContent);
	const settingsButtons = () => all('.wg-tile-actions button[aria-label="Settings"]');
	const typeInto = async (row, typed) => {
		await press(row);
		const field = find(OPEN_POP + " input");
		field.value = typed;
		field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
		await tick();
		await press(all(OPEN_POP + " button").find((button) => button.textContent.trim() === "Apply"));
	};

	await press(settingsButtons()[0]);
	check("the window opens on the tile's own widget", here(), "View group");
	check("and one crumb is no trail", trail(), []);

	const viewRow = rowSaying("Kanban board");
	// THE WAY IN IS DRAWN, NOT REVEALED. Nothing has been hovered, pressed or focused here.
	check("a mounted view carries a way into it", Boolean(viewRow?.querySelector(".wg-set-enter")), true);
	check("and it is a real control, not a decoration", viewRow?.querySelector(".wg-set-enter")?.tagName, "BUTTON");
	check("the sibling view carries one too", Boolean(rowSaying("Archived columns")?.querySelector(".wg-set-enter")), true);

	await press(viewRow.querySelector(".wg-set-enter"));
	check("pressing it names the child, not the parent", here(), "Kanban board");
	check("and the parent becomes the crumb behind it", trail(), ["View group"]);
	check("the child's own setting is drawn", Boolean(rowSaying("Group tasks by")), true);
	check("and the parent's is gone from the panel", Boolean(rowSaying("Which views")), false);
	check("the child's own source is drawn too", Boolean(rowSaying("Tasks")), true);
	// A CHILD HAS NO PLACE ON THE BOARD, so there is no width, height or fold to show
	check("the Design tab is not offered one level down", all(".wg-set-panel .wg-kit-seg button").map((button) => button.textContent.trim()), ["Settings", "Data"]);
	check("nor is the size the tile has on the board", Boolean(all(".wg-set-head .wg-kit-pill").length), false);

	const cardRow = rowSaying("Card");
	check("a slot the parent feeds says what it is fed", cardRow?.textContent.includes("Fed task"), true);
	check("and offers no way in, because there is nothing inside it", Boolean(cardRow?.querySelector(".wg-set-enter")), false);
	const panelRow = rowSaying("Panel");
	check("a slot it does not feed offers one", Boolean(panelRow?.querySelector(".wg-set-enter")), true);

	await typeInto(rowSaying("Group tasks by"), "assignee");
	check("the child's panel draws the new value", rowSaying("Group tasks by")?.textContent.includes("assignee"), true);

	await press(panelRow.querySelector(".wg-set-enter"));
	check("a child of the child opens too", here(), "Side panel");
	check("and the trail is two deep", trail(), ["View group", "Kanban board"]);
	check("drawing the grandchild's own setting", Boolean(rowSaying("Panel width")), true);
	await typeInto(rowSaying("Panel width"), "wide");

	await escape();
	check("Escape pops one level, it does not close", here(), "Kanban board");
	check("and the window is still up", Boolean(find(".wg-set-window")), true);

	await press(all(".wg-set-crumbs .wg-set-crumb")[0]);
	check("pressing the first crumb returns to the parent", here(), "View group");
	check("and the parent's own setting is back", Boolean(rowSaying("Which views")), true);
	check("with the Design tab back with it", all(".wg-set-panel .wg-kit-seg button").map((button) => button.textContent.trim()), ["Settings", "Data", "Design"]);

	const beforeDone = JSON.stringify(serializeBoard(board));
	check("and nothing has reached the board yet", board.tiles[0].mounted[KANBAN_VIEW]?.props?.groupBy, undefined);
	await press(all(".wg-set-head button").find((button) => button.textContent.trim() === "Done"));
	check("Done writes the child's edit into the child's record", board.tiles[0].mounted[KANBAN_VIEW].props.groupBy.value, "assignee");
	check("and the grandchild's into the grandchild's", board.tiles[0].mounted[KANBAN_VIEW].slots.panel.props.width.value, "wide");
	check("the record names the widget it holds", board.tiles[0].mounted[KANBAN_VIEW].slots.panel.widget, PANEL_ID);
	check("and the row itself names the widget its name stands for", board.tiles[0].mounted[KANBAN_VIEW].widget, KANBAN_ID);
	// NOTHING ELSE MOVES. The sibling view was seeded before any of this and must still be there.
	check("the sibling view's settings are untouched", board.tiles[0].mounted[ARCHIVE_ID].settings.since, "2020");
	check("and the parent's own settings with them", board.tiles[0].settings.views, `${KANBAN_ID}, ${ARCHIVE_ID}`);
	check("the draft really was a draft", beforeDone === JSON.stringify(serializeBoard(board)), false);
	await new Promise((done) => setTimeout(done, 240));
	await tick();

	// THE SECOND TILE OF THE SAME WIDGET. patchTile closes over the render's board; if that closure
	// were stale, writing here would put the first tile back the way it was before its own edit.
	await press(settingsButtons()[1]);
	await press(rowSaying("Kanban board").querySelector(".wg-set-enter"));
	await typeInto(rowSaying("Group tasks by"), "priority");
	await press(all(".wg-set-head button").find((button) => button.textContent.trim() === "Done"));
	check("the second tile keeps its own edit", board.tiles[1].mounted[KANBAN_VIEW].props.groupBy.value, "priority");
	check("and the first tile's survives it", board.tiles[0].mounted[KANBAN_VIEW].props.groupBy.value, "assignee");
	await new Promise((done) => setTimeout(done, 240));
	await tick();

	// THE LADDER, ONE RUNG AT A TIME, ending at the root and only there
	await press(settingsButtons()[0]);
	await press(rowSaying("Kanban board").querySelector(".wg-set-enter"));
	await press(rowSaying("Panel").querySelector(".wg-set-enter"));
	check("three levels deep", trail().length, 2);
	await escape();
	check("one rung", trail(), ["View group"]);
	await escape();
	check("another", trail(), []);
	check("and the window is still open at the root", Boolean(find(".wg-set-window")), true);
	await escape();
	await new Promise((done) => setTimeout(done, 240));
	await tick();
	check("only at the root does Escape close it", Boolean(find(".wg-set-window")), false);

	// THE AFFORDANCE IS NOT BEHIND A HOVER. Gutenberg shipped that, called it a mistake, and was
	// still adding a back button to it five years later.
	const sheet = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
	const hoverGated = sheet
		.split("}")
		.map((block) => block.split("{")[0])
		.filter((selector) => selector.includes(".wg-set-enter") && /:hover|:focus/.test(selector));
	check("no rule keeps it until the pointer arrives", hoverGated, []);

	// THE BOARD OWNS THE NAME, so it can be typed over. The record is keyed by that name, which
	// makes a rename a MOVE — Appsmith shipped the same feature with the invariant only on the
	// add path, and its tabs could be renamed into duplicates of one another.
	await press(settingsButtons()[0]);
	check("the mount group is labelled by the manifest, not by its setting key", Boolean(all(".wg-set-panel .wg-kit-side-label").find((node) => node.textContent.trim() === "Views")), true);
	check("the row is drawn under its name", Boolean(rowSaying("Kanban board")), true);

	await typeInto(rowSaying("Kanban board"), "Planner");
	check("the renamed row is drawn under the new name", Boolean(rowSaying("Planner")), true);
	check("and the old name is gone from the panel", Boolean(rowSaying("Kanban board")), false);
	check("the sibling row is untouched by it", Boolean(rowSaying("Archived columns")), true);

	// RENAMING ONTO A NAME ALREADY TAKEN. Refusing would silently drop what was typed; merging
	// would silently drop a record. It is disambiguated instead, and the panel says so.
	await typeInto(rowSaying("Planner"), "Archived columns");
	check("a duplicate name is disambiguated, in the panel itself", Boolean(rowSaying("Archived columns 2")), true);
	check("and the row it collided with keeps its own name", all(".wg-set-panel .wg-kit-row").filter((row) => row.textContent.includes("Archived columns") && !row.textContent.includes("Archived columns 2")).length, 1);

	await press(all(".wg-set-head button").find((button) => button.textContent.trim() === "Done"));
	const holds = board.tiles[0].mounts.holds;
	check("Done writes the new shape, a row per name", holds, [{ name: "Archived columns 2", widget: KANBAN_ID }, { name: "Archived columns", widget: ARCHIVE_ID }]);
	check("and the setting's old key goes with it", "views" in board.tiles[0].settings, false);
	check("the renamed row's record came with the name", board.tiles[0].mounted["Archived columns 2"]?.props?.groupBy?.value, "assignee");
	check("and nothing is left behind under the old one", "Kanban board" in board.tiles[0].mounted, false);
	// THE SIBLING NEVER MOVED. It was seeded under the widget-id key and nothing edited it, so
	// the lazy migration must have left it exactly where it was.
	check("a sibling nobody edited stays on its old key", board.tiles[0].mounted[ARCHIVE_ID].settings.since, "2020");
	await new Promise((done) => setTimeout(done, 240));
	await tick();

	render(null, mount);
}

console.log("\n— a tile that was skipped by the memo still writes onto the board as it stands —");
{
	const PROBE_ID = "@test/probe";
	// THE TILE IS MEMOISED, so a tile nothing changed keeps the props of the render it last drew —
	// including the write. If that write carries its own copy of the board, everything written
	// between the two renders is gone the moment the skipped tile speaks.
	const configureBy = {};
	const Probe = (props) => {
		const tileId = String(props.note.id).split("/")[0];
		configureBy[tileId] = props.note.update;
		return h("div", { className: "leaf" }, tileId);
	};
	const manifest = {
		id: PROBE_ID,
		title: "Probe",
		props: { note: { kind: "value", type: "text", label: "Note", verbs: { get: "required", update: "optional" }, default: { value: "" } } },
	};
	// CONTEXT: one definition object, or every tile redraws and the memo is never exercised
	const definition = { manifest, component: Probe };
	const registry = { get: (id) => (id === PROBE_ID ? definition : null), list: () => [{ manifest }] };
	const host = { platform: "test", can: {}, slot: () => null, ui: { notify() {}, openNote() {} } };

	let board = normalizeBoard({
		tiles: [
			{ id: "a", widget: PROBE_ID },
			{ id: "b", widget: PROBE_ID },
		],
		layouts: { 20: [{ id: "a", x: 0, y: 0, w: 6, h: 4 }, { id: "b", x: 6, y: 0, w: 6, h: 4 }] },
	});
	const mount = document.getElementById("host");
	const draw = () =>
		render(
			h(WidgetSurface, {
				board,
				registry,
				host,
				editing: true,
				initialWidth: boardWidthPx,
				onChange: (next) => {
					board = next;
					draw();
				},
			}),
			mount,
		);
	draw();
	// CONTEXT: React commits on a scheduled task, so three frames is a race under load
	const settle = async () => {
		let seen = "";
		let still = 0;
		for (let frame = 0; frame < 60 && still < 4; frame += 1) {
			await new Promise((done) => globalThis.requestAnimationFrame(() => setTimeout(done, 0)));
			const now = `${document.body.innerHTML.length}`;
			still = now === seen ? still + 1 : 0;
			seen = now;
		}
	};
	await settle();

	const held = configureBy.a;
	check("both tiles handed their widget a way to write", Boolean(configureBy.a) && Boolean(configureBy.b), true);

	configureBy.b("from b");
	await settle();
	check("the second tile's write landed", board.tiles[1].props.note.value, "from b");
	check("and the first tile was skipped, or this proves nothing", configureBy.a === held, true);

	configureBy.a("from a");
	await settle();
	check("the skipped tile's own write lands", board.tiles[0].props.note.value, "from a");
	check("and it does not put the other tile back", board.tiles[1].props.note.value, "from b");

	render(null, mount);
}

console.log("\n— a folder's readers are counted by the widget in the record, not by its key —");
{
	// THE KEY IS NO LONGER A WIDGET ID, so counting readers by parsing it can only ever answer
	// zero for everything mounted. Nothing covered this line before, which is why it stayed.
	const FOLDER = "Notes/Tasks";
	const READER_ID = "@test/reader";
	const GROUP_ID = "@test/group";
	const shelf = {
		[READER_ID]: { id: READER_ID, title: "Reader", props: { rows: { kind: "collection", label: "Rows", verbs: { list: "required" }, default: { path: FOLDER } } } },
		[GROUP_ID]: { id: GROUP_ID, title: "Group", mounts: { holds: {} } },
	};
	const Leaf = () => h("div", { className: "leaf" }, "leaf");
	const registry = { get: (id) => (shelf[id] ? { manifest: shelf[id], component: Leaf } : null), list: () => Object.values(shelf).map((manifest) => ({ manifest })) };
	const slot = { canCreate: true, canUpdate: true, canRemove: true, canSubscribe: false, list: async () => ({ rows: [], total: 0 }), describe: async () => [] };
	const host = { platform: "test", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };

	let board = normalizeBoard({
		tiles: [
			{ id: "alone", widget: READER_ID, props: { rows: { path: FOLDER } } },
			{ id: "group", widget: GROUP_ID, settings: { holds: [{ name: "Mine", widget: READER_ID }] }, mounted: { Mine: { widget: READER_ID, props: { rows: { path: FOLDER } } } } },
		],
		layouts: { 20: [{ id: "alone", x: 0, y: 0, w: 9, h: 6 }, { id: "group", x: 9, y: 0, w: 9, h: 6 }] },
	});
	const mount = document.getElementById("host");
	const draw = () => render(h(WidgetSurface, { board, registry, host, editing: true, initialWidth: boardWidthPx, onChange: (next) => { board = next; draw(); } }), mount);
	draw();
	const tick = async () => {
		for (let frame = 0; frame < 3; frame += 1) await new Promise((done) => globalThis.requestAnimationFrame(() => setTimeout(done, 0)));
	};
	const press = async (node) => {
		node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
		await tick();
	};

	await press([...document.querySelectorAll('.wg-tile-actions button[aria-label="Settings"]')][0]);
	await press(document.querySelector(".wg-set-panel .wg-set-row"));
	const notes = [...document.querySelectorAll(OPEN_POP + " .wg-set-pop-note")].map((node) => node.textContent.trim());
	check("a widget mounted under a NAME still counts as a reader of its folder", notes.includes("This folder is read by 2 widgets on this board."), true);
	// CONTEXT: VACUOUS unless the count can be wrong — one reader must draw no hint at all
	board = normalizeBoard({ tiles: [{ id: "alone", widget: READER_ID, props: { rows: { path: FOLDER } } }], layouts: { 20: [{ id: "alone", x: 0, y: 0, w: 9, h: 6 }] } });
	render(null, mount);
	draw();
	await press([...document.querySelectorAll('.wg-tile-actions button[aria-label="Settings"]')][0]);
	await press(document.querySelector(".wg-set-panel .wg-set-row"));
	check(
		"and the only reader on a board is told nothing",
		[
			document.querySelector(OPEN_POP + " .wg-set-pop-hint")?.textContent.trim() ?? null,
			[...document.querySelectorAll(OPEN_POP + " .wg-set-pop-note")].map((node) => node.textContent.trim()),
		],
		["Every note in the folder arrives as one item.", []],
	);

	render(null, mount);
}

console.log("\n— a prop renamed in the manifest still finds the folder the tile chose —");
{
	const CHOSEN = "Notes/Days";
	const DECLARED = "Notes/Fallback";
	const RENAMED_ID = "@test/renamed";
	const shelf = {
		[RENAMED_ID]: {
			id: RENAMED_ID,
			title: "Renamed",
			props: { days: { kind: "collection", label: "Days", was: "rows", verbs: { list: "required" }, default: { path: DECLARED } } },
		},
	};
	const Leaf = () => h("div", { className: "leaf" }, "leaf");
	const registry = { get: (id) => (shelf[id] ? { manifest: shelf[id], component: Leaf } : null), list: () => Object.values(shelf).map((manifest) => ({ manifest })) };
	const slot = { canCreate: true, canUpdate: true, canRemove: true, canSubscribe: false, list: async () => ({ rows: [], total: 0 }), describe: async () => [] };
	const asked = [];
	const host = { platform: "test", can: {}, slot: (binding) => { asked.push(binding.path); return slot; }, ui: { notify() {}, openNote() {} } };

	let board = normalizeBoard({
		tiles: [{ id: "alone", widget: RENAMED_ID, props: { rows: { path: CHOSEN } } }],
		layouts: { 20: [{ id: "alone", x: 0, y: 0, w: 9, h: 6 }] },
	});
	const mount = document.getElementById("host");
	const draw = () => render(h(WidgetSurface, { board, registry, host, editing: true, initialWidth: boardWidthPx, onChange: (next) => { board = next; draw(); } }), mount);
	render(null, mount);
	draw();
	check("the gateway reads the folder stored under the old key", [asked.includes(CHOSEN), asked.includes(DECLARED)], [true, false]);

	const tick = async () => {
		for (let frame = 0; frame < 3; frame += 1) await new Promise((done) => globalThis.requestAnimationFrame(() => setTimeout(done, 0)));
	};
	const press = async (node) => {
		node?.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
		await tick();
	};
	await press([...document.querySelectorAll('.wg-tile-actions button[aria-label="Settings"]')][0]);
	await press(document.querySelector(".wg-set-panel .wg-set-row"));
	check("the window offers the folder that was chosen, not the declared one", document.querySelector(".wg-set-panel .wg-set-row").textContent.includes(CHOSEN), true);
	await press([...document.querySelectorAll(OPEN_POP + " button")].find((node) => node.textContent === "Apply"));
	await press([...document.querySelectorAll(".wg-set-head button")].find((node) => node.textContent === "Done"));
	check("and the first write moves the record onto the new key", Object.keys(board.tiles[0].props ?? {}), ["days"]);
	check("without losing the folder on the way", board.tiles[0].props.days.path, CHOSEN);

	render(null, mount);
}

console.log(failed ? `\n${failed} things the settings window got wrong` : "\nthe settings window lands, clamps and writes");
process.exit(failed ? 1 : 0);

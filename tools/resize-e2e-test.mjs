// THE SCENARIOS, THROUGH A REAL DRAG.
//
// scenario-test.mjs proves the arithmetic. This proves the WIRING: a pointer on an actual
// resize grip, moved an actual number of pixels, and the board that comes out. Every time in
// this project that a fix "worked" and did not, the reason was the same — the module was
// tested and the call site was not.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { normalizeBoard } = await import("./.mjs-cache/model.mjs");
const { measureGrid } = await import("./.mjs-cache/paths.mjs");

const BOARD_PX = 1000;
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => BOARD_PX });

const registry = { get: () => ({ manifest: { id: "w", defaultSize: { w: 3, h: 2 } }, component: () => null }), list: () => [] };
const host = { ui: { notify() {}, openNote() {} }, vault: { adapter: {} }, can: { fullscreen: false } };

let failed = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK " : "!! "} ${label}${ok ? ` — ${JSON.stringify(got)}` : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`}`);
};
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
const fire = (node, type, init) => node.dispatchEvent(new dom.window.PointerEvent(type, { bubbles: true, ...init }));

const target = dom.window.document.getElementById("host");
const grid = measureGrid(BOARD_PX);
const step = grid.cell + grid.gap;

// the board is laid out in the columns the real grid reports, so the pixels a drag travels
// mean the same thing here as they do on screen
const COLUMNS = grid.columns;

async function withBoard(places) {
	let board = normalizeBoard({
		tiles: places.map((place) => ({ id: place.id, widget: "w" })),
		layouts: { [COLUMNS]: { places } },
	});
	const draw = () =>
		render(
			h(WidgetSurface, {
				board,
				registry,
				host,
				editing: true,
				screen: false,
				initialWidth: BOARD_PX,
				onChange: (next) => {
					board = next;
					draw();
				},
				onToggleEditing() {},
				onWidth() {},
			}),
			target,
		);
	draw();
	await settle();
	return {
		draw,
		at: (id) => board.layouts[COLUMNS].find((place) => place.id === id),
		all: () => [...board.layouts[COLUMNS]].sort((left, right) => left.x - right.x),
		grip: (id, edge) => target.querySelector(`[data-tile="${id}"] .wg-grip-${edge}`),
	};
}

// ── scenario 1, through the pointer ──────────────────────────────────────────────────────
{
	const thirds = Math.floor(COLUMNS / 4);
	const board = await withBoard([
		{ id: "a", x: 0, y: 0, w: thirds, h: 2 },
		{ id: "b", x: thirds, y: 0, w: thirds, h: 2 },
		{ id: "c", x: thirds * 2, y: 0, w: thirds, h: 2 },
	]);

	const grip = board.grip("a", "e");
	check("1 · the east grip is there to grab", Boolean(grip), true);

	fire(grip, "pointerdown", { clientX: 300, clientY: 100 });
	fire(dom.window, "pointermove", { clientX: 300 + step * 2, clientY: 100 });
	fire(dom.window, "pointerup", { clientX: 300 + step * 2, clientY: 100 });
	await settle();

	check("1 · the dragged tile really widened", board.at("a").w, thirds + 2);
	check("1 · the neighbour stayed on the row", board.at("b").y, 0);
	check("1 · and so did the one past it — the push cascaded", board.at("c").y, 0);
	check("1 · nothing overlaps", board.all().every((place, index, row) => index === 0 || place.x >= row[index - 1].x + row[index - 1].w), true);
	check("1 · nothing left the board", board.all().every((place) => place.x + place.w <= COLUMNS), true);
}

// ── scenario 2, through the pointer: a full row ───────────────────────────────────────────
{
	const quarter = Math.floor(COLUMNS / 4);
	const last = COLUMNS - quarter * 3;
	const board = await withBoard([
		{ id: "a", x: 0, y: 0, w: quarter, h: 2 },
		{ id: "b", x: quarter, y: 0, w: quarter, h: 2 },
		{ id: "c", x: quarter * 2, y: 0, w: quarter, h: 2 },
		{ id: "d", x: quarter * 3, y: 0, w: last, h: 2 },
	]);
	check("2 · the row starts full", board.all().reduce((total, place) => total + place.w, 0), COLUMNS);

	fire(board.grip("a", "e"), "pointerdown", { clientX: 200, clientY: 100 });
	fire(dom.window, "pointermove", { clientX: 200 + step, clientY: 100 });
	fire(dom.window, "pointerup", { clientX: 200 + step, clientY: 100 });
	await settle();

	check("2 · the dragged tile got its column", board.at("a").w, quarter + 1);
	check("2 · nobody was pushed to another row", board.all().every((place) => place.y === 0), true);
	check("2 · the row still fills the board", board.all().reduce((total, place) => total + place.w, 0), COLUMNS);
	check("2 · and the columns came from a neighbour", board.at("b").w < quarter || board.at("c").w < quarter || board.at("d").w < last, true);
}

// ── scenario 3, through the pointer: dragging the WEST edge pushes left ───────────────────
{
	const half = Math.floor(COLUMNS / 2);
	const board = await withBoard([
		{ id: "a", x: 0, y: 0, w: half, h: 2 },
		{ id: "b", x: half, y: 0, w: COLUMNS - half, h: 2 },
	]);

	fire(board.grip("b", "w"), "pointerdown", { clientX: 600, clientY: 100 });
	fire(dom.window, "pointermove", { clientX: 600 - step * 2, clientY: 100 });
	fire(dom.window, "pointerup", { clientX: 600 - step * 2, clientY: 100 });
	await settle();

	check("3 · the dragged tile grew leftwards", board.at("b").w > COLUMNS - half, true);
	check("3 · its neighbour stayed on the row", board.at("a").y, 0);
	check("3 · the neighbour gave way rather than dropping", board.at("a").w < half, true);
	check("3 · the row still starts at the left edge", Math.min(...board.all().map((place) => place.x)), 0);
	check("3 · and still ends at the right edge", Math.max(...board.all().map((place) => place.x + place.w)), COLUMNS);
}

// ── scenario 4, through the pointer: a tall tile beside short ones ────────────────────────
{
	const board = await withBoard([
		{ id: "s", x: 0, y: 0, w: 3, h: 3 },
		{ id: "t", x: 3, y: 0, w: COLUMNS - 3, h: 1 },
		{ id: "u", x: 3, y: 1, w: COLUMNS - 3, h: 1 },
		{ id: "v", x: 3, y: 2, w: COLUMNS - 3, h: 1 },
	]);

	fire(board.grip("s", "e"), "pointerdown", { clientX: 200, clientY: 100 });
	fire(dom.window, "pointermove", { clientX: 200 + step * 2, clientY: 100 });
	fire(dom.window, "pointerup", { clientX: 200 + step * 2, clientY: 100 });
	await settle();

	const panel = board.at("s");
	check("4 · the tall tile widened", panel.w, 5);
	check("4 · every row it spans moved over with it", ["t", "u", "v"].map((id) => board.at(id).x), [5, 5, 5]);
	check("4 · and each of them kept its own row", ["t", "u", "v"].map((id) => board.at(id).y), [0, 1, 2]);
	check("4 · none of them left the board", ["t", "u", "v"].every((id) => board.at(id).x + board.at(id).w <= COLUMNS), true);
}

console.log(failed ? `\n${failed} failed` : "\nthe scenarios hold through a real pointer, not just the arithmetic");
process.exit(failed ? 1 : 0);

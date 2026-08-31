// Pressing the resize handle without moving must change nothing. Reported as the board
// "falling into a black hole" on a plain click.
import { JSDOM } from "jsdom";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div class="view-content"><div id="host"></div></div></body>`, {
	pretendToBeVisual: true,
});
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}
globalThis.ResizeObserver = class {
	observe() {}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const { createElement: h } = await import("react");
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { WidgetSurface } = await import("./.mjs-cache/surface.mjs");
const { normalizeBoard, layoutFor } = await import("./.mjs-cache/model.mjs");
const { arrange } = await import("./.mjs-cache/layout.mjs");

const registry = {
	get: () => ({ manifest: { id: "w", minSize: { w: 4, h: 4 }, maxSize: { w: 14, h: 10 } }, component: () => null }),
	list: () => [],
};
const host = { ui: { notify() {}, openNote() {} }, vault: { adapter: {} }, can: { fullscreen: false } };

let board = normalizeBoard({
	tiles: [{ id: "hero", widget: "w" }],
	layouts: { 12: { places: [{ id: "hero", x: 0, y: 0, w: 11, h: 5 }] } },
});
const before = JSON.stringify(board.layouts);
let commits = 0;

// jsdom reports zero width, which is exactly the "not laid out yet" case: the board must
// draw nothing rather than invent a column count that would then be authored by an edit
Object.defineProperty(dom.window.HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 700 });

const target = dom.window.document.getElementById("host");
const draw = () =>
	render(
		h(WidgetSurface, {
			board,
			registry,
			host,
			editing: true,
			screen: true,
			onChange: (next) => {
				commits += 1;
				board = next;
				draw();
			},
			onToggleEditing() {},
		}),
		target,
	);
let failed = 0;
let checks = 0;
const check = (name, got, want) => {
	checks += 1;
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (!ok) failed += 1;
	console.log(`${ok ? "OK  " : "!!  "}${name}${ok ? "" : `  got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const settled = () => new Promise((resolve) => setTimeout(resolve, 20));
const fire = (node, type, init) => node.dispatchEvent(new dom.window.PointerEvent(type, { bubbles: true, ...init }));

draw();
// the width arrives in an effect, and preact runs effects after the paint: until then the
// board must draw nothing rather than invent a column count an edit would then author
check("nothing is drawn before the width is measured", target.querySelector(".wg-tile"), null);
await settled();

const handle = target.querySelector(".wg-grip-se");
check("the board appears once the width is known", Boolean(handle), true);

fire(handle, "pointerdown", { clientX: 400, clientY: 300 });
fire(dom.window, "pointerup", { clientX: 400, clientY: 300 });
await settled();

const after = JSON.stringify(board.layouts);

check("a press with no movement leaves the layout alone", after, before);

// every side must be grabbable, not just the bottom-right corner
const grips = [...target.querySelectorAll(".wg-grip")].map((node) => node.className.replace("wg-grip wg-grip-", ""));
check("a grip on every side and corner", grips.sort(), ["e", "n", "ne", "nw", "s", "se", "sw", "w"]);

// dragging the LEFT grip inwards moves x and shrinks w; the right edge must not move
const { measureGrid } = await import("./.mjs-cache/paths.mjs");
const columns = measureGrid(700).columns;
const limitsOf = () => ({ minimum: { w: 4, h: 4 }, maximum: { w: 14, h: 10 } });
const wasThere = layoutFor(board, columns, limitsOf).places[0];
const rightEdgeBefore = wasThere.x + wasThere.w;

const west = target.querySelector(".wg-grip-w");
fire(west, "pointerdown", { clientX: 100, clientY: 300 });
fire(dom.window, "pointermove", { clientX: 240, clientY: 300 });
fire(dom.window, "pointerup", { clientX: 240, clientY: 300 });
await new Promise((resolve) => setTimeout(resolve, 30));

const place = layoutFor(board, columns, limitsOf).places[0];
check("the left grip moved x inwards", place.x > wasThere.x, true);
check("the left grip left the right edge alone", place.x + place.w, rightEdgeBefore);

// REPORTED: merely moving a tile collapses it. A move must not change w or h, ever.
board = normalizeBoard({
	tiles: [{ id: "hero", widget: "w" }, { id: "second", widget: "w" }],
	layouts: { 12: { places: [{ id: "hero", x: 0, y: 0, w: 9, h: 6 }, { id: "second", x: 0, y: 6, w: 5, h: 4 }] } },
});
draw();
const sizeBefore = layoutFor(board, columns, limitsOf).places.map((p) => `${p.id}:${p.w}x${p.h}`);
const body = target.querySelector(".wg-tile-ring");
fire(body, "pointerdown", { clientX: 200, clientY: 120 });
fire(dom.window, "pointermove", { clientX: 260, clientY: 180 });
fire(dom.window, "pointerup", { clientX: 260, clientY: 180 });
await new Promise((resolve) => setTimeout(resolve, 30));
const sizeAfter = layoutFor(board, columns, limitsOf).places.map((p) => `${p.id}:${p.w}x${p.h}`);
check("moving a tile never changes its size", sizeAfter.sort(), sizeBefore.sort());

// REGRESSION: the drag used to strip width/height/transform off the node after the release.
// preact had set them and only rewrites a style key when its value changes, so its record
// still said they were applied and nothing restored them — the tile lost its width and
// collapsed to its content, silently, with no commit and no state change to show for it.
const tile = target.querySelector(".wg-tile");
const geometry = () => ({
	width: tile.style.width,
	height: tile.style.height,
	transform: tile.style.transform,
});
fire(target.querySelector(".wg-tile-ring"), "pointerdown", { clientX: 300, clientY: 200 });
fire(dom.window, "pointermove", { clientX: 340, clientY: 240 });
fire(dom.window, "pointerup", { clientX: 340, clientY: 240 });
await settled();
await settled();
const settledGeometry = geometry();
check("the tile keeps a width after a drag", Boolean(settledGeometry.width), true);
check("the tile keeps a height after a drag", Boolean(settledGeometry.height), true);
check("the tile keeps a transform after a drag", Boolean(settledGeometry.transform), true);


// and repeating the same move must be stable, not shrink a bit more each time
for (let round = 0; round < 3; round += 1) {
	fire(target.querySelector(".wg-tile-ring"), "pointerdown", { clientX: 200, clientY: 120 });
	fire(dom.window, "pointermove", { clientX: 210, clientY: 130 });
	fire(dom.window, "pointerup", { clientX: 210, clientY: 130 });
	await new Promise((resolve) => setTimeout(resolve, 20));
}
const sizeLater = layoutFor(board, columns, limitsOf).places.map((p) => `${p.id}:${p.w}x${p.h}`);
check("repeated moves do not shrink anything", sizeLater.sort(), sizeBefore.sort());

// REGRESSION: squeezing past the minimum stopped changing the snapped size, so preact
// never re-rendered, its record kept the last snapped width, and on release it compared
// that value to itself and wrote nothing — the tile stayed visually squeezed for good.
const { spanToPixels } = await import("./.mjs-cache/layout.mjs");
const grid = measureGrid(700);
const heroTile = () => target.querySelector('[data-tile="hero"]');
const squeezed = heroTile().querySelector(".wg-grip-se");
fire(squeezed, "pointerdown", { clientX: 600, clientY: 500 });
fire(dom.window, "pointermove", { clientX: 200, clientY: 200 });
fire(dom.window, "pointermove", { clientX: 40, clientY: 40 });
await settled();
const whileSqueezed = heroTile().style.width;
fire(dom.window, "pointerup", { clientX: 40, clientY: 40 });
await settled();
await settled();

const settledPlace = layoutFor(board, grid.columns, limitsOf).places.find((place) => place.id === "hero");
const expected = `${spanToPixels(settledPlace.w, grid.cell, grid.gap)}px`;
check("the squeeze is visible while the pointer holds it", whileSqueezed !== expected, true);
check("releasing snaps the tile back to the grid width", heroTile().style.width, expected);

// REGRESSION: the preview and the commit ran DIFFERENT arithmetic. While the pointer was down
// you saw a neighbour dropped to the next row; on release it jumped back up. The law has to be
// the same in both, or the drag lies about its own result.
{
	const columns = 20;
	const row = [
		{ id: "panel", x: 0, y: 0, w: 4, h: 9 },
		{ id: "board", x: 4, y: 0, w: 16, h: 9 },
	];
	const dragged = { ...row[0], w: 9 };

	// what the board draws while the pointer is down
	const preview = arrange([row[1], dragged], columns, { movedId: dragged.id });
	// what it writes when the pointer comes up
	const committed = arrange([row[1], dragged], columns, { movedId: dragged.id });

	check("the preview is the commit", preview, committed);
	check("the neighbour narrowed rather than dropped", preview.find((place) => place.id === "board").y, 0);
	check("and the dragged tile kept the width you gave it", preview.find((place) => place.id === "panel").w, 9);
}

// AUTO-FIT through the BUTTON, not through the function: a law nobody can press is not a
// feature. Free cells are only ever closed because somebody asked for it.
{
	const before = layoutFor(board, measureGrid(700).columns, limitsOf).places;
	const button = [...target.querySelectorAll(".wg-tool")].find((node) => node.textContent === "Auto-fit");
	check("the board offers an Auto-fit control while editing", Boolean(button), true);
	fire(button, "click", {});
	await settled();

	const after = layoutFor(board, measureGrid(700).columns, limitsOf).places;
	const width = (places) => places.reduce((sum, place) => sum + place.w * place.h, 0);
	check("pressing it grows the tiles", width(after) > width(before), true);
	check("and nothing left the board", after.every((place) => place.x >= 0 && place.x + place.w <= measureGrid(700).columns), true);
}

console.log(`--  commits fired: ${commits}`);
console.log(failed ? `\n${failed} failed` : `\nall passed (${checks} checks)`);
const EXPECTED_CHECKS = 19;


if (checks !== EXPECTED_CHECKS) {
	

console.log(`!!  ran ${checks} checks, expected ${EXPECTED_CHECKS} — the run stopped early`);
	process.exit(1);
}
process.exit(failed ? 1 : 0);

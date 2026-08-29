import { h, render } from "preact";
import { WidgetSurface } from "../src/surface.js";
import { normalizeBoard } from "../src/model.js";

const WIDGET = "@probe/board";

const manifest = {
	id: WIDGET,
	title: "Probe board",
	collapseBelowPx: 240,
	settings: [{ key: "groupBy", type: "text", label: "Group tasks by", default: "status" }],
	slots: { card: { of: "widget", default: "@probe/card" } },
	sources: { tasks: { label: "Tasks", default: { path: "Probe/Tasks" } } },
};

function Probe() {
	return h("div", { class: "probe" }, "probe");
}

const registry = {
	get: (id) => (id === WIDGET ? { manifest, component: Probe } : { manifest: { id, title: id }, component: Probe }),
	list: () => [{ manifest }, { manifest: { id: "@probe/card", title: "Probe card" } }],
};

const slot = {
	canCreate: true,
	canUpdate: true,
	canRemove: true,
	canSubscribe: false,
	list: () => Promise.resolve({ rows: [], total: 0 }),
	describe: () => Promise.resolve([]),
};

const host = { platform: "probe", can: {}, slot: () => slot, ui: { notify() {}, openNote() {} } };

const mount = document.querySelector(".wg-host");
// CONTEXT: the states a screenshot has to reach, since the harness cannot drag
const staged = location.hash.slice(1);
if (staged === "phone") mount.style.width = "390px";
// CONTEXT: a board taller than the screen is where the window used to run off the bottom
const SPAN = { w: 12, h: staged === "tall" ? 20 : 8 };

let board = normalizeBoard({ tiles: [{ id: "t1", widget: WIDGET }], layouts: { 20: [{ id: "t1", x: 0, y: 0, w: SPAN.w, h: SPAN.h }] } });

function draw() {
	render(
		h(WidgetSurface, {
			board,
			registry,
			host,
			editing: true,
			initialWidth: mount.clientWidth,
			onChange: (next) => {
				board = next;
				draw();
			},
		}),
		mount,
	);
}

function boxOf(node) {
	if (!node) return null;
	const rect = node.getBoundingClientRect();
	return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
}

function overlaps(one, other) {
	if (!one || !other) return false;
	return one.left < other.right && one.right > other.left && one.top < other.bottom && one.bottom > other.top;
}

function nameOf(node) {
	return `${node.tagName.toLowerCase()}.${String(node.className.baseVal ?? node.className).trim().split(/\s+/).join(".")}`;
}

// how far a point sits from the nearest lattice line, which is zero when it sits on one
function offLattice(distance, pitch) {
	const inside = ((distance % pitch) + pitch) % pitch;
	return Math.min(inside, pitch - inside);
}

function scaleOfCanvas(body) {
	const matrix = getComputedStyle(body).transform;
	if (!matrix.startsWith("matrix(")) return 1;
	return Number(matrix.slice(7).split(",")[0]);
}

// THE GRID IS THE MEASURE OF THE WIDGET, so everything here is read off the screen: the cell
// as it is painted, the pitch between two neighbours, and where the widget's corner lands.
function gridOf(window_, widgetBox) {
	const cells = [...window_.querySelectorAll(".wg-set-cells i")];
	if (cells.length < 2) return { failure: "the window drew no grid" };
	const first = boxOf(cells[0]);
	const second = boxOf(cells[1]);
	const pitchPx = second.left - first.left;
	if (!(pitchPx > 0)) return { failure: "the grid is one cell wide" };
	const gapPx = pitchPx - first.width;
	return {
		count: cells.length,
		cellPx: first.width,
		pitchPx,
		firstLeft: first.left,
		firstTop: first.top,
		offLatticeX: offLattice(widgetBox.left - first.left, pitchPx),
		offLatticeY: offLattice(widgetBox.top - first.top, pitchPx),
		cellsAcross: (widgetBox.width + gapPx) / pitchPx,
		cellsDown: (widgetBox.height + gapPx) / pitchPx,
	};
}

const LIGHT = {
	"--background-primary": "#ffffff",
	"--background-secondary": "#f6f6f6",
	"--background-modifier-border": "#e4e4e4",
	"--text-normal": "#222222",
	"--text-muted": "#707070",
	"--interactive-accent": "#6d4ee0",
};

const DARK = {
	"--background-primary": "#1e1e1e",
	"--background-secondary": "#161616",
	"--background-modifier-border": "#333333",
	"--text-normal": "#dadada",
	"--text-muted": "#b3b3b3",
	"--interactive-accent": "#8b6cef",
};

const LEVELS = ["--background-primary", "--wg-cell-fill", "--wg-kit-fill", "--wg-kit-raise"];

// WHERE THE THREE LEVELS LAND, in both themes, off elements the browser actually painted
function levelsUnder(theme) {
	const under = document.createElement("div");
	under.className = "wg-root";
	under.style.cssText = "position:absolute;left:-4000px;top:0;width:200px;";
	for (const [name, value] of Object.entries(theme)) under.style.setProperty(name, value);
	document.body.appendChild(under);
	const read = {};
	for (const token of LEVELS) {
		const probe = document.createElement("div");
		probe.style.cssText = `width:20px;height:20px;background:var(${token});`;
		under.appendChild(probe);
		read[token] = getComputedStyle(probe).backgroundColor;
	}
	under.remove();
	return read;
}

function read() {
	// the window is a dialog portaled onto <body>, so it is no longer inside the board's mount
	const window_ = document.querySelector(".wg-set-window");
	if (!window_) return { failure: "the settings window never opened" };

	const panel = window_.querySelector(".wg-set-panel");
	const head = window_.querySelector(".wg-set-head");
	const bar = window_.querySelector(".wg-set-bar");
	const body = window_.querySelector(".wg-set-body");

	const panelBox = boxOf(panel);
	const headBox = boxOf(head);
	const widgetBox = boxOf(body);
	const windowBox = boxOf(window_);
	const boardStyle = getComputedStyle(mount.querySelector(".wg-grid"));

	const blurred = [];
	const shadowed = [];
	for (const node of window_.querySelectorAll("*")) {
		const style = getComputedStyle(node);
		// CONTEXT: a closed popover is in the DOM at opacity 0 and paints nothing
		if (style.opacity === "0" || style.visibility === "hidden") continue;
		if (style.backdropFilter && style.backdropFilter !== "none") blurred.push(nameOf(node));
		if (style.boxShadow && style.boxShadow !== "none") shadowed.push({ name: nameOf(node), shadow: style.boxShadow, inside: Boolean(panel && panel.contains(node) && node !== panel) });
	}

	const underPanel = [...window_.querySelectorAll(".wg-set-cells i")].some((cell) => overlaps(boxOf(cell), panelBox));

	return {
		windowBox,
		headBox,
		panelBox,
		barBox: boxOf(bar),
		widgetBox,
		span: SPAN,
		cellPx: parseFloat(boardStyle.getPropertyValue("--wg-cell")),
		gapPx: parseFloat(boardStyle.getPropertyValue("--wg-gap")),
		scale: scaleOfCanvas(body),
		grid: gridOf(window_, widgetBox),
		innerHeight: window.innerHeight,
		canvasFill: getComputedStyle(window_).backgroundColor,
		widgetUnderPanel: overlaps(widgetBox, panelBox),
		widgetUnderHead: overlaps(widgetBox, headBox),
		canvasTransform: getComputedStyle(body).transform,
		panelBlur: getComputedStyle(panel).backdropFilter,
		panelOverflow: getComputedStyle(window_).overflow,
		listFill: getComputedStyle(window_.querySelector(".wg-set-list")).backgroundColor,
		panelFill: getComputedStyle(panel).backgroundColor,
		blurred,
		shadowed,
		gridRunsUnderThePanel: underPanel,
		hasLookShield: Boolean(window_.querySelector(".wg-set-look")),
		said: window_.querySelector(".wg-set-said")?.textContent ?? null,
		liveAtOpen: Boolean(body?.classList.contains("is-live")),
		corner: { x: parseFloat(body?.style.left), y: parseFloat(body?.style.top) },

		// IT IS A DIALOG, not a panel laid into the note: it has an edge, it holds the screen,
		// and nothing behind it moves while it is up
		frame: {
			borderWidthPx: parseFloat(getComputedStyle(window_).borderTopWidth),
			borderColour: getComputedStyle(window_).borderTopColor,
			insideBoard: Boolean(mount.contains(window_)),
			overlayCovers: (() => {
				const overlay = document.querySelector(".wg-dialog-overlay.wg-set-over");
				if (!overlay) return null;
				const box = boxOf(overlay);
				return box.width >= window.innerWidth && box.height >= window.innerHeight;
			})(),
			bodyOverflow: getComputedStyle(document.body).overflow,
			coverage: (boxOf(window_).width * boxOf(window_).height) / (window.innerWidth * window.innerHeight),
		},
	};
}

function report(payload) {
	document.getElementById("wg-measure").textContent = JSON.stringify(payload);
}

function barButton(said) {
	return [...document.querySelectorAll(".wg-set-bar button")].find((button) => button.textContent.trim() === said);
}

function panBy(dx, dy) {
	const node = document.querySelector(".wg-set-pan");
	if (!node) return;
	const rect = node.getBoundingClientRect();
	const from = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
	node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, ...from }));
	window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: from.clientX + dx, clientY: from.clientY + dy }));
	window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: from.clientX + dx, clientY: from.clientY + dy }));
}

function step(run) {
	return new Promise((done) => {
		run();
		setTimeout(done, 400);
	});
}

function tick(run) {
	return new Promise((done) => {
		run();
		setTimeout(done, 40);
	});
}

draw();
setTimeout(async () => {
	try {
		await step(() => mount.querySelector('.wg-tile-actions button[aria-label="Settings"]')?.click());
		await step(() => {});
		const arrival = read();
		const levels = { light: levelsUnder(LIGHT), dark: levelsUnder(DARK) };
		if (staged === "fold") await step(() => document.querySelector('.wg-set-bar button[aria-label="Fold the settings away"]')?.click());
		if (staged) return report({ arrival, panned: arrival, zoomed: arrival, floor: arrival, live: arrival, levels });
		await step(() => panBy(37, 23));
		const panned = read();
		await step(() => barButton("-")?.click());
		const zoomed = read();
		// CONTEXT: the grid is real elements, so the floor zoom is where their number peaks
		for (let press = 0; press < 12; press += 1) await tick(() => barButton("-")?.click());
		const floor = read();
		await step(() => barButton("1:1")?.click());
		const live = read();

		report({ arrival, panned, zoomed, floor, live, levels });
	} catch (failure) {
		report({ failure: String(failure && failure.stack) });
	}
}, 60);

window.addEventListener("error", (event) => report({ failure: String(event.message) }));

import "./packs-registered.ts";
import { createElement as h } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import { GRID, measureGrid } from "../packages/core/src/paths.js";
import type { BoardRegistry, SurfaceHost } from "../packages/core/src/surface/use-surface-shared.js";
import type { VaultSlot } from "../packages/core/src/gateway/obsidian.js";
import { PROBE_VIEW } from "./vault-fixture.ts";
import { elementAt, elementsAt, present, stackOf } from "./page-dom.ts";

const WIDGET = "@probe/board";

const manifest = {
	id: WIDGET,
	title: "Probe board",
	collapseBelowPx: 240,
	settings: [{ key: "groupBy", type: "text", label: "Group tasks by", default: "status" }],
	slots: { card: { of: "widget", default: "@probe/card" } },
	sources: { tasks: { label: "Tasks", default: { path: "Probe/Tasks" } } },
} as const;

function Probe(): ReactElement {
	return h("div", { className: "probe" }, "probe");
}

const registry: BoardRegistry = {
	get: (id) =>
		id === WIDGET ? { manifest, component: Probe } : { manifest: { id: id ?? "", title: id }, component: Probe },
	list: () => [{ manifest }, { manifest: { id: "@probe/card", title: "Probe card" } }],
	tileRefOf: (id) => id,
};

const slot: VaultSlot & { readonly describe: () => Promise<never[]> } = {
	canCreate: true,
	canUpdate: true,
	canRemove: true,
	canSubscribe: false,
	list: () => Promise.resolve({ rows: [], total: 0 }),
	get: () => Promise.resolve(null),
	describe: () => Promise.resolve([]),
};

const host: SurfaceHost = { ...PROBE_VIEW, slot: () => slot };

const mount = present(elementAt(".wg-host"), ".wg-host");
const stagedState = location.hash.slice(1);
if (stagedState === "phone") mount.style.width = "390px";
const ROWS_TALLER_THAN_THE_SCREEN = 20;
const SPAN = { w: 12, h: stagedState === "tall" ? ROWS_TALLER_THAN_THE_SCREEN : 8 };

const TILE_HEIGHT_PX = SPAN.h * (GRID.cellPx + GRID.gapPx) - GRID.gapPx;

let board: Board = normalizeBoard({
	tiles: [{ id: "t1", widget: WIDGET }],
	layout: { dir: "row", of: [{ dir: "column", keep: true, of: [{ id: "t1", height: TILE_HEIGHT_PX }] }] },
});

function draw(): void {
	render(
		h(WidgetSurface, {
			boardNode: mount,
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

interface Box {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly width: number;
	readonly height: number;
}

function rectBox(node: Element): Box {
	const rect = node.getBoundingClientRect();
	return {
		left: rect.left,
		top: rect.top,
		right: rect.right,
		bottom: rect.bottom,
		width: rect.width,
		height: rect.height,
	};
}

function boxOf(node: Element | null | undefined): Box | null {
	return node ? rectBox(node) : null;
}

function overlaps(one: Box | null, other: Box | null): boolean {
	if (!one || !other) return false;
	return one.left < other.right && one.right > other.left && one.top < other.bottom && one.bottom > other.top;
}

function nameOf(node: Element): string {
	return `${node.tagName.toLowerCase()}.${(node.getAttribute("class") ?? "").trim().split(/\s+/).join(".")}`;
}

function distanceOffLattice(distance: number, pitch: number): number {
	const inside = ((distance % pitch) + pitch) % pitch;
	return Math.min(inside, pitch - inside);
}

function scaleOfCanvas(body: Element): number {
	const matrix = getComputedStyle(body).transform;
	if (!matrix.startsWith("matrix(")) return 1;
	return Number(matrix.slice(7).split(",")[0]);
}

interface GridRead {
	readonly failure?: string;
	readonly count?: number;
	readonly cellPx?: number;
	readonly pitchPx?: number;
	readonly firstLeft?: number;
	readonly firstTop?: number;
	readonly offLatticeX?: number;
	readonly offLatticeY?: number;
	readonly cellsAcross?: number;
	readonly cellsDown?: number;
}

function gridOf(settingsWindow: Element, widgetBox: Box | null): GridRead {
	const cells = [...settingsWindow.querySelectorAll(".wg-set-cells i")];
	const [firstCell, secondCell] = cells;
	if (!firstCell || !secondCell) return { failure: "the window drew no grid" };
	const first = rectBox(firstCell);
	const second = rectBox(secondCell);
	const pitchPx = second.left - first.left;
	if (!(pitchPx > 0)) return { failure: "the grid is one cell wide" };
	const gapPx = pitchPx - first.width;
	const widget = present(widgetBox, "the widget canvas");
	return {
		count: cells.length,
		cellPx: first.width,
		pitchPx,
		firstLeft: first.left,
		firstTop: first.top,
		offLatticeX: distanceOffLattice(widget.left - first.left, pitchPx),
		offLatticeY: distanceOffLattice(widget.top - first.top, pitchPx),
		cellsAcross: (widget.width + gapPx) / pitchPx,
		cellsDown: (widget.height + gapPx) / pitchPx,
	};
}

type ThemeTokens = Readonly<Record<string, string>>;

const LIGHT: ThemeTokens = {
	"--background-primary": "#ffffff",
	"--background-secondary": "#f6f6f6",
	"--background-modifier-border": "#e4e4e4",
	"--text-normal": "#222222",
	"--text-muted": "#707070",
	"--interactive-accent": "#6d4ee0",
};

const DARK: ThemeTokens = {
	"--background-primary": "#1e1e1e",
	"--background-secondary": "#161616",
	"--background-modifier-border": "#333333",
	"--text-normal": "#dadada",
	"--text-muted": "#b3b3b3",
	"--interactive-accent": "#8b6cef",
};

const LEVELS = ["--background-primary", "--wg-cell-fill", "--wg-kit-fill", "--wg-kit-raise"];

function levelsUnder(theme: ThemeTokens): Record<string, string> {
	const under = document.createElement("div");
	under.className = "wg-root";
	under.style.cssText = "position:absolute;left:-4000px;top:0;width:200px;";
	for (const [name, value] of Object.entries(theme)) under.style.setProperty(name, value);
	document.body.appendChild(under);
	const read: Record<string, string> = {};
	for (const token of LEVELS) {
		const probe = document.createElement("div");
		probe.style.cssText = `width:20px;height:20px;background:var(${token});`;
		under.appendChild(probe);
		read[token] = getComputedStyle(probe).backgroundColor;
	}
	under.remove();
	return read;
}

const castShadowsOf = (shadow: string): string[] =>
	shadow
		.split(/,(?![^(]*\))/)
		.map((part) => part.trim())
		.filter((part) => !part.includes("inset"));

const paintsNothing = (style: CSSStyleDeclaration): boolean => style.opacity === "0" || style.visibility === "hidden";

interface Shadowed {
	readonly name: string;
	readonly shadow: string;
	readonly cast: string[];
	readonly isPanel: boolean;
	readonly inside: boolean;
}

function overlayCovers(): boolean | null {
	const overlay = document.querySelector(".wg-dialog-overlay.wg-set-over");
	if (!overlay) return null;
	const box = rectBox(overlay);
	return box.width >= window.innerWidth && box.height >= window.innerHeight;
}

function read(): Readonly<Record<string, unknown>> {
	const settingsWindow = document.querySelector(".wg-set-window");
	if (!settingsWindow) return { failure: "the settings window never opened" };

	const panel = settingsWindow.querySelector(".wg-set-panel");
	const head = settingsWindow.querySelector(".wg-set-head");
	const bar = settingsWindow.querySelector(".wg-set-bar");
	const body = elementAt(".wg-set-body", settingsWindow);

	const panelBox = boxOf(panel);
	const headBox = boxOf(head);
	const widgetBox = boxOf(body);
	const windowBox = rectBox(settingsWindow);
	const tileBox = boxOf(mount.querySelector(".wg-tree-cell"));
	const boardNode = present(mount.querySelector(".wg-board"), ".wg-board");
	const boardPad = getComputedStyle(boardNode);
	const boardMetrics = measureGrid(
		boardNode.clientWidth - parseFloat(boardPad.paddingLeft) - parseFloat(boardPad.paddingRight),
	);

	const blurred: string[] = [];
	const shadowed: Shadowed[] = [];
	for (const node of settingsWindow.querySelectorAll("*")) {
		const style = getComputedStyle(node);
		if (paintsNothing(style)) continue;
		if (style.backdropFilter && style.backdropFilter !== "none") blurred.push(nameOf(node));
		if (style.boxShadow && style.boxShadow !== "none") {
			shadowed.push({
				name: nameOf(node),
				shadow: style.boxShadow,
				cast: castShadowsOf(style.boxShadow),
				isPanel: node === panel,
				inside: Boolean(panel && panel.contains(node) && node !== panel),
			});
		}
	}

	const underPanel = [...settingsWindow.querySelectorAll(".wg-set-cells i")].some((cell) =>
		overlaps(rectBox(cell), panelBox),
	);
	const shownPanel = present(panel, ".wg-set-panel");
	const canvas = present(body, ".wg-set-body");

	return {
		windowBox,
		headBox,
		panelBox,
		barBox: boxOf(bar),
		widgetBox,
		span: SPAN,
		tileBox,
		cellPx: boardMetrics.cell,
		gapPx: boardMetrics.gap,
		scale: scaleOfCanvas(canvas),
		grid: gridOf(settingsWindow, widgetBox),
		innerHeight: window.innerHeight,
		canvasFill: getComputedStyle(settingsWindow).backgroundColor,
		widgetUnderPanel: overlaps(widgetBox, panelBox),
		widgetUnderHead: overlaps(widgetBox, headBox),
		canvasTransform: getComputedStyle(canvas).transform,
		panelBlur: getComputedStyle(shownPanel).backdropFilter,
		panelOverflow: getComputedStyle(settingsWindow).overflow,
		listFill: getComputedStyle(present(settingsWindow.querySelector(".wg-kit-side-list"), ".wg-kit-side-list"))
			.backgroundColor,
		panelFill: getComputedStyle(shownPanel).backgroundColor,
		panelIsSidebar: shownPanel.classList.contains("wg-kit-side"),
		panelRadius: getComputedStyle(shownPanel).borderTopLeftRadius,
		panelPad: getComputedStyle(shownPanel).paddingTop,
		blurred,
		shadowed,
		gridRunsUnderThePanel: underPanel,
		hasLookShield: Boolean(settingsWindow.querySelector(".wg-set-look")),
		said: settingsWindow.querySelector(".wg-set-said")?.textContent ?? null,
		liveAtOpen: Boolean(canvas.classList.contains("is-live")),
		corner: { x: parseFloat(canvas.style.left), y: parseFloat(canvas.style.top) },
		frame: {
			borderWidthPx: parseFloat(getComputedStyle(settingsWindow).borderTopWidth),
			borderColour: getComputedStyle(settingsWindow).borderTopColor,
			insideBoard: Boolean(mount.contains(settingsWindow)),
			overlayCovers: overlayCovers(),
			bodyOverflow: getComputedStyle(document.body).overflow,
			coverage: (windowBox.width * windowBox.height) / (window.innerWidth * window.innerHeight),
		},
	};
}

function report(payload: unknown): void {
	present(document.getElementById("wg-measure"), "#wg-measure").textContent = JSON.stringify(payload);
}

function barButton(said: string): HTMLElement | undefined {
	return elementsAt(".wg-set-bar button").find((button) => button.textContent?.trim() === said);
}

function panBy(dx: number, dy: number): void {
	const node = document.querySelector(".wg-set-pan");
	if (!node) return;
	const rect = node.getBoundingClientRect();
	const from = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
	node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, ...from }));
	window.dispatchEvent(
		new PointerEvent("pointermove", { bubbles: true, clientX: from.clientX + dx, clientY: from.clientY + dy }),
	);
	window.dispatchEvent(
		new PointerEvent("pointerup", { bubbles: true, clientX: from.clientX + dx, clientY: from.clientY + dy }),
	);
}

interface WheelAsk {
	readonly deltaX?: number;
	readonly deltaY?: number;
	readonly pinch?: boolean;
}

function wheelOrTrackpadPinchAt(target: { readonly x: number; readonly y: number }, options: WheelAsk): void {
	const node = document.querySelector(".wg-set-window");
	if (!node) return;
	const rect = node.getBoundingClientRect();
	node.dispatchEvent(
		new WheelEvent("wheel", {
			bubbles: true,
			cancelable: true,
			clientX: rect.left + target.x,
			clientY: rect.top + target.y,
			deltaX: options.deltaX ?? 0,
			deltaY: options.deltaY ?? 0,
			ctrlKey: Boolean(options.pinch),
		}),
	);
}

function step(run: () => void): Promise<void> {
	return new Promise((done) => {
		run();
		setTimeout(done, 400);
	});
}

function tick(run: () => void): Promise<void> {
	return new Promise((done) => {
		run();
		setTimeout(done, 40);
	});
}

const PRESSES_TO_THE_FLOOR_ZOOM = 12;

draw();
setTimeout(async () => {
	try {
		await step(() => elementAt('.wg-tile-actions button[aria-label="Settings"]', mount)?.click());
		await step(() => {});
		const arrival = read();
		const levels = { light: levelsUnder(LIGHT), dark: levelsUnder(DARK) };
		if (stagedState === "fold")
			await step(() => elementAt('.wg-set-bar button[aria-label="Fold the settings away"]')?.click());
		if (stagedState)
			return report({ arrival, panned: arrival, zoomed: arrival, floor: arrival, live: arrival, levels });
		await step(() => panBy(37, 23));
		const panned = read();
		await step(() => barButton("-")?.click());
		const zoomed = read();
		for (let press = 0; press < PRESSES_TO_THE_FLOOR_ZOOM; press += 1) await tick(() => barButton("-")?.click());
		const floor = read();
		await step(() => barButton("1:1")?.click());
		const live = read();

		await step(() => barButton("Fit")?.click());
		const beforeWheel = read();
		await step(() => wheelOrTrackpadPinchAt({ x: 400, y: 300 }, { deltaX: 40, deltaY: 60 }));
		const wheelPanned = read();
		await step(() => wheelOrTrackpadPinchAt({ x: 400, y: 300 }, { deltaY: 240, pinch: true }));
		const pinchedOut = read();
		await step(() => wheelOrTrackpadPinchAt({ x: 400, y: 300 }, { deltaY: -900, pinch: true }));
		const pinchedIn = read();
		const panelNode = present(document.querySelector(".wg-set-scroll"), ".wg-set-scroll");
		const panelRect = panelNode.getBoundingClientRect();
		const before = read();
		await step(() =>
			panelNode.dispatchEvent(
				new WheelEvent("wheel", {
					bubbles: true,
					cancelable: true,
					clientX: panelRect.left + 20,
					clientY: panelRect.top + 20,
					deltaY: 200,
				}),
			),
		);
		const overPanel = read();

		return report({
			arrival,
			panned,
			zoomed,
			floor,
			live,
			levels,
			wheel: { beforeWheel, wheelPanned, pinchedOut, pinchedIn, before, overPanel },
		});
	} catch (failure) {
		return report({ failure: stackOf(failure) });
	}
}, 60);

window.addEventListener("error", (event) => report({ failure: String(event.message) }));

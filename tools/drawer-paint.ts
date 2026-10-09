import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.ts";
import type { AskedPage, PagePoint } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";
import type { Theme } from "./harness.ts";

type PaintCheck = readonly [string, unknown, unknown];

interface DrawnPanel {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
	readonly shown: number;
	readonly corners: readonly string[];
	readonly headerTop: number;
	readonly padding: string;
	readonly background: string;
	readonly shadow: string;
	readonly state: string;
	readonly grip: PagePoint | null;
	readonly close: PagePoint | null;
	readonly body: PagePoint | null;
}

export const DRAWER_PAGE_SIZE: readonly [number, number] = [1000, 800];

const SETTLE_MS = 700;

const QUIET_MS = 150;

const HOST = `--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif; --font-text: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px; --font-semibold: 600;`;

const ASK = `(() => {
	const panel = document.querySelector('[role="dialog"]');
	if (!panel) return null;
	const centre = (node) => {
		if (!node) return null;
		const box = node.getBoundingClientRect();
		return [Math.round(box.left + box.width / 2), Math.round(box.top + box.height / 2)];
	};
	const layer = panel.parentElement.getBoundingClientRect();
	const box = panel.getBoundingClientRect();
	const drawn = getComputedStyle(panel);
	const round = (px) => Math.round(px);
	return {
		left: round(box.left - layer.left),
		right: round(layer.right - box.right),
		top: round(box.top - layer.top),
		bottom: round(layer.bottom - box.bottom),
		shown: round(layer.bottom - box.top),
		corners: [drawn.borderTopLeftRadius, drawn.borderTopRightRadius, drawn.borderBottomRightRadius, drawn.borderBottomLeftRadius],
		headerTop: round(panel.querySelector(".wg-kit-modal-header").getBoundingClientRect().top - box.top),
		padding: drawn.paddingLeft + " " + drawn.paddingRight,
		background: drawn.backgroundColor,
		shadow: drawn.boxShadow,
		state: panel.dataset.state,
		grip: centre(panel.querySelector(".wg-kit-drawer-handle")),
		close: centre(panel.querySelector(".wg-kit-modal-close")),
		body: centre(document.getElementById("drawer-body")),
	};
})()`;

export function drawerPage(script: string, theme: Theme): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>body { margin: 0; ${THEMES[theme]} ${HOST} color-scheme: ${theme}; background: var(--background-primary); }</style>
</head><body class="wg-root theme-${theme}"><div id="host"></div><script>${script}</script>
<script>window.ready = true;</script></body></html>`;
}

export async function drawerPageFile(theme: Theme): Promise<string> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-drawer-")), `drawer-${theme}.html`);
	writeFileSync(file, drawerPage(await bundleOf("tools/drawer-paint-page.tsx"), theme));
	return file;
}

export async function shownPanel(page: AskedPage, shown: string): Promise<DrawnPanel> {
	await page.ask(`window.show(${JSON.stringify(shown)})`);
	await waited(SETTLE_MS);
	return drawn(page);
}

export async function drawn(page: AskedPage): Promise<DrawnPanel> {
	const panel = await page.ask(ASK);
	if (!isDrawnPanel(panel)) throw new Error(`drawer paint: no panel drawn, got ${JSON.stringify(panel)}`);
	return panel;
}

export async function drawerPaintChecks(): Promise<readonly PaintCheck[]> {
	const page = await paged(await drawerPageFile("light"), "window.ready === true", { size: DRAWER_PAGE_SIZE });
	const checks = [...(await shapeChecks(page)), ...(await snapChecks(page)), ...(await reducedMotionChecks(page))];
	page.close();
	return checks;
}

async function shapeChecks(page: AskedPage): Promise<PaintCheck[]> {
	const sheet = await shownPanel(page, "sheet");
	const plain = await shownPanel(page, "plain");
	const top = await shownPanel(page, "drawer").then(() => pressedGrip(page));
	const lookOf = (panel: DrawnPanel): unknown => [panel.corners, panel.padding, panel.background, panel.shadow];
	return [
		[
			"A DRAWER FLOATS LIKE THE SHEET: the Sheet's inset from the left, right and bottom edges, every corner rounded, the Sheet's padding, plate and shadow",
			{
				left: plain.left,
				right: plain.right,
				bottom: plain.bottom,
				look: lookOf(plain),
				roundedCorners: plain.corners.every((corner) => parseFloat(corner) > 0),
			},
			{ left: sheet.right, right: sheet.right, bottom: sheet.bottom, look: lookOf(sheet), roundedCorners: true },
		],
		[
			"and so does a snapped one at its top snap",
			[top.left, top.right, top.bottom],
			[sheet.right, sheet.right, sheet.bottom],
		],
		["its title stands under the grip where the Sheet's stands under its top edge", plain.headerTop, sheet.headerTop],
	];
}

async function snapChecks(page: AskedPage): Promise<PaintCheck[]> {
	const [, height] = DRAWER_PAGE_SIZE;
	const low = await shownPanel(page, "drawer");
	const [gripX, gripY] = gripOf(low);
	await page.drag({ from: [gripX, gripY], to: [gripX, gripY + 60], steps: 6, stepMs: 16 });
	const held = await drawn(page);
	await waited(QUIET_MS);
	await page.release([gripX, gripY + 60]);
	const sprungBack = await settled(page);
	const grown = await draggedOnGrip(page, -300, { steps: 20, stepMs: 25, quietMs: QUIET_MS });
	const flung = await releasedOnGrip(page, 150, { steps: 3, stepMs: 10, quietMs: 0 }).then(() => panelGone(page));
	const flick = await shownPanel(page, "drawer").then(() =>
		draggedOnGrip(page, -60, { steps: 3, stepMs: 10, quietMs: 0 }),
	);
	const closing = await shownPanel(page, "drawer");
	await page.press(...(closing.close ?? [0, 0]));
	const closed = await waited(SETTLE_MS).then(() => panelGone(page));
	const plain = await shownPanel(page, "plain");
	const body = plain.body ?? [0, 0];
	await page.drag({ from: body, to: [body[0], body[1] + 80], steps: 8, stepMs: 16 });
	const bodyHeld = await drawn(page);
	await page.release([body[0], body[1] + 80]);
	return [
		["A SNAPPED DRAWER OPENS AT 0.4 OF THE WINDOW", low.shown, Math.round(height * 0.4)],
		["A DRAG ON THE GRIP MOVES THE DRAWER with the pointer", held.shown, low.shown - 60],
		["and let go slowly near its snap it springs back there", sprungBack.shown, low.shown],
		["A SLOW DRAG UP FROM THE 0.4 SNAP ENDS AT 0.75 OF THE WINDOW", grown.shown, Math.round(height * 0.75)],
		["A FLING DOWN FROM THE TOP SNAP CLOSES IT", flung, true],
		["a short quick flick up from 0.4 carries it to 0.75 by its speed", flick.shown, Math.round(height * 0.75)],
		["THE CLOSE BUTTON CLOSES IT", [closing.close !== null, closed], [true, true]],
		["A DRAG ON THE BODY MOVES IT TOO", bodyHeld.shown, plain.shown - 80],
	];
}

async function reducedMotionChecks(page: AskedPage): Promise<PaintCheck[]> {
	const [, height] = DRAWER_PAGE_SIZE;
	await shownPanel(page, "drawer");
	const moving = await pressedGrip(page, 40);
	await page.reduceMotion();
	await shownPanel(page, "drawer");
	const jumped = await pressedGrip(page, 40);
	return [
		[
			"A PRESS ON THE GRIP SPRINGS TO THE NEXT SNAP, and under reduced motion it is there at once",
			[moving.shown === Math.round(height * 0.75), jumped.shown],
			[false, Math.round(height * 0.75)],
		],
	];
}

async function pressedGrip(page: AskedPage, afterMs = SETTLE_MS): Promise<DrawnPanel> {
	await page.press(...gripOf(await drawn(page)));
	await waited(afterMs);
	return drawn(page);
}

interface DragPace {
	readonly steps: number;
	readonly stepMs: number;
	readonly quietMs: number;
}

async function draggedOnGrip(page: AskedPage, byPx: number, pace: DragPace): Promise<DrawnPanel> {
	await releasedOnGrip(page, byPx, pace);
	return settled(page);
}

async function releasedOnGrip(page: AskedPage, byPx: number, { steps, stepMs, quietMs }: DragPace): Promise<void> {
	const grip = gripOf(await drawn(page));
	const to: PagePoint = [grip[0], grip[1] + byPx];
	await page.drag({ from: grip, to, steps, stepMs });
	await waited(quietMs);
	await page.release(to);
}

async function panelGone(page: AskedPage): Promise<unknown> {
	await waited(SETTLE_MS);
	return page.ask(`document.querySelector('[role="dialog"]') === null`);
}

async function settled(page: AskedPage): Promise<DrawnPanel> {
	await waited(SETTLE_MS);
	return drawn(page);
}

function gripOf(panel: DrawnPanel): PagePoint {
	if (!panel.grip) throw new Error("drawer paint: the drawn panel has no grip");
	return panel.grip;
}

function isDrawnPanel(value: unknown): value is DrawnPanel {
	return typeof value === "object" && value !== null && "shown" in value && "grip" in value;
}

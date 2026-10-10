import { createElement as h } from "react";
import type { ReactElement } from "react";
import { ROOT } from "@widgetarium/core/paths.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { measuredFindingsIn } from "@widgetarium/core/page-measure.js";
import type { MeasuredFinding } from "@widgetarium/core/page-measure.js";
import type WidgetariumPlugin from "./main.js";
import { boardIn } from "./board-in-note.js";
import { DESKTOP_FRAME } from "widgetarium/studio";
import type { DrawnScreen } from "./design-canvas-shapes.js";
import { whileAgentLooks } from "./design-agent-look.js";
import type { AgentLook } from "./design-agent-look.js";
import { pageOfScreen, screensOfPage } from "./design-variants.js";
import { DRAWS_AT_ONCE } from "./design-drawn-when-seen.js";
import { PagesRegion, frameLabelOf } from "./design-pages.js";
import { ReferencesRegion, widgetOpenerOf } from "./design-references.js";
import { WidgetsRegion } from "./design-widgets.js";
import { withBlocks } from "./design-block-registry.js";
import { ScreenBoard } from "./design-screen-board.js";
import { designOf } from "./design-view.js";
import { canvasOf, drawnOffScreen, pngOf, stackedPngOf } from "./off-screen.js";

export const SHOTS_DIR = `${ROOT}/shots`;
export const SHOT_REQUESTS_DIR = `${SHOTS_DIR}/requests`;

const SHOT_POLL_MS = 1000;
const DESIGN_SCALE = 0.5;
const WIDGETS_PER_CHUNK = 4;
const NOTE_SHOT = { width: 1280 } as const;
const NO_NOTE = "{note} is not a note in this vault";
const NO_BOARD = "{note} holds no widgetarium board to draw";
const NO_PAGE = "{app} has no page {page} with a frame {frame}: its pages are {pages}";

interface Shot {
	readonly png: ArrayBuffer;
	readonly measured: readonly MeasuredFinding[] | null;
}

interface ShotAsked {
	readonly note: string;
	readonly design: string;
	readonly page: string;
	readonly frame: string;
}

export function answerShotRequests(plugin: WidgetariumPlugin): void {
	let isBusy = false;
	const poll = async (): Promise<void> => {
		if (isBusy) return;
		isBusy = true;
		await answerPending(plugin).catch((failure: unknown) =>
			console.error("[widgetarium] a shot was not taken", failure),
		);
		isBusy = false;
	};
	plugin.registerInterval(window.setInterval(() => void poll(), SHOT_POLL_MS));
}

async function answerPending(plugin: WidgetariumPlugin): Promise<void> {
	const adapter = plugin.app.vault.adapter;
	if (!(await adapter.exists(SHOT_REQUESTS_DIR))) return;
	const { files } = await adapter.list(SHOT_REQUESTS_DIR);
	for (const path of files.filter((one) => one.endsWith(".json"))) {
		const id = path.slice(path.lastIndexOf("/") + 1, -".json".length);
		const asked = askedIn(await adapter.read(path));
		await adapter.remove(path);
		await answerOne(plugin, id, asked);
	}
}

async function answerOne(plugin: WidgetariumPlugin, id: string, asked: ShotAsked): Promise<void> {
	const adapter = plugin.app.vault.adapter;
	try {
		const shot = asked.design ? await shotWhileAgentLooks(plugin, asked) : await noteShotOf(plugin, asked.note);
		if (shot.measured) await adapter.write(`${SHOTS_DIR}/${id}.measured.json`, JSON.stringify(shot.measured));
		await adapter.writeBinary(`${SHOTS_DIR}/${id}.png`, shot.png);
	} catch (failure) {
		await adapter.write(`${SHOTS_DIR}/${id}.failed.txt`, failure instanceof Error ? failure.message : String(failure));
	}
}

function shotWhileAgentLooks(plugin: WidgetariumPlugin, asked: ShotAsked): Promise<Shot> {
	const look = { app: asked.design, page: asked.page, frame: asked.frame };
	return whileAgentLooks(look, () => (asked.page ? pageShotOf(plugin, look) : designShotOf(plugin, asked.design)));
}

async function pageShotOf(plugin: WidgetariumPlugin, look: AgentLook): Promise<Shot> {
	const design = await designOf(plugin, look.app);
	const screens = framesNamed(screensOfPage(design.screens, look.page), look.frame);
	if (screens.length === 0) throw new Error(noPageSaid(look, design.screens));
	const drawing = { registry: withBlocks(plugin.registry), host: plugin.host };
	const tree = drawnAtOnce(h(PagesRegion, { screens, size: DESKTOP_FRAME, ...drawing }));
	return drawnOffScreen({}, tree, async (node) => ({ measured: measuredFindingsIn(node), png: await pngOf(node) }));
}

function framesNamed(screens: readonly DrawnScreen[], frame: string): DrawnScreen[] {
	if (!frame) return [...screens];
	return screens
		.map((screen) => ({
			...screen,
			states: screen.states.filter((state) => state.name === frame || frameLabelOf(screen, state.name) === frame),
		}))
		.filter((screen) => screen.states.length > 0);
}

function noPageSaid(look: AgentLook, screens: readonly DrawnScreen[]): string {
	const pages = [...new Set(screens.map((screen) => pageOfScreen(screen.name)))].join(", ");
	return NO_PAGE.replace("{app}", look.app)
		.replace("{page}", look.page)
		.replace("{frame}", look.frame || "*")
		.replace("{pages}", pages);
}

function drawnAtOnce(chunk: ReactElement): ReactElement {
	return h(DRAWS_AT_ONCE.Provider, { value: true }, h("div", { className: "wg-design-field wg-portal" }, chunk));
}

async function designShotOf(plugin: WidgetariumPlugin, app: string): Promise<Shot> {
	const design = await designOf(plugin, app);
	const drawing = { registry: withBlocks(plugin.registry), host: plugin.host };
	const chunks = [
		h(ReferencesRegion, { references: design.references, opener: widgetOpenerOf(drawing.registry, () => undefined) }),
		...design.screens.map((screen) => h(PagesRegion, { screens: [screen], size: DESKTOP_FRAME, ...drawing })),
		...widgetBatchesOf(design.widgets).map((widgets) => h(WidgetsRegion, { widgets, ...drawing })),
	];
	const measured: MeasuredFinding[] = [];
	const canvases: HTMLCanvasElement[] = [];
	for (const chunk of chunks) {
		const drawn = await drawnOffScreen({}, drawnAtOnce(chunk), async (node) => ({
			found: measuredFindingsIn(node),
			canvas: await canvasOf(node, DESIGN_SCALE),
		}));
		measured.push(...drawn.found);
		canvases.push(drawn.canvas);
	}
	return { measured, png: await stackedPngOf(canvases) };
}

function widgetBatchesOf<T>(widgets: readonly T[]): T[][] {
	const batches: T[][] = [];
	for (let at = 0; at < widgets.length; at += WIDGETS_PER_CHUNK)
		batches.push(widgets.slice(at, at + WIDGETS_PER_CHUNK));
	return batches;
}

// TRADE-OFF: only the note's board is drawn, not its markdown; a screen note holds nothing else.
async function noteShotOf(plugin: WidgetariumPlugin, note: string): Promise<Shot> {
	const text = await plugin.app.vault.adapter.read(note).catch(() => null);
	if (text === null) throw new Error(NO_NOTE.replace("{note}", note));
	const board = boardIn(text);
	if (!board) throw new Error(NO_BOARD.replace("{note}", note));
	const drawing = { registry: withBlocks(plugin.registry), host: plugin.host };
	const tree = h(
		"div",
		{ className: "wg-portal wg-off-screen-page" },
		h(ScreenBoard, { board, width: NOTE_SHOT.width, ...drawing }),
	);
	return drawnOffScreen(NOTE_SHOT, tree, async (node) => ({ measured: null, png: await pngOf(node) }));
}

function askedIn(text: string): ShotAsked {
	const parsed: unknown = JSON.parse(text);
	const textAt = (key: string): string => (isObject(parsed) && typeof parsed[key] === "string" ? parsed[key] : "");
	return { note: textAt("note"), design: textAt("design"), page: textAt("page"), frame: textAt("frame") };
}

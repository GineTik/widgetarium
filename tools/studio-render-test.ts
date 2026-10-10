import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import esbuild from "esbuild";
import { NOT_AVAILABLE_ON_HOST } from "../packages/core/src/engine/studio-host.ts";
import { ASSISTANT_NOT_AVAILABLE } from "../packages/core/src/engine/assistant-port.ts";
import { STUDIO_BAND_PX } from "../packages/widgetarium/src/studio/shared/studio-band-size.ts";
import {
	catalogueImportsIn,
	checkCatalogueAbsentInApp,
	checkCataloguePanel,
	checkCatalogueSheetSplit,
} from "./studio-render-catalogue.ts";
import type { CatalogueSeen } from "./studio-render-catalogue.ts";
import { bundleOf, findBrowser } from "./harness.ts";
import { MEASURE_SCRIPT } from "./studio-render-measure.ts";

interface Box {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly right: number;
}

interface Seen extends CatalogueSeen {
	readonly routeDom?: string | null;
	readonly routeTop?: number | null;
	readonly studioElements?: number;
	readonly menu?: Box | null;
	readonly ai?: Box | null;
	readonly aiPressed?: string | null;
	readonly outletOpen?: Box | null;
	readonly sidebarOpen?: Box | null;
	readonly bandOpen?: Box | null;
	readonly sentTurn?: string | null;
	readonly sent?: readonly string[] | null;
	readonly specTitle?: string | null;
	readonly built?: readonly string[] | null;
	readonly scrolledTo?: readonly string[];
	readonly setupFailure?: string | null;
	readonly chatAfterSetupFailure?: boolean;
	readonly sendFailure?: string | null;
	readonly draftBack?: string | null;
	readonly sidebarGone?: boolean;
	readonly outletClosed?: Box | null;
	readonly quietSaid?: string | null;
	readonly bandWithQuiet?: boolean;
	readonly canvasShown?: boolean;
	readonly taskGoneInCanvas?: boolean;
	readonly frames?: readonly string[];
	readonly frameDrawsRoute?: boolean;
	readonly needsSaid?: string | null;
	readonly transformBefore?: string;
	readonly transformZoomed?: string;
	readonly transformPanned?: string;
	readonly locationInCanvas?: string;
	readonly cards?: readonly string[];
	readonly transformBackOnPages?: string;
	readonly routeTriggerHit?: boolean | null;
	readonly frameTriggerHit?: boolean | null;
	readonly frameTriggerFocused?: boolean | null;
	readonly cardDrawsState?: boolean;
	readonly backShowsRoute?: boolean;
	readonly routeDomBack?: string | null;
	readonly bandAfterRefusal?: boolean;
	readonly bandHeight?: number | null;
	readonly cornerGap?: number | null;
	readonly refusal?: string | null;
	readonly appsFailure?: string | null;
	readonly navigated?: boolean;
	readonly memoryLeftTask?: boolean;
	readonly locationAfter?: string;
	readonly param?: unknown;
	readonly navigatedBack?: boolean;
	readonly paramAfter?: unknown;
}

type Mode = "app" | "studio" | "studio-mac" | "studio-memory";

const VIEW = { width: 1280, height: 800 };
const BAND_INSET_PX = 8;
const BUTTON_PX = 34;
const MAC_SAFE_AREA_PX = 76;
const REACT_ID = /«[^»]*»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;
const APP_ENTRY = "packages/widgetarium/src/app.ts";
const STUDIO_FOLDER = "packages/widgetarium/src/studio/";

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-render"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/widgetarium/src/browser-host.css", "apps/obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");

// TRADE-OFF: headless Chrome under a virtual time budget runs one animation frame; timers stand in for the rest
const FRAMES_BY_TIMER = `window.requestAnimationFrame = (step) => setTimeout(() => step(performance.now()), 16); window.cancelAnimationFrame = (frame) => clearTimeout(frame);`;

function pageOf(mode: Mode): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style>
</head><body><div id="root"></div>
<pre id="boom"></pre><pre id="seen"></pre>
<script>window.__MODE__=${JSON.stringify(mode)};</script>
${mode === "studio" ? `<script>${FRAMES_BY_TIMER}</script>` : ""}
<script>${bundle}</script>
<script>${MEASURE_SCRIPT}</script>
</body></html>`;
}

function textOfPre(dom: string, id: string): string {
	const open = `<pre id="${id}">`;
	const from = dom.indexOf(open);
	if (from === -1) return "";
	const start = from + open.length;
	return dom
		.slice(start, dom.indexOf("</pre>", start))
		.replaceAll("&quot;", '"')
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&amp;", "&")
		.trim();
}

const served = { page: "" };
const server = http.createServer((_request, response) => {
	response.setHeader("content-type", "text/html");
	response.end(served.page);
});
await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening));
const address = server.address();
const origin = typeof address === "object" && address !== null ? `http://127.0.0.1:${address.port}/` : "";

async function chromeAt(extra: readonly string[]): Promise<string> {
	const { stdout } = await promisify(execFile)(
		findBrowser("studio render"),
		[
			"--headless",
			"--disable-gpu",
			"--no-sandbox",
			"--hide-scrollbars",
			`--window-size=${VIEW.width},${VIEW.height}`,
			"--virtual-time-budget=12000",
			...extra,
			origin,
		],
		{ encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
	);
	return stdout;
}

async function seenIn(mode: Mode): Promise<{ readonly seen: Seen; readonly reported: string }> {
	served.page = pageOf(mode);
	writeFileSync(path.join(shotsAt, `${mode}.html`), served.page);
	await chromeAt([`--screenshot=${path.join(shotsAt, `${mode}.png`)}`]);
	const dom = await chromeAt(["--dump-dom"]);
	const parsed: unknown = JSON.parse(textOfPre(dom, "seen") || "{}");
	return { seen: parsed !== null && typeof parsed === "object" ? parsed : {}, reported: textOfPre(dom, "boom") };
}

function sameList(got: readonly string[] | undefined, wanted: readonly string[]): boolean {
	return JSON.stringify(got ?? []) === JSON.stringify(wanted);
}

function scaleOf(transform: string | undefined): number {
	const scale = /scale\(([\d.]+)\)/.exec(transform ?? "")?.[1];
	return scale === undefined ? Number.NaN : Number(scale);
}

function withoutReactIds(dom: string | null | undefined): string {
	return (dom ?? "").replace(REACT_ID, "id");
}

async function studioModulesInAppEntry(): Promise<string[]> {
	const built = await esbuild.build({
		entryPoints: [APP_ENTRY],
		bundle: true,
		write: false,
		metafile: true,
		format: "esm",
		platform: "browser",
		conditions: ["source"],
		packages: "external",
		logLevel: "silent",
	});
	const { inputs } = built.metafile;
	return [...Object.keys(inputs).filter((input) => input.includes(STUDIO_FOLDER)), ...catalogueImportsIn(inputs)];
}

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const app = await seenIn("app");
check("app mode drew without a failure", app.reported === "", app.reported);
check("app mode draws no studio element", app.seen.studioElements === 0, app.seen.studioElements);
checkCatalogueAbsentInApp(app.seen, check);
check("app mode draws the route", (app.seen.routeDom ?? "").includes("Water the ferns"), app.seen.routeTop);

const studio = await seenIn("studio");
const { menu, ai } = studio.seen;
check("studio drew without a failure", studio.reported === "", studio.reported);
check("the menu button is the small size", menu?.w === BUTTON_PX && menu.h === BUTTON_PX, menu);
check("the menu is 8px from the top", menu?.y === BAND_INSET_PX, menu);
check("a browser tab keeps no safe area: the menu is 8px from the left", menu?.x === BAND_INSET_PX, menu);
check("the AI button is 8px from the right edge", ai?.right === BAND_INSET_PX, ai);
check("the AI button is 8px from the top", ai?.y === BAND_INSET_PX, ai);
check("the route starts at or below the band", (studio.seen.routeTop ?? -1) >= STUDIO_BAND_PX, studio.seen.routeTop);
check(
	"the route's DOM in the outlet equals app mode's",
	withoutReactIds(studio.seen.routeDom) === withoutReactIds(app.seen.routeDom),
	withoutReactIds(studio.seen.routeDom).length,
);
check("the AI button presses the sidebar state", studio.seen.aiPressed === "true", studio.seen.aiPressed);
const { outletBefore, outletOpen, sidebarOpen, bandOpen, outletClosed } = studio.seen;
check(
	"an open sidebar narrows the outlet by its own width",
	outletBefore !== undefined &&
		outletBefore !== null &&
		outletOpen !== undefined &&
		outletOpen !== null &&
		sidebarOpen !== undefined &&
		sidebarOpen !== null &&
		sidebarOpen.w > 0 &&
		outletOpen.w < outletBefore.w &&
		Math.abs(outletOpen.w + sidebarOpen.w - outletBefore.w) <= 1,
	{ outletBefore, outletOpen, sidebarOpen },
);
check(
	"and stands beside it, never over it",
	outletOpen !== undefined &&
		outletOpen !== null &&
		sidebarOpen !== undefined &&
		sidebarOpen !== null &&
		outletOpen.x + outletOpen.w <= sidebarOpen.x &&
		sidebarOpen.right === 0,
	{ outletOpen, sidebarOpen },
);
check(
	"while the band stays above both, as wide as the window",
	bandOpen !== undefined &&
		bandOpen !== null &&
		sidebarOpen !== undefined &&
		sidebarOpen !== null &&
		bandOpen.w === VIEW.width &&
		bandOpen.y + bandOpen.h <= sidebarOpen.y,
	{ bandOpen, sidebarOpen },
);
check(
	"a message typed and sent reaches the port and shows as a turn",
	studio.seen.sentTurn === "Plant the beans" && sameList(studio.seen.sent ?? [], ["Plant the beans"]),
	{ turn: studio.seen.sentTurn, sent: studio.seen.sent },
);
check("the sidebar draws the spec card the port's cards name", studio.seen.specTitle === "Farm", studio.seen.specTitle);
check(
	"and its Build it asks the port to build that app",
	sameList(studio.seen.built ?? [], ["Farm"]),
	studio.seen.built,
);
check(
	"a press on a working app's line scrolls this chat's card, never another chat's",
	sameList(studio.seen.scrolledTo ?? [], ["this chat"]),
	studio.seen.scrolledTo,
);
check(
	"a setup that fails to read again keeps the chat on screen",
	studio.seen.chatAfterSetupFailure === true,
	studio.seen.chatAfterSetupFailure,
);
check(
	"and says so on the quiet failure line",
	(studio.seen.setupFailure ?? "").includes("the fake vault is gone"),
	studio.seen.setupFailure,
);
check(
	"a send the port refuses says so above the composer",
	(studio.seen.sendFailure ?? "").includes("the fake provider refuses"),
	studio.seen.sendFailure,
);
check("and puts the draft back into the box", studio.seen.draftBack === "Break the fence", studio.seen.draftBack);
check(
	"a second press closes the sidebar and gives the outlet its width back",
	studio.seen.sidebarGone === true && outletClosed?.w === outletBefore?.w,
	{ gone: studio.seen.sidebarGone, outletClosed },
);
checkCataloguePanel(studio.seen, check);
check("Edit in canvas swaps the route for the canvas", studio.seen.canvasShown === true, studio.seen.canvasShown);
check("and the route leaves the outlet", studio.seen.taskGoneInCanvas === true, studio.seen.taskGoneInCanvas);
check("the canvas holds one frame per route", sameList(studio.seen.frames, ["/", "/done/:id"]), studio.seen.frames);
check("a frame draws its route's content", studio.seen.frameDrawsRoute === true, studio.seen.frameDrawsRoute);
check(
	"a route with a param and no sample says what it needs",
	studio.seen.needsSaid === "needs :id",
	studio.seen.needsSaid,
);
check("a zoom changes the field's scale", scaleOf(studio.seen.transformZoomed) > scaleOf(studio.seen.transformBefore), [
	studio.seen.transformBefore,
	studio.seen.transformZoomed,
]);
check(
	"a pan moves the field",
	(studio.seen.transformPanned ?? "") !== "" && studio.seen.transformPanned !== studio.seen.transformZoomed,
	studio.seen.transformPanned,
);
check(
	"panning and zooming never navigate the studio",
	studio.seen.locationInCanvas === "/",
	studio.seen.locationInCanvas,
);
check(
	"the Components page holds a card per widget state",
	sameList(studio.seen.cards, ["task-list · Full", "task-list · Empty"]),
	studio.seen.cards,
);
check("a state card draws the state's props", studio.seen.cardDrawsState === true, studio.seen.cardDrawsState);
check(
	"back on Pages, the camera stands where it was left",
	(studio.seen.transformBackOnPages ?? "") !== "" && studio.seen.transformBackOnPages === studio.seen.transformPanned,
	[studio.seen.transformPanned, studio.seen.transformBackOnPages],
);
check(
	"a press on the route's popover trigger reaches it",
	studio.seen.routeTriggerHit === true,
	studio.seen.routeTriggerHit,
);
check(
	"a press on a frame's popover trigger never reaches it",
	studio.seen.frameTriggerHit === false,
	studio.seen.frameTriggerHit,
);
check("and the trigger takes no focus", studio.seen.frameTriggerFocused === false, studio.seen.frameTriggerFocused);
check("Back to view brings the route back", studio.seen.backShowsRoute === true, studio.seen.backShowsRoute);
check(
	"and its DOM equals the route's before the canvas",
	withoutReactIds(studio.seen.routeDomBack) === withoutReactIds(studio.seen.routeDom),
	withoutReactIds(studio.seen.routeDomBack).length,
);
check("an app the host cannot open leaves the shell standing", studio.seen.bandAfterRefusal === true, null);
check(
	"open-app answers ok:false, and the open menu says the host's reason",
	studio.seen.refusal === NOT_AVAILABLE_ON_HOST,
	studio.seen.refusal,
);
check("the band is as tall as STUDIO_BAND_PX", studio.seen.bandHeight === STUDIO_BAND_PX, studio.seen.bandHeight);

const mac = await seenIn("studio-mac");
check("a host with no apps drew without a failure", mac.reported === "", mac.reported);
check(
	"a host with no assistant says so in the sidebar, and the band stays",
	mac.seen.quietSaid === ASSISTANT_NOT_AVAILABLE && mac.seen.bandWithQuiet === true,
	{ quiet: mac.seen.quietSaid, band: mac.seen.bandWithQuiet },
);
check(
	"a host inset of 76px moves the menu past the system buttons",
	mac.seen.menu?.x === MAC_SAFE_AREA_PX + (mac.seen.cornerGap ?? Number.NaN),
	{ menu: mac.seen.menu, gap: mac.seen.cornerGap },
);
check(
	"a host holding no apps list says so in the menu instead of a draft",
	mac.seen.appsFailure === NOT_AVAILABLE_ON_HOST,
	mac.seen.appsFailure,
);

const memory = await seenIn("studio-memory");
check("a studio over an opened project drew without a failure", memory.reported === "", memory.reported);
check(
	"a memory router draws the route it starts at",
	(memory.seen.routeDom ?? "").includes("Water the ferns"),
	memory.seen.routeTop,
);
check("and navigates to another route", memory.seen.navigated === true && memory.seen.memoryLeftTask === true, {
	navigated: memory.seen.navigated,
	left: memory.seen.memoryLeftTask,
});
check("without touching the page's own location", memory.seen.locationAfter === "/", memory.seen.locationAfter);
check("writing the route's params under the key it was given", memory.seen.param === "7", memory.seen.param);
check(
	"and a route without that param does not read it",
	memory.seen.navigatedBack === true && (memory.seen.paramAfter ?? null) === null,
	{ navigatedBack: memory.seen.navigatedBack, paramAfter: memory.seen.paramAfter },
);

server.close();
const leaked = await studioModulesInAppEntry();
check("the app entry bundles no studio module and no catalogue pack", leaked.length === 0, leaked);
checkCatalogueSheetSplit(sheets, check);

console.log(`shots in ${shotsAt}`);
if (failed > 0) {
	console.log(`studio render: ${failed} failed`);
	process.exit(1);
}
console.log("studio render: clean");

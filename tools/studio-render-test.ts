import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import esbuild from "esbuild";
import { NOT_AVAILABLE_ON_HOST } from "../packages/core/src/engine/studio-host.ts";
import { STUDIO_BAND_PX } from "../packages/widgetarium/src/studio/shared/studio-band-size.ts";
import { bundleOf, findBrowser } from "./harness.ts";

interface Box {
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly right: number;
}

interface Seen {
	readonly routeDom?: string | null;
	readonly routeTop?: number | null;
	readonly studioElements?: number;
	readonly menu?: Box | null;
	readonly ai?: Box | null;
	readonly aiPressed?: string | null;
	readonly canvasShown?: boolean;
	readonly taskGoneInCanvas?: boolean;
	readonly backShowsRoute?: boolean;
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
const REACT_ID = /«[^»]*»|:r[0-9a-z]+:/g;
const APP_ENTRY = "packages/widgetarium/src/app.ts";
const STUDIO_FOLDER = "packages/widgetarium/src/studio/";

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-studio-render"));
mkdirSync(shotsAt, { recursive: true });

const bundle = await bundleOf("tools/studio-render-page.tsx");
const sheets = ["packages/widgetarium/src/browser-host.css", "apps/obsidian/styles.css"]
	.map((at) => readFileSync(at, "utf8"))
	.join("\n");

const MEASURE_SCRIPT = `
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const until = async (find) => { for (let at = 0; at < 80; at += 1) { const found = find(); if (found) return found; await wait(50); } return null; };
const leafNamed = (said, under = document) => [...under.querySelectorAll("*")].find((one) => one.children.length === 0 && one.textContent.trim() === said);
const boxOf = (node) => { if (!node) return null; const box = node.getBoundingClientRect(); return { x: Math.round(box.left), y: Math.round(box.top), w: Math.round(box.width), h: Math.round(box.height), right: Math.round(innerWidth - box.right) }; };
const menuButton = () => document.querySelector('[aria-label$=" menu"]');
const aiButton = () => document.querySelector('[aria-label="AI assistant"]');
(async () => {
	const seen = {};
	const report = () => (document.getElementById("seen").textContent = JSON.stringify(seen));
	await until(() => document.querySelector("[data-task]"));
	await until(() => window.__MODE__ === "app" || menuButton());
	await wait(300);
	const routeHolder = document.querySelector(window.__MODE__ === "app" ? "#root" : ".wg-studio-outlet");
	seen.routeDom = routeHolder ? routeHolder.innerHTML : null;
	const routeBoard = routeHolder ? routeHolder.querySelector(".wg-root") : null;
	seen.routeTop = routeBoard ? Math.round(routeBoard.getBoundingClientRect().top) : null;
	seen.studioElements = document.querySelectorAll('[class*="wg-studio"]').length;
	seen.menu = boxOf(menuButton());
	seen.ai = boxOf(aiButton());
	seen.bandHeight = boxOf(document.querySelector(".wg-studio-band"))?.h ?? null;
	const corner = document.querySelector(".wg-studio-corner");
	seen.cornerGap = corner ? parseFloat(getComputedStyle(corner).columnGap) : null;
	report();
	if (window.__MODE__ === "studio-mac") {
		menuButton().click();
		seen.appsFailure = (await until(() => document.querySelector('[data-name="Apps failure"]')))?.textContent ?? null;
		report();
	}
	if (window.__MODE__ === "studio-memory") {
		seen.navigated = window.__ROUTER__.navigate("/done/7");
		seen.memoryLeftTask = Boolean(await until(() => !document.querySelector("[data-task]")));
		seen.locationAfter = location.pathname;
		seen.param = await window.__PARAM__("id");
		seen.navigatedBack = window.__ROUTER__.navigate("/");
		seen.paramAfter = await window.__PARAM__("id");
		report();
	}
	if (window.__MODE__ !== "studio") return;
	aiButton().click();
	await until(() => aiButton()?.getAttribute("aria-pressed") === "true");
	seen.aiPressed = aiButton()?.getAttribute("aria-pressed") ?? null;
	menuButton().click();
	(await until(() => leafNamed("Edit in canvas")))?.click();
	seen.canvasShown = Boolean(await until(() => document.querySelector(".wg-studio-canvas-placeholder")));
	seen.taskGoneInCanvas = !document.querySelector("[data-task]");
	await wait(300);
	menuButton().click();
	(await until(() => leafNamed("Back to view")))?.click();
	seen.backShowsRoute = Boolean(await until(() => document.querySelector("[data-task]")));
	await wait(300);
	menuButton().click();
	const list = await until(() => document.querySelector(".wg-studio-apps"));
	(list ? leafNamed("Farm", list) : null)?.click();
	await wait(500);
	seen.bandAfterRefusal = Boolean(document.querySelector(".wg-studio-band") && menuButton());
	seen.refusal = document.querySelector('.wg-studio-menu [data-name="Refusal"]')?.textContent ?? null;
	report();
})();`;

function pageOf(mode: Mode): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${sheets}</style>
</head><body><div id="root"></div>
<pre id="boom"></pre><pre id="seen"></pre>
<script>window.__MODE__=${JSON.stringify(mode)};</script>
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
	return Object.keys(built.metafile.inputs).filter((input) => input.includes(STUDIO_FOLDER));
}

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const app = await seenIn("app");
check("app mode drew without a failure", app.reported === "", app.reported);
check("app mode draws no studio element", app.seen.studioElements === 0, app.seen.studioElements);
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
check("Edit in canvas swaps the route for the canvas", studio.seen.canvasShown === true, studio.seen.canvasShown);
check("and the route leaves the outlet", studio.seen.taskGoneInCanvas === true, studio.seen.taskGoneInCanvas);
check("Back to view brings the route back", studio.seen.backShowsRoute === true, studio.seen.backShowsRoute);
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
check("the app entry bundles no studio module", leaked.length === 0, leaked);

console.log(`shots in ${shotsAt}`);
if (failed > 0) {
	console.log(`studio render: ${failed} failed`);
	process.exit(1);
}
console.log("studio render: clean");

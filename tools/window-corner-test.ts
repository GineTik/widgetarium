import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { bundleOf, shoot, THEMES } from "./harness.ts";
import { systemWidgetFiles } from "./system-widget-files.mts";
import { cornerWidthOf } from "../apps/obsidian/src/corner-board.ts";

interface Seen {
	readonly menu?: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
	readonly ai?: { readonly right: number; readonly y: number; readonly h: number };
	readonly letter?: string;
	readonly asked?: readonly string[];
}

const LEAF_PX = 900;
const BAND_INSET_PX = 8;
const MAC_SAFE_AREA_PX = 76;
const CORNER_GAP_PX = 4;
const BUTTON_PX = 34;

const shotsAt = path.resolve(process.argv[2] ?? path.join(tmpdir(), "wg-window-corner"));
mkdirSync(shotsAt, { recursive: true });

const files = Object.fromEntries(
	Object.entries(systemWidgetFiles()).map(([name, text]) => [`.widgetarium/widgets/${name}`, text]),
);
const bundle = await bundleOf("tools/window-corner-page.tsx");
const CHROME_SCOPE = "registry/@chrome";
const builtSheets = readdirSync(CHROME_SCOPE, { withFileTypes: true })
	.filter((entry) => entry.isDirectory() && existsSync(path.join(CHROME_SCOPE, entry.name, "build/widget.css")))
	.map((entry) => readFileSync(path.join(CHROME_SCOPE, entry.name, "build/widget.css"), "utf8"))
	.join("\n");

const MEASURE_SCRIPT = `
const leaf = document.querySelector(".workspace-leaf-content");
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const until = async (find) => { for (let at = 0; at < 60; at += 1) { const found = find(); if (found) return found; await wait(50); } return null; };
(async () => {
	const base = leaf.getBoundingClientRect();
	const menu = await until(() => document.querySelector('[aria-label$=" menu"]'));
	const ai = await until(() => document.querySelector('[aria-label="AI assistant"]'));
	await wait(300);
	const seen = {};
	if (menu) {
		const box = menu.getBoundingClientRect();
		seen.menu = { x: Math.round(box.left - base.left), y: Math.round(box.top - base.top), w: Math.round(box.width), h: Math.round(box.height) };
		seen.letter = menu.textContent.trim();
	}
	if (ai) {
		const box = ai.getBoundingClientRect();
		seen.ai = { right: Math.round(base.right - box.right), y: Math.round(box.top - base.top), h: Math.round(box.height) };
	}
	const report = () => (document.getElementById("seen").textContent = JSON.stringify({ ...seen, asked: [...window.__ASKED__] }));
	report();
	if (ai) ai.click();
	if (menu && !window.__NO_APPS__) {
		menu.click();
		const crm = await until(() => [...document.querySelectorAll("*")].find((one) => one.children.length === 0 && one.textContent.trim() === "CRM"));
		if (crm) crm.click();
		await wait(300);
		menu.click();
		const edit = await until(() => [...document.querySelectorAll("*")].find((one) => one.children.length === 0 && one.textContent.trim() === "Edit in canvas"));
		if (edit) edit.click();
	}
	await wait(300);
	report();
})();`;

function pageOf(hasNoApps: boolean): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${builtSheets}</style>
<style>
body { margin: 0; ${THEMES.light} background: var(--background-secondary); color: var(--text-normal);
	--font-interface: "Helvetica Neue", Helvetica, Arial, sans-serif; font-family: var(--font-interface);
	--font-ui-smaller: 12px; --font-ui-small: 13px; --font-ui-medium: 15px; --font-semibold: 600;
	--size-4-1: 4px; --size-4-2: 8px; --size-4-3: 12px; }
.workspace-leaf-content { position: relative; width: ${LEAF_PX}px; height: 600px; background: var(--background-primary); }
</style></head><body>
<div class="workspace-leaf-content wg-app-window"><div class="view-content"></div>
<div class="wg-window-corners"><div id="left" class="wg-window-corner is-left" style="width:${cornerWidthOf("left", "macos")}px"></div><div id="right" class="wg-window-corner is-right" style="width:${cornerWidthOf("right", "macos")}px"></div></div></div>
<pre id="boom"></pre><pre id="seen"></pre>
<script>window.__FILES__=${JSON.stringify(files)};window.__NO_APPS__=${String(hasNoApps)};</script>
<script>${bundle}</script>
<script>${MEASURE_SCRIPT}</script>
</body></html>`;
}

function textOfPre(dom: string, id: string): string {
	const open = `<pre id="${id}">`;
	const from = dom.indexOf(open);
	if (from === -1) return "";
	const start = from + open.length;
	return dom.slice(start, dom.indexOf("</pre>", start)).replaceAll("&quot;", '"').trim();
}

function seenOf(hasNoApps: boolean, name: string): { readonly seen: Seen; readonly reported: string } {
	const file = path.join(shotsAt, `${name}.html`);
	writeFileSync(file, pageOf(hasNoApps));
	const size = { width: LEAF_PX, height: 640 };
	shoot(file, [`--screenshot=${path.join(shotsAt, `${name}.png`)}`], size);
	const dom = shoot(file, ["--dump-dom", "--virtual-time-budget=8000"], size);
	const parsed: unknown = JSON.parse(textOfPre(dom, "seen") || "{}");
	return { seen: parsed !== null && typeof parsed === "object" ? parsed : {}, reported: textOfPre(dom, "boom") };
}

let failed = 0;
function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) failed += 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${what} — ${JSON.stringify(got)}`);
}

const withApps = seenOf(false, "with-apps");
check("the page drew without a failure", withApps.reported === "", withApps.reported);
const { menu, ai, letter, asked = [] } = withApps.seen;
check("the menu stands after the macOS safe area", menu?.x === MAC_SAFE_AREA_PX + CORNER_GAP_PX, menu);
check("the menu is 8px from the top", menu?.y === BAND_INSET_PX, menu);
check("the menu button is the small size", menu?.h === BUTTON_PX && menu.w === BUTTON_PX, menu);
check("the AI button is 8px from the right edge", ai?.right === BAND_INSET_PX, ai);
check("the AI button is 8px from the top", ai?.y === BAND_INSET_PX, ai);
check("the mark carries the app's first letter", letter === "R", letter);
check("the AI button asks for the sidebar", asked.includes("assistant"), asked);
check("a row opens its app", asked.includes("open CRM"), asked);
check("Edit in canvas opens this app's canvas", asked.includes("edit Reading list"), asked);

const noApps = seenOf(true, "no-apps");
check("with no apps the mark is the draft's", noApps.seen.letter === "U", noApps.seen.letter);

console.log(`shots in ${shotsAt}`);
if (failed > 0) {
	console.log(`window corner: ${failed} failed`);
	process.exit(1);
}
console.log("window corner: clean");

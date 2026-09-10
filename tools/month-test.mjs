import fs from "node:fs";
import { JSDOM } from "jsdom";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const TILE = (cells) => cells * 54 + (cells - 1) * 12;
let room = { width: TILE(6) - 16, height: TILE(6) - 60 };
globalThis.ResizeObserver = class {
	constructor(take) {
		this.take = take;
	}
	observe() {
		this.take([{ contentRect: { ...room } }]);
	}
	disconnect() {}
};
globalThis.window.ResizeObserver = globalThis.ResizeObserver;

buildMirror();
const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("./.mjs-cache/engine/render.mjs");
const { widgetarium } = await import("./.mjs-cache/api.mjs");
const kit = await import("./.mjs-cache/kit.mjs");
const { collectionGateway, soloGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { mappedCollection } = await import("./.mjs-cache/gateway/mapped.mjs");

const WIDGET = "widgets/@habit/month/widget.tsx";
const MANIFEST = JSON.parse(fs.readFileSync("widgets/@habit/month/manifest.json", "utf8"));

const libs = new Map();

function compiled(file, source) {
	return transform(source, {
		transforms: file.endsWith(".tsx") ? ["typescript", "jsx", "imports"] : ["jsx", "imports"],
		jsxPragma: "h",
		jsxFragmentPragma: "Fragment",
		production: true,
		filePath: file,
	}).code;
}

function importing() {
	const modules = { widgetarium, "widgetarium/kit": kit, react, ...Object.fromEntries(libs) };
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file) {
	const shell = { exports: {} };
	const code = compiled(file, fs.readFileSync(file, "utf8"));
	new Function("require", "module", "exports", "h", "Fragment", code)(importing(), shell, shell.exports, h, Fragment);
	return shell.exports;
}

libs.set("@habit/lib", run("widgets/@habit/lib.js"));
const { isoOf } = libs.get("@habit/lib");
const Month = run(WIDGET).default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`);
}

const NOW = new Date();
const TODAY = isoOf(NOW);
const written = [];
let minted = 0;

function rowsOver(notes) {
	return notes.map((note) => ({
		ref: note.path,
		value: { ...note, name: note.path.slice(note.path.lastIndexOf("/") + 1).replace(/\.md$/, "") },
	}));
}

function createsOne(draft) {
	written.push({ verb: "create", ...draft });
	return null;
}

function updatesOver(rows) {
	return (input) => {
		written.push({ verb: "update", ...input });
		return rows.find((row) => row.ref === input.ref) ?? null;
	};
}

function writesOver(rows, verbs) {
	return {
		...(verbs.includes("update") ? { update: updatesOver(rows) } : {}),
		...(verbs.includes("create") ? { create: createsOne } : {}),
	};
}

function gatewayOver(notes, verbs = ["update", "create"]) {
	const rows = rowsOver(notes);
	const reads = { list: () => ({ rows, total: rows.length }), get: (ref) => rows.find((row) => row.ref === ref) ?? null };
	minted += 1;
	const base = collectionGateway({ id: `month-test/${minted}`, handlers: { ...reads, ...writesOver(rows, verbs) } });
	return mappedCollection(base, { needs: MANIFEST.props.days.needs });
}

const host = document.getElementById("host");
const settled = async () => {
	for (let tick = 0; tick < 4; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

async function draw(notes, { verbs, fromMonday = true } = {}) {
	written.length = 0;
	render(null, host);
	minted += 1;
	render(h(Month, { isWeekStartingMonday: soloGateway(fromMonday, {}, `month-test/monday/${minted}`), days: gatewayOver(notes, verbs) }), host);
	await settled();
	return host;
}

const dayButtons = () => [...host.querySelectorAll(".hm-day")];
const runsShown = () => dayButtons().map((button) => button.querySelector(".hm-run")?.className ?? "");
const daysShown = () => dayButtons().map((button) => button.getAttribute("aria-label").split(",")[0]);
const dayLabelled = (label) => dayButtons().find((button) => button.getAttribute("aria-label") === label);
const roomStyle = () => host.querySelector(".habit-month").style;
const pxOf = (name) => Number.parseFloat(roomStyle().getPropertyValue(name));

const dayIn = (shift) => {
	const when = new Date(NOW.getFullYear(), NOW.getMonth(), 1 + shift);
	return isoOf(when);
};

const KEPT_RUN = [dayIn(7), dayIn(8), dayIn(9)];
const RUN_NOTES = KEPT_RUN.map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } }));

{
	await draw(RUN_NOTES);
	const drawn = dayButtons().length;
	check("a month is drawn as whole weeks", drawn % 7, 0);
	check("and never fewer than the days it holds", drawn >= new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate(), true);
	check("today is one of them", daysShown().includes(TODAY), true);
	check("the first day drawn starts a week", daysShown().indexOf(dayIn(0)) < 7, true);
}

{
	await draw(RUN_NOTES);
	check("only the kept days carry the band", runsShown().filter(Boolean).length, 3);
	const opens = daysShown().indexOf(KEPT_RUN[0]);
	check("the band opens on the first day of the run", runsShown()[opens].includes("is-run-start"), true);
	check("and it does not open again inside the run", runsShown()[opens + 1].includes("is-run-start"), false);
	check("it closes on the last day of the run", runsShown()[opens + 2].includes("is-run-end"), true);
	check("a kept day wears the accent ring", dayButtons()[opens].querySelector(".hm-ring").className, "hm-ring is-kept");
	check("and only a kept day carries the flame", dayButtons().filter((button) => button.querySelector(".hm-flame")).length, 3);
	check("today wears its own ring", dayLabelled(`${TODAY}, not kept`)?.querySelector(".hm-ring").className, "hm-ring is-today");
}

{
	await draw([dayIn(4), dayIn(5), dayIn(6), dayIn(7)].map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } })));
	const at = daysShown().indexOf(dayIn(4));
	const across = runsShown();
	const ends = across.map((held, index) => (held.includes("is-run-end") ? index : -1)).filter((index) => index >= at && index < at + 4);
	check("a run crossing the week's end closes at the edge", ends.some((index) => index % 7 === 6), true);
	check("and opens again on the next week's first day", across.filter((held, index) => index > at && index <= at + 3 && held.includes("is-run-start") && index % 7 === 0).length, 1);
}

{
	await draw(RUN_NOTES);
	check("every day of the month carries its own date", dayButtons().map((button) => button.querySelector(".hm-number").textContent).slice(0, 3).every((held) => /^\d+$/.test(held)), true);
	check("the weekdays are named once, above the grid", [...host.querySelectorAll(".hm-weekday")].map((each) => each.textContent), ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
	check("and a week may start on Sunday instead", await draw(RUN_NOTES, { fromMonday: false }).then(() => host.querySelector(".hm-weekday").textContent), "Sun");
	check("a value left behind as anything but a boolean is no answer at all", await draw(RUN_NOTES, { fromMonday: "false" }).then(() => host.querySelector(".hm-weekday").textContent), "Mon");
}

{
	await draw([]);
	check("an empty folder still draws the month", dayButtons().length % 7, 0);
	check("and says nothing about a habit it could not find", host.querySelector(".habit-empty") === null, true);
	check("nothing is kept", runsShown().filter(Boolean).length, 0);
}

{
	await draw([{ path: "Habits/2026-01-09.md", props: { created: `${TODAY}T09:00`, done: 1 } }]);
	check("a date property the folder happens to call `created` answers the day need", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420 } }]);
	check("a folder counting steps answers the same need, and any value counts", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	await draw(RUN_NOTES);
	dayLabelled(`${TODAY}, not kept`)?.click();
	await settled();
	check("pressing a day with no note creates one named for it", written, [{ verb: "create", name: TODAY, props: { done: 1 } }]);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	dayLabelled(`${TODAY}, kept`).click();
	await settled();
	check("pressing a kept day empties the property", written, [{ verb: "update", ref: `Habits/${TODAY}.md`, data: { props: { done: null } } }]);
}

{
	await draw(RUN_NOTES);
	const behind = dayButtons().filter((button) => daysShown()[dayButtons().indexOf(button)] <= TODAY);
	const ahead = dayButtons().filter((button) => daysShown()[dayButtons().indexOf(button)] > TODAY);
	check("a day still to come takes no press", ahead.every((button) => button.disabled), true);
	check("and says so on its face", ahead.every((button) => button.className.includes("is-ahead")), true);
	check("today and every day behind it takes one", behind.every((button) => !button.disabled), true);
	check("and none of them is dimmed for it", behind.every((button) => !button.className.includes("is-ahead")), true);
	check("there is a day of each kind to have judged", ahead.length > 0 && behind.length > 0, true);
}

{
	await draw(RUN_NOTES);
	host.querySelector('[aria-label="Previous month"]').click();
	await settled();
	const shown = daysShown();
	const outsideAndBehind = dayButtons().filter((button, at) => button.className.includes("is-outside") && shown[at] <= TODAY);
	check("a day of the month before still takes a press", dayButtons().filter((button, at) => shown[at] <= TODAY).every((button) => !button.disabled), true);
	check("and so does one only visiting from a neighbouring month", outsideAndBehind.length > 0 && outsideAndBehind.every((button) => !button.disabled), true);
	check("while a day this grid borrows from the month ahead is still ahead", dayButtons().filter((button, at) => shown[at] > TODAY).every((button) => button.disabled), true);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	host.querySelector('[aria-label="Next month"]').click();
	await settled();
	check("and no day of the month ahead takes one", dayButtons().every((button) => button.disabled), true);
}

{
	await draw(RUN_NOTES, { verbs: [] });
	check("a folder nobody may write refuses the press", dayButtons().every((button) => button.disabled), true);
}

const SHARES = { number: 0.56, numberGap: 0.2, seat: 1.16, gap: 0.16, weekday: 0.52 };
const ringWanted = ({ width, height }) => {
	const perWeek = SHARES.number + SHARES.numberGap + SHARES.seat + SHARES.gap;
	const tallest = height / (SHARES.weekday + SHARES.gap / 2 + 6 * perWeek);
	const widest = (width / 7) * 0.8;
	return Math.max(9, Math.min(46, tallest, widest));
};
const stackedHeight = () => pxOf("--hm-weekday") + pxOf("--hm-gap") / 2 + 6 * (pxOf("--hm-number") + pxOf("--hm-number-gap") + pxOf("--hm-seat") + pxOf("--hm-gap"));

for (const [name, box] of [
	["the tile it opens at", { width: TILE(6) - 16, height: TILE(6) - 60 }],
	["the smallest tile it allows", { width: TILE(4) - 16, height: TILE(4) - 60 }],
	["a tile far wider than it is tall", { width: TILE(12) - 16, height: TILE(4) - 60 }],
	["a tile far taller than it is wide", { width: TILE(4) - 16, height: TILE(10) - 60 }],
]) {
	room = box;
	await draw(RUN_NOTES);
	const ring = pxOf("--hm-ring");
	check(`${name}: six weeks of rings still fit its height`, stackedHeight() <= box.height + 0.5, true);
	check(`${name}: and seven of them fit its width`, ring <= box.width / 7, true);
	check(`${name}: the ring is the tighter of what the two sides allow`, Math.abs(ring - ringWanted(box)) < 0.01, true);
	check(`${name}: every space is a share of the ring`, [
		Math.abs(pxOf("--hm-number") - ring * SHARES.number) < 0.01,
		Math.abs(pxOf("--hm-number-gap") - ring * SHARES.numberGap) < 0.01,
		Math.abs(pxOf("--hm-seat") - ring * SHARES.seat) < 0.01,
		Math.abs(pxOf("--hm-gap") - ring * SHARES.gap) < 0.01,
		Math.abs(pxOf("--hm-weekday") - ring * SHARES.weekday) < 0.01,
	].every(Boolean), true);
}

{
	room = { width: TILE(6) - 16, height: TILE(6) - 60 };
	await draw(RUN_NOTES);
	const wide = pxOf("--hm-ring");
	room = { width: TILE(4) - 16, height: TILE(4) - 60 };
	await draw(RUN_NOTES);
	check("a smaller tile draws a smaller ring", pxOf("--hm-ring") < wide, true);
}

console.log(failed ? `\n${failed} failed` : "\nthe month holds");
process.exit(failed ? 1 : 0);

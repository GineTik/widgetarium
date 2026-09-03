import fs from "node:fs";
import { JSDOM } from "jsdom";
import { transform } from "sucrase";
import { buildMirror } from "./mirror.mjs";

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "SVGElement", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "MouseEvent", "Event", "MutationObserver"]) {
	globalThis[key] = key === "window" ? dom.window : dom.window[key];
}

const railFor = (cells) => cells * 54 + (cells - 1) * 12;
const WIDE = railFor(8);
const LEAST = railFor(3);
let railWidth = WIDE;
globalThis.ResizeObserver = class {
	constructor(take) {
		this.take = take;
	}
	observe() {
		this.take([{ contentRect: { width: railWidth } }]);
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
const emojis = await import("./.mjs-cache/emojis.mjs");
const { collectionGateway, soloGateway } = await import("./.mjs-cache/gateway/create.mjs");
const { mappedCollection } = await import("./.mjs-cache/gateway/mapped.mjs");

const WIDGET = "widgets/@habit/streak/widget.tsx";
const MANIFEST = JSON.parse(fs.readFileSync("widgets/@habit/streak/manifest.json", "utf8"));

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
	const modules = { widgetarium, "widgetarium/kit": kit, "widgetarium/kit/emojis": emojis, react, ...Object.fromEntries(libs) };
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
const { isoOf, shiftedBy } = libs.get("@habit/lib");
const Streak = run(WIDGET).default;

let failed = 0;
function check(what, got, wanted) {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`);
}

const TODAY = isoOf(new Date());
const TITLE = "Meditation";
const EMOJI = "smiling-face-with-halo";
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
	const base = collectionGateway({ id: `streak-test/${minted}`, handlers: { ...reads, ...writesOver(rows, verbs) } });
	return mappedCollection(base, { needs: MANIFEST.props.days.needs });
}

const host = document.getElementById("host");
const settled = async () => {
	for (let tick = 0; tick < 4; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

async function draw(notes, verbs, face = EMOJI) {
	written.length = 0;
	render(null, host);
	const title = soloGateway(TITLE, {}, "streak-test/title");
	const emoji = soloGateway(face, {}, `streak-test/emoji/${face}`);
	render(h(Streak, { days: gatewayOver(notes, verbs), title, emoji }), host);
	await settled();
	return host;
}

const dayButtons = () => [...host.querySelectorAll(".hs-day")];
const seatsShown = () => dayButtons().map((button) => button.querySelector(".hs-seat").className);
const namesShown = () => dayButtons().map((button) => button.querySelector(".hs-name").textContent);
const daysShown = () => dayButtons().map((button) => button.getAttribute("aria-label").split(",")[0]);
const dayLabelled = (label) => dayButtons().find((button) => button.getAttribute("aria-label") === label);

const KEPT_RUN = [shiftedBy(TODAY, -4), shiftedBy(TODAY, -3), shiftedBy(TODAY, -2), shiftedBy(TODAY, -1)];
const RUN_NOTES = KEPT_RUN.map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } }));

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	check("an eight-cell tile draws eleven days", dayButtons().length, 11);
	check("today sits in the middle, the odd column behind it", daysShown().indexOf(TODAY), 5);
	check("the name and the emoji stand over the rail", host.querySelector(".hs-title").textContent, TITLE);
	check("and the emoji is drawn, not typed", Boolean(host.querySelector(".hs-title .wg-kit-emoji")), true);
}

{
	railWidth = LEAST;
	await draw(RUN_NOTES);
	check("the narrowest tile it allows draws four", dayButtons().length, 4);
	check("and today is still one of them", daysShown().includes(TODAY), true);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	const seats = seatsShown();
	check("only the kept days carry the band", seats.filter((held) => held.includes("is-run")).length, 4);
	const opens = seats.indexOf("hs-seat is-run is-run-start");
	check("the band opens on the first day of the run", opens, daysShown().indexOf(KEPT_RUN[0]));
	check("and it does not open again inside the run", seats[opens + 1].includes("is-run-start"), false);
	check("it closes on the last day of the run", seats[opens + 3].includes("is-run-end"), true);
	check("a kept day wears the accent ring", dayButtons()[opens].querySelector(".hs-ring").className, "hs-ring is-kept");
	check("and only a kept day carries the flame", dayButtons().filter((button) => button.querySelector(".hs-flame")).length, 4);
	check("the day after the run is today, ringed and unbanded", dayButtons()[opens + 4].querySelector(".hs-ring").className, "hs-ring is-today");
	check("and today's seat carries no band", seats[opens + 4], "hs-seat");
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	check("the weekday shown is two letters", namesShown().every((name) => name.length === 2), true);
	check(
		"and every day also carries its own date, for the hover",
		dayButtons().map((button) => button.querySelector(".hs-date").textContent),
		daysShown().map((day) => String(Number(day.slice(8)))),
	);
	check("the header counts the run", host.querySelector(".hs-count").textContent, "4 days");
}

{
	railWidth = LEAST;
	await draw(RUN_NOTES);
	const edges = [...host.querySelectorAll(".hs-edge")].map((edge) => edge.className);
	check("a run reaching in from before the window paints the leading edge", edges[0], "hs-edge is-run");
	check("and nothing runs off the far end", edges[1], "hs-edge");
	check("the first day shown does not open a band it did not start", seatsShown()[0].includes("is-run-start"), false);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	check("one kept day reads in the singular", host.querySelector(".hs-count").textContent, "1 day");
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES, ["update", "create"], "no-such-face");
	check("an emoji nobody drew leaves the name standing alone", Boolean(host.querySelector(".hs-title .wg-kit-emoji")), false);
	check("and the name is still written", host.querySelector(".hs-title").textContent, TITLE);
}

{
	railWidth = WIDE;
	await draw([]);
	check("an empty folder still draws its days", dayButtons().length, 11);
	check("and the count goes cold", host.querySelector(".hs-count").className.includes("is-cold"), true);
}

{
	railWidth = WIDE;
	await draw([{ path: "Habits/2026-01-09.md", props: { created: `${TODAY}T09:00`, done: 1 } }]);
	check("a date property the folder happens to call `created` answers the day need", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	check("a folder with no date property at all falls back to the file name", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw([{ path: "Habits/2026-01-09.md", props: { created: new Date(`${TODAY}T09:00:00Z`), done: 1 } }]);
	check("a property holding a real Date still lands on its day", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420 } }]);
	check("a folder counting steps answers the same need, and any value counts", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420, mood: 4 } }]);
	check("and with two numbers to choose from, the aka list is what picks the right one", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	dayLabelled(`${TODAY}, not kept`).click();
	await settled();
	check("pressing a day with no note creates one named for it", written, [{ verb: "create", name: TODAY, props: { done: 1 } }]);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	const kept = KEPT_RUN[3];
	dayLabelled(`${kept}, kept`).click();
	await settled();
	check("pressing a kept day empties the property", written, [{ verb: "update", ref: `Habits/${kept}.md`, data: { props: { done: null } } }]);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES, []);
	check("a folder nobody may write refuses the press", dayButtons().every((button) => button.disabled), true);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	const pressable = (day) => !dayButtons()[daysShown().indexOf(day)].disabled;
	check("a day that has not happened yet cannot be pressed", pressable(shiftedBy(TODAY, 1)), false);
	check("nor any day after it", daysShown().filter((day) => day > TODAY).every((day) => !pressable(day)), true);
	check("today can", pressable(TODAY), true);
	check("and so can every day behind it", daysShown().filter((day) => day < TODAY).every(pressable), true);
}

{
	railWidth = WIDE;
	const AHEAD = shiftedBy(TODAY, 2);
	await draw([...RUN_NOTES, { path: `Habits/${AHEAD}.md`, props: { done: 1 } }]);
	const at = daysShown().indexOf(AHEAD);
	check("a day marked ahead of time still draws its flame", Boolean(dayButtons()[at].querySelector(".hs-flame")), true);
	check("and wears the same ring a kept day wears", dayButtons()[at].querySelector(".hs-ring").className, "hs-ring is-kept");
	check("and its seat carries the same band", seatsShown()[at], "hs-seat is-run is-run-start is-run-end");
	check("it is only the press that is refused", dayButtons()[at].disabled, true);
	dayButtons()[at].click();
	await settled();
	check("so pressing it writes nothing", written, []);
}

console.log(failed ? `\n${failed} failed` : "\nthe streak holds");
process.exit(failed ? 1 : 0);

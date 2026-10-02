import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import type { RecordRef } from "../packages/core/src/gateway/contract.ts";
import { declaredPropIn } from "./card-props.ts";
import { byId, foundAs } from "./dom-find.ts";
import { present } from "./page-dom.ts";
import { runWidgetSource } from "./run-widget-source.ts";
import { standIn } from "./stand-in.ts";

type MonthProps = Readonly<Record<string, unknown>>;
type DefaultLib = typeof import("@default/lib");

const dom = new JSDOM(`<!doctype html><body><div id="host"></div></body>`, { pretendToBeVisual: true });
Object.assign(globalThis, {
	window: dom.window,
	document: dom.window.document,
	Node: dom.window.Node,
	Element: dom.window.Element,
	HTMLElement: dom.window.HTMLElement,
	SVGElement: dom.window.SVGElement,
	getComputedStyle: dom.window.getComputedStyle,
	requestAnimationFrame: dom.window.requestAnimationFrame,
	cancelAnimationFrame: dom.window.cancelAnimationFrame,
	MouseEvent: dom.window.MouseEvent,
	Event: dom.window.Event,
	MutationObserver: dom.window.MutationObserver,
});

interface Room {
	readonly width: number;
	readonly height: number;
}

const TILE = (cells: number): number => cells * 54 + (cells - 1) * 12;
let room: Room = { width: TILE(6) - 16, height: TILE(6) - 60 };
class RoomObserver {
	constructor(readonly take: (entries: readonly { readonly contentRect: Room }[]) => void) {}
	observe(): void {
		this.take([{ contentRect: { ...room } }]);
	}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: RoomObserver });
Object.assign(dom.window, { ResizeObserver: RoomObserver });

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const { collectionGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { mapCollection } = await import("../packages/core/src/gateway/mapped.ts");
const { needsOf } = await import("../packages/core/src/gateway/props.js");

const WIDGET = "registry/@default/month/widget.tsx";
const { propsOfEveryShippedWidget } = await import("./widget-props.ts");
const DAYS_PROP = declaredPropIn((await propsOfEveryShippedWidget())["@default/month"]?.["getDays"], "month's getDays");

const libs = new Map<string, unknown>();

const isMonth = (value: unknown): value is FunctionComponent<MonthProps> => typeof value === "function";

function importing(): (name: string) => unknown {
	const modules: Readonly<Record<string, unknown>> = {
		widgetarium,
		"widgetarium/kit": kit,
		react,
		...Object.fromEntries(libs),
	};
	return (name) => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file: string): Record<string, unknown> {
	return runWidgetSource(file, importing(), h, Fragment);
}

libs.set("@default/lib", run("registry/@default/lib.ts"));
const { isoOf } = standIn<DefaultLib>(Object(libs.get("@default/lib")), ["isoOf"], "@default/lib");

function monthOf(file: string): FunctionComponent<MonthProps> {
	const drawn = run(file)["default"];
	if (!isMonth(drawn)) throw new Error(`${file} exports no component as its default`);
	return drawn;
}

const Month = monthOf(WIDGET);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const NOW = new Date();
const TODAY = isoOf(NOW);
interface HabitNote {
	readonly path: string;
	readonly props: Readonly<Record<string, unknown>>;
}

interface HeldRow {
	readonly ref: string;
	readonly value: HabitNote & { readonly name: string };
}

const written: { readonly verb: string; readonly [field: string]: unknown }[] = [];
let minted = 0;

function rowsOver(notes: readonly HabitNote[]): HeldRow[] {
	return notes.map((note) => ({
		ref: note.path,
		value: { ...note, name: note.path.slice(note.path.lastIndexOf("/") + 1).replace(/\.md$/, "") },
	}));
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

function commandOver(verb: string, verbs: readonly string[]) {
	const send = (input: unknown) => {
		const { id, ...rest } = isRecord(input) ? input : {};
		written.push(verb === "create" ? { verb, minted: typeof id === "string", ...rest } : { verb, ...rest });
		return { ok: true };
	};
	if (verbs.includes(verb)) return send;
	return Object.assign(send, { can: () => ({ can: false, reason: `${verb} is switched off` }) });
}

function gatewayOver(notes: readonly HabitNote[]): ReturnType<typeof mapCollection> {
	const rows = rowsOver(notes);
	const reads = {
		list: () => ({ rows, total: rows.length }),
		get: (ref: RecordRef) => rows.find((row) => row.ref === ref) ?? null,
	};
	minted += 1;
	const base = collectionGateway({ id: `month-test/${minted}`, handlers: reads });
	return mapCollection(base, { needs: needsOf(DAYS_PROP) });
}

const host = byId(document, "host");
const settled = async (): Promise<void> => {
	for (let tick = 0; tick < 4; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

interface DrawAsk {
	readonly verbs?: readonly string[];
	readonly fromMonday?: unknown;
}

async function draw(
	notes: readonly HabitNote[],
	{ verbs = ["update", "create"], fromMonday = true }: DrawAsk = {},
): Promise<HTMLElement> {
	written.length = 0;
	render(null, host);
	minted += 1;
	render(
		h(Month, {
			getIsWeekStartingMonday: soloGateway(fromMonday, {}, `month-test/monday/${minted}`),
			getDays: gatewayOver(notes),
			updateDay: commandOver("update", verbs),
			createDay: commandOver("create", verbs),
		}),
		host,
	);
	await settled();
	return host;
}

const dayButtons = (): HTMLButtonElement[] =>
	[...host.querySelectorAll(".hm-day")].filter(
		(node): node is HTMLButtonElement => node instanceof dom.window.HTMLButtonElement,
	);
const runsShown = (): string[] => dayButtons().map((button) => button.querySelector(".hm-run")?.className ?? "");
const daysShown = (): string[] =>
	dayButtons().map((button) => (button.getAttribute("aria-label") ?? "").split(",")[0] ?? "");
const dayLabelled = (label: string): HTMLButtonElement | undefined =>
	dayButtons().find((button) => button.getAttribute("aria-label") === label);
const roomStyle = (): CSSStyleDeclaration => foundAs(host, ".habit-month", dom.window.HTMLElement).style;
const pxOf = (name: string): number => Number.parseFloat(roomStyle().getPropertyValue(name));
const runAt = (at: number): string => runsShown()[at] ?? "";
const weekdayShown = (): string | null | undefined => host.querySelector(".hm-weekday")?.textContent;

const dayIn = (shift: number): string => {
	const when = new Date(NOW.getFullYear(), NOW.getMonth(), 1 + shift);
	return isoOf(when);
};

const KEPT_RUN = [dayIn(7), dayIn(8), dayIn(9)];
const RUN_NOTES = KEPT_RUN.map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } }));

{
	await draw(RUN_NOTES);
	const drawn = dayButtons().length;
	check("a month is always drawn as six whole weeks", drawn, 42);
	check(
		"and never fewer than the days it holds",
		drawn >= new Date(NOW.getFullYear(), NOW.getMonth() + 1, 0).getDate(),
		true,
	);
	check("today is one of them", daysShown().includes(TODAY), true);
	check("the first day drawn starts a week", daysShown().indexOf(dayIn(0)) < 7, true);
}

{
	await draw(RUN_NOTES);
	check("only the kept days carry the band", runsShown().filter(Boolean).length, 3);
	const opens = daysShown().indexOf(KEPT_RUN[0] ?? "");
	check("the band opens on the first day of the run", runAt(opens).includes("is-run-start"), true);
	check("and it does not open again inside the run", runAt(opens + 1).includes("is-run-start"), false);
	check("it closes on the last day of the run", runAt(opens + 2).includes("is-run-end"), true);
	check(
		"a kept day wears the accent ring",
		dayButtons()[opens]?.querySelector(".hm-ring")?.className,
		"hm-ring is-kept",
	);
	check(
		"and only a kept day carries the flame",
		dayButtons().filter((button) => button.querySelector(".hm-flame")).length,
		3,
	);
	check(
		"today wears its own ring",
		dayLabelled(`${TODAY}, not kept`)?.querySelector(".hm-ring")?.className,
		"hm-ring is-today",
	);
}

{
	await draw([dayIn(4), dayIn(5), dayIn(6), dayIn(7)].map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } })));
	const at = daysShown().indexOf(dayIn(4));
	const across = runsShown();
	const ends = across
		.map((held, index) => (held.includes("is-run-end") ? index : -1))
		.filter((index) => index >= at && index < at + 4);
	check(
		"a run crossing the week's end closes at the edge",
		ends.some((index) => index % 7 === 6),
		true,
	);
	check(
		"and opens again on the next week's first day",
		across.filter((held, index) => index > at && index <= at + 3 && held.includes("is-run-start") && index % 7 === 0)
			.length,
		1,
	);
}

{
	await draw(RUN_NOTES);
	check(
		"every day of the month carries its own date",
		dayButtons()
			.map((button) => button.querySelector(".hm-number")?.textContent ?? "")
			.slice(0, 3)
			.every((held) => /^\d+$/.test(held)),
		true,
	);
	check(
		"the weekdays are named once, above the grid",
		[...host.querySelectorAll(".hm-weekday")].map((each) => each.textContent),
		["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
	);
	check(
		"and a week may start on Sunday instead",
		await draw(RUN_NOTES, { fromMonday: false }).then(weekdayShown),
		"Sun",
	);
	check(
		"a value left behind as anything but a boolean is no answer at all",
		await draw(RUN_NOTES, { fromMonday: "false" }).then(weekdayShown),
		"Mon",
	);
}

{
	await draw([]);
	check("an empty folder still draws the month", dayButtons().length % 7, 0);
	check("and says nothing about a habit it could not find", host.querySelector(".habit-empty") === null, true);
	check("nothing is kept", runsShown().filter(Boolean).length, 0);
}

{
	await draw([{ path: "Habits/2026-01-09.md", props: { created: `${TODAY}T09:00`, done: 1 } }]);
	check(
		"a date property the folder happens to call `created` answers the day need",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420 } }]);
	check(
		"a folder counting steps answers the same need, and any value counts",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	await draw(RUN_NOTES);
	dayLabelled(`${TODAY}, not kept`)?.click();
	await settled();
	check("pressing a day with no note creates one named for it", written, [
		{ verb: "create", minted: true, name: TODAY, props: { done: 1 } },
	]);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	present(dayLabelled(`${TODAY}, kept`), "today, kept").click();
	await settled();
	check("pressing a kept day empties the property", written, [
		{ verb: "update", done: null, ref: `Habits/${TODAY}.md` },
	]);
}

{
	await draw(RUN_NOTES);
	const behind = dayButtons().filter((button) => (daysShown()[dayButtons().indexOf(button)] ?? "") <= TODAY);
	const ahead = dayButtons().filter((button) => (daysShown()[dayButtons().indexOf(button)] ?? "") > TODAY);
	check(
		"a day still to come takes no press",
		ahead.every((button) => button.disabled),
		true,
	);
	check(
		"and says so on its face",
		ahead.every((button) => button.className.includes("is-ahead")),
		true,
	);
	check(
		"today and every day behind it takes one",
		behind.every((button) => !button.disabled),
		true,
	);
	check(
		"and none of them is dimmed for it",
		behind.every((button) => !button.className.includes("is-ahead")),
		true,
	);
	check("there is a day of each kind to have judged", ahead.length > 0 && behind.length > 0, true);
}

{
	await draw(RUN_NOTES);
	foundAs(host, '[aria-label="Previous month"]', dom.window.HTMLElement).click();
	await settled();
	const shown = daysShown();
	const outsideAndBehind = dayButtons().filter(
		(button, at) => button.className.includes("is-outside") && (shown[at] ?? "") <= TODAY,
	);
	check(
		"a day of the month before still takes a press",
		dayButtons()
			.filter((_, at) => (shown[at] ?? "") <= TODAY)
			.every((button) => !button.disabled),
		true,
	);
	check(
		"and so does one only visiting from a neighbouring month",
		outsideAndBehind.length > 0 && outsideAndBehind.every((button) => !button.disabled),
		true,
	);
	check(
		"while a day this grid borrows from the month ahead is still ahead",
		dayButtons()
			.filter((_, at) => (shown[at] ?? "") > TODAY)
			.every((button) => button.disabled),
		true,
	);
}

{
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	foundAs(host, '[aria-label="Next month"]', dom.window.HTMLElement).click();
	await settled();
	check(
		"and no day of the month ahead takes one",
		dayButtons().every((button) => button.disabled),
		true,
	);
}

{
	await draw(RUN_NOTES, { verbs: [] });
	check(
		"a folder nobody may write refuses the press",
		dayButtons().every((button) => button.disabled),
		true,
	);
}

const SHARES = { number: 0.56, numberGap: 0.12, seat: 1.16, gap: 0.36, weekday: 0.52, weekdayGap: 0.5 };
const ringWanted = ({ width, height }: Room): number => {
	const perWeek = SHARES.number + SHARES.numberGap + SHARES.seat;
	const tallest = height / (SHARES.weekday + SHARES.weekdayGap + 6 * perWeek + 5 * SHARES.gap);
	const widest = (width / 7) * 0.8 - 2;
	return Math.max(9, Math.min(46, tallest, widest));
};
const stackedHeight = (): number =>
	pxOf("--hm-weekday") +
	pxOf("--hm-weekday-gap") +
	6 * (pxOf("--hm-number") + pxOf("--hm-number-gap") + pxOf("--hm-seat")) +
	5 * pxOf("--hm-gap");

const ROOMS: readonly (readonly [string, Room])[] = [
	["the tile it opens at", { width: TILE(6) - 16, height: TILE(6) - 60 }],
	["the smallest tile it allows", { width: TILE(4) - 16, height: TILE(4) - 60 }],
	["a tile far wider than it is tall", { width: TILE(12) - 16, height: TILE(4) - 60 }],
	["a tile far taller than it is wide", { width: TILE(4) - 16, height: TILE(10) - 60 }],
];
for (const [name, box] of ROOMS) {
	room = box;
	await draw(RUN_NOTES);
	const ring = pxOf("--hm-ring");
	check(`${name}: six weeks of rings still fit its height`, stackedHeight() <= box.height + 0.5, true);
	check(`${name}: and seven of them fit its width`, ring <= box.width / 7, true);
	check(`${name}: the ring is the tighter of what the two sides allow`, Math.abs(ring - ringWanted(box)) < 0.01, true);
	check(
		`${name}: every space is a share of the ring`,
		[
			Math.abs(pxOf("--hm-number") - ring * SHARES.number) < 0.01,
			Math.abs(pxOf("--hm-number-gap") - ring * SHARES.numberGap) < 0.01,
			Math.abs(pxOf("--hm-seat") - ring * SHARES.seat) < 0.01,
			Math.abs(pxOf("--hm-gap") - ring * SHARES.gap) < 0.01,
			Math.abs(pxOf("--hm-weekday") - ring * SHARES.weekday) < 0.01,
			Math.abs(pxOf("--hm-weekday-gap") - ring * SHARES.weekdayGap) < 0.01,
		].every(Boolean),
		true,
	);
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

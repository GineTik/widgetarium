import { JSDOM } from "jsdom";
import type { FunctionComponent } from "react";
import type * as DefaultLib from "../registry/@default/lib.ts";
import { byId } from "./dom-find.ts";
import { runWidgetSource } from "./run-widget-source.ts";

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

const railFor = (cells: number): number => cells * 54 + (cells - 1) * 12;
const WIDE = railFor(8);
const LEAST = railFor(3);
let railWidth = WIDE;
type MeasuredRail = (entries: { readonly contentRect: { readonly width: number } }[]) => void;

class RailWidthObserver {
	private readonly take: MeasuredRail;
	constructor(take: MeasuredRail) {
		this.take = take;
	}
	observe(): void {
		this.take([{ contentRect: { width: railWidth } }]);
	}
	disconnect(): void {}
}
Object.assign(globalThis, { ResizeObserver: RailWidthObserver });
Object.assign(dom.window, { ResizeObserver: RailWidthObserver });

const react = await import("react");
const { createElement: h, Fragment } = react;
const { render } = await import("../packages/core/src/engine/render.js");
const { ENGINE_SCOPE } = await import("../packages/core/src/registry.js");
const { api: widgetarium } = ENGINE_SCOPE;
const kit = await import("../packages/kit/src/index.ts");
const emojis = await import("../packages/kit/src/emojis/emoji.tsx");
const { collectionGateway, soloGateway } = await import("../packages/core/src/gateway/create.ts");
const { mapCollection } = await import("../packages/core/src/gateway/mapped.ts");
const { needsOf } = await import("../packages/core/src/gateway/props.js");

const WIDGET = "registry/@default/streak/widget.tsx";
const { propsOfEveryShippedWidget } = await import("./widget-props.ts");
const DECLARED = (await propsOfEveryShippedWidget())["@default/streak"];

const libs = new Map<string, unknown>();

interface StreakProps {
	readonly getDays: unknown;
	readonly updateDay: unknown;
	readonly createDay: unknown;
	readonly getTitle: unknown;
	readonly getEmoji: unknown;
}

const isDefaultLib = (value: unknown): value is typeof DefaultLib =>
	typeof value === "object" &&
	value !== null &&
	"isoOf" in value &&
	typeof value.isoOf === "function" &&
	"shiftBy" in value &&
	typeof value.shiftBy === "function";

const isStreak = (value: unknown): value is FunctionComponent<StreakProps> => typeof value === "function";

function streakOf(value: unknown): FunctionComponent<StreakProps> {
	if (!isStreak(value)) throw new Error(`${WIDGET} exports no component`);
	return value;
}

function importing(): (name: string) => unknown {
	const modules: Readonly<Record<string, unknown>> = {
		widgetarium,
		"widgetarium/kit": kit,
		"widgetarium/kit/emojis": emojis,
		react,
		...Object.fromEntries(libs),
	};
	return (name: string): unknown => {
		const found = modules[name];
		if (!found) throw new Error(`cannot import "${name}"`);
		return found;
	};
}

function run(file: string): Readonly<Record<string, unknown>> {
	return runWidgetSource(file, importing(), h, Fragment);
}

libs.set("@default/lib", run("registry/@default/lib.ts"));
const defaultLib = libs.get("@default/lib");
if (!isDefaultLib(defaultLib)) throw new Error("@default/lib lacks isoOf or shiftBy");
const { isoOf, shiftBy } = defaultLib;
const Streak = streakOf(run(WIDGET)["default"]);

let failed = 0;
function check(what: string, got: unknown, wanted: unknown): void {
	const ok = JSON.stringify(got) === JSON.stringify(wanted);
	if (!ok) failed += 1;
	console.log(
		`${ok ? "ok  " : "FAIL"} ${what}${ok ? "" : ` — got ${JSON.stringify(got)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const TODAY = isoOf(new Date());
const TITLE = "Meditation";
const EMOJI = "smiling-face-with-halo";
const written: Readonly<Record<string, unknown>>[] = [];
let minted = 0;

interface HabitNote {
	readonly path: string;
	readonly props: Readonly<Record<string, unknown>>;
}

interface HabitRow {
	readonly ref: string;
	readonly value: HabitNote & { readonly name: string };
}

function rowsOver(notes: readonly HabitNote[]): HabitRow[] {
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

function gatewayOver(notes: readonly HabitNote[]) {
	const rows = rowsOver(notes);
	const reads = {
		list: () => ({ rows, total: rows.length }),
		get: (ref: unknown) => rows.find((row) => row.ref === ref) ?? null,
	};
	minted += 1;
	const base = collectionGateway({ id: `streak-test/${minted}`, handlers: reads });
	return mapCollection(base, { needs: needsOf(DECLARED?.["getDays"]) });
}

const host = byId(document, "host");
const settled = async (): Promise<void> => {
	for (let tick = 0; tick < 4; tick += 1) await new Promise((done) => setTimeout(done, 0));
};

async function draw(
	notes: readonly HabitNote[],
	verbs: readonly string[] = ["update", "create"],
	face = EMOJI,
): Promise<HTMLElement> {
	written.length = 0;
	render(null, host);
	render(
		h(Streak, {
			getDays: gatewayOver(notes),
			updateDay: commandOver("update", verbs),
			createDay: commandOver("create", verbs),
			getTitle: soloGateway(TITLE, {}, "streak-test/title"),
			getEmoji: soloGateway(face, {}, `streak-test/emoji/${face}`),
		}),
		host,
	);
	await settled();
	return host;
}

const classIn = (root: ParentNode | undefined, selector: string): string | undefined =>
	root?.querySelector(selector)?.className;
const textIn = (root: ParentNode | undefined, selector: string): string | null | undefined =>
	root?.querySelector(selector)?.textContent;
const dayButtons = (): HTMLButtonElement[] => [...host.querySelectorAll<HTMLButtonElement>(".hs-day")];
const seatsShown = (): string[] => dayButtons().map((button) => classIn(button, ".hs-seat") ?? "");
const namesShown = (): string[] => dayButtons().map((button) => textIn(button, ".hs-name") ?? "");
const daysShown = (): string[] =>
	dayButtons().map((button) => (button.getAttribute("aria-label") ?? "").split(",")[0] ?? "");
const dayLabelled = (label: string): HTMLButtonElement | undefined =>
	dayButtons().find((button) => button.getAttribute("aria-label") === label);

const KEPT_RUN = [shiftBy(TODAY, -4), shiftBy(TODAY, -3), shiftBy(TODAY, -2), shiftBy(TODAY, -1)];
const RUN_NOTES = KEPT_RUN.map((day) => ({ path: `Habits/${day}.md`, props: { done: 1 } }));

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	check("an eight-cell tile draws eleven days", dayButtons().length, 11);
	check("today sits in the middle, the odd column behind it", daysShown().indexOf(TODAY), 5);
	check("the name and the emoji stand over the rail", textIn(host, ".hs-title"), TITLE);
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
	check("the band opens on the first day of the run", opens, daysShown().indexOf(KEPT_RUN[0] ?? ""));
	check("and it does not open again inside the run", seats[opens + 1]?.includes("is-run-start"), false);
	check("it closes on the last day of the run", seats[opens + 3]?.includes("is-run-end"), true);
	check("a kept day wears the accent ring", classIn(dayButtons()[opens], ".hs-ring"), "hs-ring is-kept");
	check(
		"and only a kept day carries the flame",
		dayButtons().filter((button) => button.querySelector(".hs-flame")).length,
		4,
	);
	check(
		"the day after the run is today, ringed and unbanded",
		classIn(dayButtons()[opens + 4], ".hs-ring"),
		"hs-ring is-today",
	);
	check("and today's seat carries no band", seats[opens + 4], "hs-seat");
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	check(
		"the weekday shown is two letters",
		namesShown().every((name) => name.length === 2),
		true,
	);
	check(
		"and every day also carries its own date, for the hover",
		dayButtons().map((button) => textIn(button, ".hs-date")),
		daysShown().map((day) => String(Number(day.slice(8)))),
	);
	check("the header counts the run", textIn(host, ".hs-count"), "4 days");
}

{
	railWidth = LEAST;
	await draw(RUN_NOTES);
	const edges = [...host.querySelectorAll(".hs-edge")].map((edge) => edge.className);
	check("a run reaching in from before the window paints the leading edge", edges[0], "hs-edge is-run");
	check("and nothing runs off the far end", edges[1], "hs-edge");
	check("the first day shown does not open a band it did not start", seatsShown()[0]?.includes("is-run-start"), false);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	check("one kept day reads in the singular", textIn(host, ".hs-count"), "1 day");
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES, ["update", "create"], "no-such-face");
	check(
		"an emoji nobody drew leaves the name standing alone",
		Boolean(host.querySelector(".hs-title .wg-kit-emoji")),
		false,
	);
	check("and the name is still written", textIn(host, ".hs-title"), TITLE);
}

{
	railWidth = WIDE;
	await draw([]);
	check("an empty folder still draws its days", dayButtons().length, 11);
	check("and the count goes cold", classIn(host, ".hs-count")?.includes("is-cold"), true);
}

{
	railWidth = WIDE;
	await draw([{ path: "Habits/2026-01-09.md", props: { created: `${TODAY}T09:00`, done: 1 } }]);
	check(
		"a date property the folder happens to call `created` answers the day need",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { done: 1 } }]);
	check(
		"a folder with no date property at all falls back to the file name",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	railWidth = WIDE;
	await draw([{ path: "Habits/2026-01-09.md", props: { created: new Date(`${TODAY}T09:00:00Z`), done: 1 } }]);
	check("a property holding a real Date still lands on its day", Boolean(dayLabelled(`${TODAY}, kept`)), true);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420 } }]);
	check(
		"a folder counting steps answers the same need, and any value counts",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	railWidth = WIDE;
	await draw([{ path: `Habits/${TODAY}.md`, props: { steps: 8420, mood: 4 } }]);
	check(
		"and with two numbers to choose from, the aka list is what picks the right one",
		Boolean(dayLabelled(`${TODAY}, kept`)),
		true,
	);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	dayLabelled(`${TODAY}, not kept`)?.click();
	await settled();
	check("pressing a day with no note creates one named for it", written, [
		{ verb: "create", minted: true, name: TODAY, props: { done: 1 } },
	]);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	const kept = KEPT_RUN[3] ?? "";
	dayLabelled(`${kept}, kept`)?.click();
	await settled();
	check("pressing a kept day empties the property", written, [
		{ verb: "update", done: null, ref: `Habits/${kept}.md` },
	]);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES, []);
	check(
		"a folder nobody may write refuses the press",
		dayButtons().every((button) => button.disabled),
		true,
	);
}

{
	railWidth = WIDE;
	await draw(RUN_NOTES);
	const pressable = (day: string): boolean => !dayButtons()[daysShown().indexOf(day)]?.disabled;
	check("a day that has not happened yet cannot be pressed", pressable(shiftBy(TODAY, 1)), false);
	check(
		"nor any day after it",
		daysShown()
			.filter((day) => day > TODAY)
			.every((day) => !pressable(day)),
		true,
	);
	check("today can", pressable(TODAY), true);
	check(
		"and so can every day behind it",
		daysShown()
			.filter((day) => day < TODAY)
			.every(pressable),
		true,
	);
}

{
	railWidth = WIDE;
	const AHEAD = shiftBy(TODAY, 2);
	await draw([...RUN_NOTES, { path: `Habits/${AHEAD}.md`, props: { done: 1 } }]);
	const at = daysShown().indexOf(AHEAD);
	check(
		"a day marked ahead of time still draws its flame",
		Boolean(dayButtons()[at]?.querySelector(".hs-flame")),
		true,
	);
	check("and wears the same ring a kept day wears", classIn(dayButtons()[at], ".hs-ring"), "hs-ring is-kept");
	check("and its seat carries the same band", seatsShown()[at], "hs-seat is-run is-run-start is-run-end");
	check("it is only the press that is refused", dayButtons()[at]?.disabled, true);
	dayButtons()[at]?.click();
	await settled();
	check("so pressing it writes nothing", written, []);
}

console.log(failed ? `\n${failed} failed` : "\nthe streak holds");
process.exit(failed ? 1 : 0);

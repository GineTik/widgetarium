import { useEffect } from "react";
import type { RefObject } from "react";
import { isClear } from "./color-math.js";
import { MEASURED_DIR, measuredPathOf, PRESET_TOKENS } from "./surface-contract.js";
import { byPath } from "./tree.js";
import type { ModuleAdapter } from "./engine/modules.js";
import { contentHash } from "./engine/content-hash.js";

type MeasureAdapter = Pick<ModuleAdapter, "exists" | "mkdir" | "write">;

export interface MeasureApp {
	readonly vault?: { readonly adapter?: MeasureAdapter | null } | null;
	loadLocalStorage?(key: string): unknown;
	saveLocalStorage?(key: string, data: unknown): void;
}

export interface MeasureHost {
	readonly app?: MeasureApp | null;
	readonly notePath?: string | null;
}

type SolidKind = "container" | "mark" | "control" | "label";

interface MeasuredFill {
	readonly kind: SolidKind;
	readonly color: string;
}

interface MeasuredTile {
	readonly depth: number;
	readonly fills: readonly MeasuredFill[];
	readonly texts: readonly string[];
}

interface Extent {
	readonly w: number;
	readonly h: number;
}

export interface BoardMeasure {
	readonly theme: "dark" | "light";
	readonly page: string;
	readonly presets: Readonly<Record<string, string>>;
	readonly tiles: Readonly<Record<string, MeasuredTile>>;
	readonly extents: Readonly<Record<string, Extent>>;
}

type Paint = { readonly kind: "media" } | MeasuredFill;

type PaintedMap = ReadonlyMap<Element, Paint>;

// TRADE-OFF: measured after every settled render into the plugin's own folder, not on request, because the agent reading it cannot ask the plugin anything; an unchanged measurement writes nothing
export function useMeasuresSurfaces(
	pageRef: RefObject<HTMLElement | null>,
	host: MeasureHost | null | undefined,
	regionsRef: RefObject<ReadonlyMap<unknown, HTMLElement>>,
): void {
	useEffect(() => {
		const app = host?.app;
		const adapter = app?.vault?.adapter;
		const note = host?.notePath;
		if (!app || !adapter || !note) return undefined;
		const measure = (): void =>
			measureInto(app, adapter, note, pageRef.current, [...(regionsRef.current?.values() ?? [])]);
		const timer = window.setTimeout(measure, SETTLE_MS);
		return () => window.clearTimeout(timer);
	});
}

export function measureTile(body: Element): MeasuredTile {
	const elements = [...body.querySelectorAll("*")].slice(0, MAX_ELEMENTS_PER_TILE);
	const painted = paintedIn(body, elements);
	return { ...containersIn(body, painted), texts: textsOnGround(body, elements, painted) };
}

const INTERACTIVE =
	"button, a[href], input, select, textarea, [role='button'], [role='tab'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], [role='menuitem']";
const MEDIA = "img, svg, canvas, video";
const SETTLE_MS = 700;
const MAX_ELEMENTS_PER_TILE = 4000;
const WRITTEN_HASHES_KEY = "widgetarium-measured-hashes";
const writtenHashesByApp = new WeakMap<MeasureApp, Map<string, string>>();
const MEDIA_PAINT = Symbol("media");

export async function writeMeasured(
	app: MeasureApp,
	adapter: MeasureAdapter,
	path: string,
	measured: BoardMeasure,
): Promise<void> {
	const text = JSON.stringify(measured, null, "\t");
	const hash = contentHash(text);
	const written = writtenHashesOf(app);
	if (written.get(path) === hash && (await adapter.exists(path))) return;
	written.set(path, hash);
	if (!(await adapter.exists(MEASURED_DIR))) await adapter.mkdir(MEASURED_DIR);
	await adapter.write(path, text);
	app.saveLocalStorage?.(WRITTEN_HASHES_KEY, Object.fromEntries(written));
}

function measureInto(
	app: MeasureApp,
	adapter: MeasureAdapter,
	note: string,
	page: HTMLElement | null,
	regions: readonly HTMLElement[],
): void {
	if (!page) return;
	writeMeasured(app, adapter, measuredPathOf(note), measureBoard(page, regions)).catch((failure: unknown) =>
		console.error("[widgetarium] the board's surfaces were not measured", failure),
	);
}

function writtenHashesOf(app: MeasureApp): Map<string, string> {
	const held = writtenHashesByApp.get(app);
	if (held) return held;
	const stored = new Map(
		Object.entries(storedObjectOf(app.loadLocalStorage?.(WRITTEN_HASHES_KEY))).flatMap(([path, hash]) =>
			typeof hash === "string" ? [[path, hash] as const] : [],
		),
	);
	writtenHashesByApp.set(app, stored);
	return stored;
}

function storedObjectOf(stored: unknown): Readonly<Record<string, unknown>> {
	return typeof stored === "object" && stored !== null ? Object.fromEntries(Object.entries(stored)) : {};
}

function tilesIn(regions: readonly HTMLElement[]): Record<string, MeasuredTile> {
	return Object.fromEntries(
		regions
			.flatMap((region) => [...region.querySelectorAll<HTMLElement>(".wg-tree-cell[data-cell]")])
			.flatMap((cell) => {
				const id = cell.dataset["cell"];
				const body = cell.querySelector(".wg-tile-body");
				return id === undefined || body === null ? [] : [[id, measureTile(body)] as const];
			}),
	);
}

function containersIn(body: Element, painted: PaintedMap): Pick<MeasuredTile, "depth" | "fills"> {
	const fills = new Map<string, MeasuredFill>();
	let depth = 0;
	for (const [element, paint] of painted) {
		const above = paintedAbove(element, body, painted);
		if (paint.kind === "container") depth = Math.max(depth, above.filter((one) => one.kind === "container").length + 1);
		if (above.length === 0 && (paint.kind === "container" || paint.kind === "mark"))
			fills.set(`${paint.kind} ${paint.color}`, { kind: paint.kind, color: paint.color });
	}
	return { depth, fills: [...fills.values()] };
}

function textsOnGround(body: Element, elements: readonly Element[], painted: PaintedMap): string[] {
	const colours = elements
		.filter((element) => hasOwnText(element) && !painted.has(element))
		.filter((element) => paintedAbove(element, body, painted).length === 0)
		.map((element) => getComputedStyle(element).color);
	return [...new Set(colours)];
}

function pageColourOf(page: HTMLElement): string {
	for (let at: HTMLElement | null = page; at; at = at.parentElement) {
		const background = getComputedStyle(at).backgroundColor;
		if (!isClear(background)) return background;
	}
	return getComputedStyle(document.body).backgroundColor;
}

function presetsOf(page: HTMLElement): Record<string, string> {
	const probe = document.createElement("div");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	page.appendChild(probe);
	const read = (token: string): string => {
		probe.style.backgroundColor = `var(${token})`;
		return getComputedStyle(probe).backgroundColor;
	};
	const presets = Object.fromEntries(Object.entries(PRESET_TOKENS).map(([name, token]) => [name, read(token)]));
	probe.remove();
	return presets;
}

function paintedIn(body: Element, elements: readonly Element[]): PaintedMap {
	const painted = new Map<Element, Paint>();
	for (const element of elements) {
		const color = paintOf(element);
		if (color === MEDIA_PAINT) painted.set(element, { kind: "media" });
		else if (color !== null) painted.set(element, { kind: kindOf(element, body), color });
	}
	return painted;
}

function paintedAbove(element: Element, body: Element, painted: PaintedMap): Paint[] {
	const found: Paint[] = [];
	for (let at = element.parentElement; at && at !== body; at = at.parentElement) {
		const paint = painted.get(at);
		if (paint) found.push(paint);
	}
	return found;
}

function paintOf(element: Element): string | typeof MEDIA_PAINT | null {
	const own = getComputedStyle(element);
	if (own.backgroundImage !== "none") return MEDIA_PAINT;
	if (!isClear(own.backgroundColor)) return own.backgroundColor;
	const before = getComputedStyle(element, "::before");
	if (before.content === "none" || isClear(before.backgroundColor)) return null;
	return before.backgroundColor;
}

function kindOf(element: Element, body: Element): SolidKind {
	const count = contentCount(element);
	const control = element.closest(INTERACTIVE);
	if (control && body.contains(control)) return count > 0 ? "control" : "mark";
	if (count >= 2) return "container";
	return count === 1 ? "label" : "mark";
}

function contentCount(element: Element): number {
	const texts = [element, ...element.querySelectorAll("*")].filter(hasOwnText).length;
	const media = [...element.querySelectorAll(MEDIA)].filter((one) => !one.parentElement?.closest("svg")).length;
	return texts + media;
}

function hasOwnText(element: Element): boolean {
	return [...element.childNodes].some(
		(node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "",
	);
}

function extentsIn(regions: readonly HTMLElement[]): Record<string, Extent> {
	return Object.fromEntries(regions.flatMap((region) => Object.entries(byPath(region, extentOf))));
}

function extentOf(node: HTMLElement): Extent {
	const box = node.getBoundingClientRect();
	return { w: Math.round(box.width), h: Math.round(box.height) };
}

function measureBoard(page: HTMLElement, regions: readonly HTMLElement[]): BoardMeasure {
	return {
		theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
		page: pageColourOf(page),
		presets: presetsOf(page),
		tiles: tilesIn(regions),
		extents: extentsIn(regions),
	};
}

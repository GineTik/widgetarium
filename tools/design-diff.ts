import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited, type PageSize } from "./chrome-ask.ts";
import { alphaOf, colorless, distanceOf, unreadable } from "./color-distance.ts";

export const TIGHT_DELTA = 2;
export const LOOSE_DELTA = 5;
export const SLOP = 1;

export interface AbsentPart {
	readonly present: false;
}

export interface DrawnPart {
	readonly present: true;
	readonly shared: boolean;
	readonly reads: boolean;
	readonly width: number;
	readonly height: number;
	readonly radii: readonly number[];
	readonly color: string;
	readonly background: string;
	readonly borderColor: string;
	readonly borderWidth: number;
	readonly fontFamily: string;
	readonly fontSize: number;
	readonly fontWeight: number;
	readonly letterSpacing: number;
	readonly gap: number;
	readonly padding: readonly number[];
	readonly shadow: string | null;
	readonly backdrop: string | null;
	readonly tile: readonly number[] | null;
}

export type MeasuredPart = AbsentPart | DrawnPart;

export type MeasuredParts = Readonly<Record<string, MeasuredPart>>;

export type Selectors = Readonly<Record<string, string>>;

export type FindingLevel = "error" | "warn" | "note";

export interface Finding {
	readonly part: string;
	readonly what: string;
	readonly design: string | number;
	readonly impl: string | number;
	readonly level: FindingLevel;
}

export interface SideAsk {
	readonly size?: PageSize | undefined;
	readonly props?: Readonly<Record<string, unknown>> | null | undefined;
}

export interface MeasureOptions {
	readonly size?: PageSize | undefined;
	readonly within?: number;
}

type Shown = string | number;

const ABSENT: AbsentPart = { present: false };

export async function measuredSide(
	at: string,
	selectors: Selectors,
	asked: SideAsk,
	work: string,
): Promise<MeasuredParts> {
	const file = at.endsWith(".dc.html") ? artboardFor(at, asked.props, work) : path.resolve(at);
	return measured(file, selectors, { size: asked.size });
}

export async function measured(file: string, selectors: Selectors, opts: MeasureOptions = {}): Promise<MeasuredParts> {
	const { size = [900, 560], within = 6000 } = opts;
	const page = await paged(file, "design-diff", { size });
	try {
		await settled(page.ask, file, within);
		return measuredPartsOf(await page.ask(`(${PAGE_SCRIPT})(${JSON.stringify(selectors)})`), file);
	} finally {
		page.close();
	}
}

export function reported(
	parts: Readonly<Record<string, unknown>>,
	design: MeasuredParts,
	impl: MeasuredParts,
): Finding[] {
	return Object.keys(parts).flatMap((part) => compared(part, design[part] ?? ABSENT, impl[part] ?? ABSENT));
}

export function compared(part: string, design: MeasuredPart, impl: MeasuredPart): Finding[] {
	if (!design.present && !impl.present) return [mismatch(part, "pairing", "absent", "absent")];
	if (!design.present) return [mismatch(part, "presence", "absent", "drawn")];
	if (!impl.present) return [mismatch(part, "presence", "drawn", "absent")];
	return [
		...sharedGaps(part, design, impl),
		...shapeGaps(part, design, impl),
		...paintGaps(part, design, impl),
		...sizeGaps(part, design, impl),
		...blurGaps(part, design, impl),
		...shadowGaps(part, design, impl),
	];
}

export function shapeOf(radii: readonly number[], width: number, height: number): string {
	const radius = Math.min(...radii);
	const spread = Math.max(...radii) - radius;
	if (spread > SLOP) return `mixed radii ${radii.map(round).join("/")}`;
	if (radius >= Math.min(width, height) / 2 - SLOP && Math.abs(width - height) <= SLOP) return "circle";
	if (radius >= height / 2 - SLOP && width > height + SLOP) return "pill";
	return `rect r=${round(radius)}`;
}

export function artboardFor(
	artboard: string,
	props: Readonly<Record<string, unknown>> | null | undefined,
	work: string,
): string {
	const held = fs.readFileSync(artboard, "utf8");
	const named = `${path.resolve(artboard)}-${Object.values(props ?? {}).join("-")}`.replace(/[^a-zA-Z0-9]+/g, "_");
	const at = path.join(work, `${named}.html`);
	fs.writeFileSync(
		at,
		held.replace("<head>", `<head><script>window.__PROPS__ = ${JSON.stringify(props ?? {})};</script>`),
	);
	fs.copyFileSync(new URL("artboard-support.js", import.meta.url), path.join(work, "support.js"));
	return at;
}

const PAGE_SCRIPT = `(selectors) => {
	const numbers = (text) => (text.match(/-?[\\d.]+/g) ?? []).map(Number);
	const out = {};
	for (const [part, selector] of Object.entries(selectors)) {
		const node = document.querySelector(selector);
		if (!node) { out[part] = { present: false }; continue; }
		const worn = getComputedStyle(node);
		const box = node.getBoundingClientRect();
		if (worn.display === "none" || (box.width === 0 && box.height === 0)) { out[part] = { present: false }; continue; }
		const pattern = node.querySelector ? node.querySelector("pattern") : null;
		const svg = node.closest("svg") ?? (node.querySelector ? node.querySelector("svg") : null);
		const scale = svg && svg.getScreenCTM ? svg.getScreenCTM() : null;
		const clear = (paint) => /rgba?\\([^)]*,\\s*0\\s*\\)|\\/\\s*0\\s*\\)/.test(paint);
		const skin = getComputedStyle(node, "::before");
		const tail = getComputedStyle(node, "::after");
		const paints = skin.content !== "none" && (!clear(skin.backgroundColor) || (numbers(skin.borderTopLeftRadius)[0] ?? 0) > 0);
		const surface = paints ? skin : worn;
		const shared = paints && !clear(worn.backgroundColor);
		const spelt = (given) => /^\\s*["']/.test(given ?? "") && !/^\\s*["']\\s*["']\\s*$/.test(given);
		out[part] = {
			present: true,
			shared,
			reads: (node.textContent ?? "").trim().length > 0 || spelt(skin.content) || spelt(tail.content),
			width: box.width,
			height: box.height,
			radii: [surface.borderTopLeftRadius, surface.borderTopRightRadius, surface.borderBottomRightRadius, surface.borderBottomLeftRadius].map((one) => numbers(one)[0] ?? 0),
			color: worn.color,
			background: surface.backgroundColor,
			borderColor: worn.borderTopColor,
			borderWidth: numbers(worn.borderTopWidth)[0] ?? 0,
			fontFamily: worn.fontFamily,
			fontSize: numbers(worn.fontSize)[0] ?? 0,
			fontWeight: Number(worn.fontWeight),
			letterSpacing: numbers(worn.letterSpacing)[0] ?? 0,
			gap: numbers(worn.gap)[0] ?? 0,
			padding: [worn.paddingTop, worn.paddingRight, worn.paddingBottom, worn.paddingLeft].map((one) => numbers(one)[0] ?? 0),
			shadow: surface.boxShadow === "none" ? null : surface.boxShadow,
			backdrop: surface.backdropFilter === "none" ? null : surface.backdropFilter,
			tile: pattern && scale ? [pattern.width.baseVal.value * scale.a, pattern.height.baseVal.value * scale.d] : null,
		};
	}
	return out;
}`;

const DRAWN_NUMBERS = ["width", "height", "borderWidth", "fontSize", "fontWeight", "letterSpacing", "gap"] as const;
const DRAWN_WORDS = ["color", "background", "borderColor", "fontFamily"] as const;
const DRAWN_MAYBE_WORDS = ["shadow", "backdrop"] as const;
const DRAWN_FLAGS = ["shared", "reads"] as const;

function measuredPartsOf(answer: unknown, file: string): MeasuredParts {
	if (typeof answer !== "object" || answer === null) throw new Error(`${file} answered no measurement at all`);
	const parts: Record<string, MeasuredPart> = {};
	for (const [part, one] of Object.entries(answer)) {
		if (!isMeasuredPart(one)) throw new Error(`${file} answered a measurement of ${part} design-diff cannot read`);
		parts[part] = one;
	}
	return parts;
}

function isMeasuredPart(value: unknown): value is MeasuredPart {
	if (typeof value !== "object" || value === null || !("present" in value)) return false;
	if (value.present === false) return true;
	return value.present === true && isDrawnPart(value);
}

function isDrawnPart(value: object): value is DrawnPart {
	const field = (name: string): unknown => Reflect.get(value, name);
	const tile = field("tile");
	return (
		DRAWN_NUMBERS.every((name) => typeof field(name) === "number") &&
		DRAWN_WORDS.every((name) => typeof field(name) === "string") &&
		DRAWN_MAYBE_WORDS.every((name) => field(name) === null || typeof field(name) === "string") &&
		DRAWN_FLAGS.every((name) => typeof field(name) === "boolean") &&
		isNumbers(field("radii")) &&
		isNumbers(field("padding")) &&
		(tile === null || isNumbers(tile))
	);
}

function isNumbers(value: unknown): value is readonly number[] {
	return Array.isArray(value) && value.every((one) => typeof one === "number");
}

async function settled(ask: (expression: string) => Promise<unknown>, file: string, within: number): Promise<void> {
	for (let spent = 0; spent < within; spent += 100) {
		if (await ask("window.__READY__ === true")) return;
		await waited(100);
	}
	const why = await ask("window.__err || ''");
	throw new Error(
		`${file} never reported itself drawn${why ? `, and the page threw: ${String(why)}` : ", and the page reported no error of its own"}`,
	);
}

function mismatch(part: string, what: string, design: Shown, impl: Shown): Finding {
	return { part, what, design, impl, level: "error" };
}

function drift(part: string, what: string, design: Shown, impl: Shown): Finding {
	return { part, what, design, impl, level: "warn" };
}

function noted(part: string, what: string, design: Shown, impl: Shown): Finding {
	return { part, what, design, impl, level: "note" };
}

type PaintLevel = "error" | "warn";

const NOTED: Readonly<Record<PaintLevel, typeof mismatch>> = { error: mismatch, warn: drift };

function sharedGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const both = [design.shared && "design", impl.shared && "impl"].filter(
		(side): side is string => typeof side === "string",
	);
	if (both.length === 0) return [];
	return [
		mismatch(
			part,
			"two painted surfaces",
			both.join(" and "),
			"the element and its ::before both paint, so which one this part means is a guess",
		),
	];
}

function shapeGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const here = shapeOf(design.radii, design.width, design.height);
	const there = shapeOf(impl.radii, impl.width, impl.height);
	if (here === there) return [];
	return [mismatch(part, "shape", here, there)];
}

const PAINTED = ["color", "background", "borderColor"] as const;

function paintGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const found: Finding[] = [];
	for (const what of PAINTED) {
		const level = paintLevel(design[what], impl[what]);
		if (level) found.push(NOTED[level](part, what, design[what], impl[what]));
	}
	return found;
}

function paintLevel(design: string, impl: string): PaintLevel | null {
	if (unreadable(design) || unreadable(impl)) return "error";
	if (colorless(design) !== colorless(impl)) return "error";
	if (colorless(design)) return null;
	if (Math.abs((alphaOf(design) ?? 0) - (alphaOf(impl) ?? 0)) > 0.01) return "error";
	const apart = distanceOf(design, impl) ?? 0;
	if (apart <= TIGHT_DELTA) return null;
	return apart <= LOOSE_DELTA ? "warn" : "error";
}

const BOXED = ["width", "height", "gap", "borderWidth"] as const;
const TYPESET = ["fontSize", "fontWeight", "letterSpacing"] as const;

function sizeGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const reading = design.reads || impl.reads;
	return [
		...(reading ? typeGaps(part, design, impl) : [noted(part, "typography", "no text", "no text")]),
		...BOXED.flatMap((what) =>
			apartEnough(design[what], impl[what]) ? [mismatch(part, what, round(design[what]), round(impl[what]))] : [],
		),
		...spreadGaps(part, design.padding, impl.padding, PADDING),
		...spreadGaps(part, design.tile, impl.tile, PATTERN_TILE),
	];
}

function typeGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const found = TYPESET.flatMap((what) =>
		apartEnough(design[what], impl[what]) ? [mismatch(part, what, round(design[what]), round(impl[what]))] : [],
	);
	if (design.fontFamily === impl.fontFamily) return found;
	return [...found, mismatch(part, "fontFamily", design.fontFamily, impl.fontFamily)];
}

interface SpreadName {
	readonly what: string;
	readonly between: string;
}

const PADDING: SpreadName = { what: "padding", between: " " };
const PATTERN_TILE: SpreadName = { what: "pattern tile", between: "x" };

function spreadGaps(
	part: string,
	design: readonly number[] | null,
	impl: readonly number[] | null,
	as: SpreadName,
): Finding[] {
	if (!design || !impl) return [];
	if (!design.some((one, at) => apartEnough(one, impl[at]))) return [];
	return [mismatch(part, as.what, design.map(round).join(as.between), impl.map(round).join(as.between))];
}

function blurGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	if (design.backdrop === impl.backdrop) return [];
	return [mismatch(part, "backdrop", design.backdrop ?? "none", impl.backdrop ?? "none")];
}

interface ShadowLayer {
	readonly paint: string;
	readonly inward: boolean;
	readonly spread: readonly number[];
}

function shadowGaps(part: string, design: DrawnPart, impl: DrawnPart): Finding[] {
	const here = layersOf(design.shadow);
	const there = layersOf(impl.shadow);
	if (here.length !== there.length) return [mismatch(part, "shadow layers", here.length, there.length)];
	return here.flatMap((layer, at) => {
		const other = there[at];
		return other ? layerGaps(part, layer, other, at) : [];
	});
}

function layerGaps(part: string, design: ShadowLayer, impl: ShadowLayer, at: number): Finding[] {
	const name = `shadow ${at + 1}`;
	const level = paintLevel(design.paint, impl.paint);
	const found = level ? [NOTED[level](part, `${name} colour`, design.paint, impl.paint)] : [];
	if (design.inward !== impl.inward)
		found.push(mismatch(part, `${name} inset`, sideOf(design.inward), sideOf(impl.inward)));
	if (
		design.spread.length !== impl.spread.length ||
		design.spread.some((one, which) => apartEnough(one, impl.spread[which]))
	) {
		found.push(mismatch(part, `${name} offset`, design.spread.join(" "), impl.spread.join(" ")));
	}
	return found;
}

function sideOf(inward: boolean): string {
	return inward ? "inset" : "cast outward";
}

const A_COLOUR = /(rgba?\([^)]*\)|color\([^)]*\))/;
const BETWEEN_LAYERS = /,(?![^(]*\))/;
const INWARD = /\binset\b/;
const A_NUMBER = /-?[\d.]+/g;

function layersOf(shadow: string | null): ShadowLayer[] {
	if (!shadow) return [];
	return shadow.split(BETWEEN_LAYERS).map(layerOf);
}

function layerOf(one: string): ShadowLayer {
	return {
		paint: A_COLOUR.exec(one)?.[1] ?? "",
		inward: INWARD.test(one),
		spread: (one.replace(A_COLOUR, "").match(A_NUMBER) ?? []).map(Number),
	};
}

function apartEnough(design: number | undefined, impl: number | undefined): boolean {
	if (typeof design !== "number" || typeof impl !== "number") return false;
	const off = Math.abs(design - impl);
	return off > SLOP && off / Math.max(Math.abs(design), 1) > 0.01;
}

function round(one: number): number {
	return Math.round(one * 10) / 10;
}

interface PairedPart {
	readonly design: string;
	readonly impl?: string | undefined;
}

interface Pairs {
	readonly design: string | undefined;
	readonly impl: string | undefined;
	readonly size: PageSize | undefined;
	readonly props: Readonly<Record<string, unknown>> | undefined;
	readonly parts: Readonly<Record<string, PairedPart>>;
}

function pairsOf(read: unknown, at: string): Pairs {
	if (typeof read !== "object" || read === null) throw new Error(`design-diff: ${at} holds no object`);
	const field = (name: string): unknown => Reflect.get(read, name);
	const parts = field("parts");
	if (typeof parts !== "object" || parts === null) throw new Error(`design-diff: ${at} names no parts`);
	const size = field("size");
	const props = field("props");
	return {
		design: wordOf(field("design")),
		impl: wordOf(field("impl")),
		size: Array.isArray(size) && size.length === 2 && isNumbers(size) ? [size[0] ?? 0, size[1] ?? 0] : undefined,
		props: typeof props === "object" && props !== null ? Object.fromEntries(Object.entries(props)) : undefined,
		parts: Object.fromEntries(Object.entries(parts).map(([part, where]) => [part, pairedPartOf(where, part, at)])),
	};
}

function pairedPartOf(where: unknown, part: string, at: string): PairedPart {
	const design = typeof where === "object" && where !== null ? wordOf(Reflect.get(where, "design")) : undefined;
	if (design === undefined || typeof where !== "object" || where === null)
		throw new Error(`design-diff: ${at} gives ${part} no design selector`);
	return { design, impl: wordOf(Reflect.get(where, "impl")) };
}

function wordOf(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined;
}

function flag(name: string): string | null {
	const at = process.argv.indexOf(`--${name}`);
	return at === -1 ? null : (process.argv[at + 1] ?? null);
}

async function diffFromCommandLine(): Promise<void> {
	const pairsAt = flag("pairs");
	if (!pairsAt) {
		console.error("design-diff: --pairs <file.json> is required; --design and --impl may override what it names");
		process.exit(2);
	}
	const asked = pairsOf(JSON.parse(fs.readFileSync(pairsAt, "utf8")), pairsAt);
	const designAt = flag("design") ?? asked.design;
	const implAt = flag("impl") ?? asked.impl;
	if (designAt === undefined || implAt === undefined) {
		console.error("design-diff: name the design and the impl, in the pairs file or with --design and --impl");
		process.exit(2);
	}
	const work = mkdtempSync(path.join(tmpdir(), "wg-diff-"));
	const designSide = Object.fromEntries(Object.entries(asked.parts).map(([part, where]) => [part, where.design]));
	const implSide = Object.fromEntries(
		Object.entries(asked.parts).map(([part, where]) => [part, where.impl ?? `[data-part="${part}"]`]),
	);
	const design = await measuredSide(designAt, designSide, asked, work);
	const impl = await measuredSide(implAt, implSide, asked, work);
	const found = reported(asked.parts, design, impl);
	const MARKED: Readonly<Record<FindingLevel, string>> = { error: "!!", warn: "??", note: "--" };
	for (const one of found)
		console.log(
			`${MARKED[one.level]}  ${one.part.padEnd(14)} ${one.what.padEnd(14)} design ${String(one.design).padEnd(24)} impl ${one.impl}`,
		);
	const names = Object.keys(asked.parts);
	const unpaired = found.filter((one) => one.what === "pairing").length;
	const counted = (level: FindingLevel): number => found.filter((one) => one.level === level).length;
	const errors = counted("error");
	console.log(
		`\ndesign-diff: ${names.length - unpaired} of ${names.length} parts paired, ${errors} error(s), ${counted("warn")} warning(s), ${counted("note")} not measured`,
	);
	process.exit(errors === 0 ? 0 : 1);
}

if (process.argv[1]?.endsWith("design-diff.ts")) await diffFromCommandLine();

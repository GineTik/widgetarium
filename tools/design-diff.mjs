import fs from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged, waited } from "./chrome-ask.mjs";
import { alphaOf, colorless, distanceOf, unreadable } from "./color-distance.mjs";

export const TIGHT_DELTA = 2;
export const LOOSE_DELTA = 5;
export const SLOP = 1;

export async function measuredSide(at, selectors, asked, work) {
	const file = at.endsWith(".dc.html") ? artboardFor(at, asked.props, work) : path.resolve(at);
	return measured(file, selectors, { size: asked.size });
}

export async function measured(file, selectors, opts = {}) {
	const { size = [900, 560], within = 6000 } = opts;
	const page = await paged(file, "design-diff", { size });
	try {
		await settled(page, file, within);
		return await page.ask(`(${PAGE_SCRIPT})(${JSON.stringify(selectors)})`);
	} finally {
		page.close();
	}
}

export function reported(parts, design, impl) {
	return Object.keys(parts).flatMap((part) => compared(part, design[part], impl[part]));
}

export function compared(part, design, impl) {
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

export function shapeOf(radii, width, height) {
	const radius = Math.min(...radii);
	const spread = Math.max(...radii) - radius;
	if (spread > SLOP) return `mixed radii ${radii.map(round).join("/")}`;
	if (radius >= Math.min(width, height) / 2 - SLOP && Math.abs(width - height) <= SLOP) return "circle";
	if (radius >= height / 2 - SLOP && width > height + SLOP) return "pill";
	return `rect r=${round(radius)}`;
}

export function artboardFor(artboard, props, work) {
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

async function settled(page, file, within) {
	for (let spent = 0; spent < within; spent += 100) {
		if (await page.ask("window.__READY__ === true")) return;
		await waited(100);
	}
	const why = await page.ask("window.__err || ''");
	throw new Error(
		`${file} never reported itself drawn${why ? `, and the page threw: ${why}` : ", and the page reported no error of its own"}`,
	);
}

function mismatch(part, what, design, impl) {
	return { part, what, design, impl, level: "error" };
}

function drift(part, what, design, impl) {
	return { part, what, design, impl, level: "warn" };
}

function noted(part, what, design, impl) {
	return { part, what, design, impl, level: "note" };
}

const NOTED = { error: mismatch, warn: drift };

function sharedGaps(part, design, impl) {
	const both = [design.shared && "design", impl.shared && "impl"].filter(Boolean);
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

function shapeGaps(part, design, impl) {
	const here = shapeOf(design.radii, design.width, design.height);
	const there = shapeOf(impl.radii, impl.width, impl.height);
	if (here === there) return [];
	return [mismatch(part, "shape", here, there)];
}

function paintGaps(part, design, impl) {
	const found = [];
	for (const what of ["color", "background", "borderColor"]) {
		const level = paintLevel(design[what], impl[what]);
		if (level) found.push(NOTED[level](part, what, design[what], impl[what]));
	}
	return found;
}

function paintLevel(design, impl) {
	if (unreadable(design) || unreadable(impl)) return "error";
	if (colorless(design) !== colorless(impl)) return "error";
	if (colorless(design)) return null;
	if (Math.abs(alphaOf(design) - alphaOf(impl)) > 0.01) return "error";
	const apart = distanceOf(design, impl);
	if (apart <= TIGHT_DELTA) return null;
	return apart <= LOOSE_DELTA ? "warn" : "error";
}

const BOXED = ["width", "height", "gap", "borderWidth"];
const TYPESET = ["fontSize", "fontWeight", "letterSpacing"];

function sizeGaps(part, design, impl) {
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

function typeGaps(part, design, impl) {
	const found = TYPESET.flatMap((what) =>
		apartEnough(design[what], impl[what]) ? [mismatch(part, what, round(design[what]), round(impl[what]))] : [],
	);
	if (design.fontFamily === impl.fontFamily) return found;
	return [...found, mismatch(part, "fontFamily", design.fontFamily, impl.fontFamily)];
}

const PADDING = { what: "padding", between: " " };
const PATTERN_TILE = { what: "pattern tile", between: "x" };

function spreadGaps(part, design, impl, as) {
	if (!design || !impl) return [];
	if (!design.some((one, at) => apartEnough(one, impl[at]))) return [];
	return [mismatch(part, as.what, design.map(round).join(as.between), impl.map(round).join(as.between))];
}

function blurGaps(part, design, impl) {
	if (design.backdrop === impl.backdrop) return [];
	return [mismatch(part, "backdrop", design.backdrop ?? "none", impl.backdrop ?? "none")];
}

function shadowGaps(part, design, impl) {
	const here = layersOf(design.shadow);
	const there = layersOf(impl.shadow);
	if (here.length !== there.length) return [mismatch(part, "shadow layers", here.length, there.length)];
	return here.flatMap((layer, at) => layerGaps(part, layer, there[at], at));
}

function layerGaps(part, design, impl, at) {
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

function sideOf(inward) {
	return inward ? "inset" : "cast outward";
}

const A_COLOUR = /(rgba?\([^)]*\)|color\([^)]*\))/;
const BETWEEN_LAYERS = /,(?![^(]*\))/;
const INWARD = /\binset\b/;
const A_NUMBER = /-?[\d.]+/g;

function layersOf(shadow) {
	if (!shadow) return [];
	return shadow.split(BETWEEN_LAYERS).map(layerOf);
}

function layerOf(one) {
	return {
		paint: A_COLOUR.exec(one)?.[1] ?? "",
		inward: INWARD.test(one),
		spread: (one.replace(A_COLOUR, "").match(A_NUMBER) ?? []).map(Number),
	};
}

function apartEnough(design, impl) {
	if (typeof design !== "number" || typeof impl !== "number") return false;
	const off = Math.abs(design - impl);
	return off > SLOP && off / Math.max(Math.abs(design), 1) > 0.01;
}

function round(one) {
	return typeof one === "number" ? Math.round(one * 10) / 10 : one;
}

if (process.argv[1]?.endsWith("design-diff.mjs")) {
	const flag = (name, fallback = null) => {
		const at = process.argv.indexOf(`--${name}`);
		return at === -1 ? fallback : process.argv[at + 1];
	};
	const pairsAt = flag("pairs");
	if (!pairsAt) {
		console.error("design-diff: --pairs <file.json> is required; --design and --impl may override what it names");
		process.exit(2);
	}
	const asked = JSON.parse(fs.readFileSync(pairsAt, "utf8"));
	const work = mkdtempSync(path.join(tmpdir(), "wg-diff-"));
	const designSide = Object.fromEntries(Object.entries(asked.parts).map(([part, where]) => [part, where.design]));
	const implSide = Object.fromEntries(
		Object.entries(asked.parts).map(([part, where]) => [part, where.impl ?? `[data-part="${part}"]`]),
	);
	const design = await measuredSide(flag("design", asked.design), designSide, asked, work);
	const impl = await measuredSide(flag("impl", asked.impl), implSide, asked, work);
	const found = reported(asked.parts, design, impl);
	const MARKED = { error: "!!", warn: "??", note: "--" };
	for (const one of found)
		console.log(
			`${MARKED[one.level]}  ${one.part.padEnd(14)} ${one.what.padEnd(14)} design ${String(one.design).padEnd(24)} impl ${one.impl}`,
		);
	const names = Object.keys(asked.parts);
	const unpaired = found.filter((one) => one.what === "pairing").length;
	const counted = (level) => found.filter((one) => one.level === level).length;
	const errors = counted("error");
	console.log(
		`\ndesign-diff: ${names.length - unpaired} of ${names.length} parts paired, ${errors} error(s), ${counted("warn")} warning(s), ${counted("note")} not measured`,
	);
	process.exit(errors === 0 ? 0 : 1);
}

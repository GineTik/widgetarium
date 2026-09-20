import { useEffect } from "react";
import { isClear } from "./color-math.js";
import { MEASURED_DIR, measuredPathOf, PRESET_TOKENS } from "./surface-contract.js";
import { byPath } from "./tree.js";

// TRADE-OFF: measured after every settled render into the plugin's own folder, not on request, because the agent reading it cannot ask the plugin anything; an unchanged measurement writes nothing
export function useMeasuredSurfaces(pageRef, host, regionsRef) {
	useEffect(() => {
		const adapter = host?.app?.vault?.adapter;
		const note = host?.notePath;
		if (!adapter || !note) return undefined;
		const measure = () => measureInto(adapter, note, pageRef.current, [...regionsRef.current.values()]);
		const timer = window.setTimeout(measure, SETTLE_MS);
		return () => window.clearTimeout(timer);
	});
}

export function measureBoard(page, regions) {
	return {
		theme: document.body.classList.contains("theme-dark") ? "dark" : "light",
		page: pageColourOf(page),
		presets: presetsOf(page),
		tiles: tilesIn(regions),
		extents: extentsIn(regions),
	};
}

function extentsIn(regions) {
	return Object.assign({}, ...regions.map((region) => byPath(region, extentOf)));
}

function extentOf(node) {
	const box = node.getBoundingClientRect();
	return { w: Math.round(box.width), h: Math.round(box.height) };
}

export function measureTile(body) {
	const elements = [...body.querySelectorAll("*")].slice(0, MAX_ELEMENTS_PER_TILE);
	const painted = paintedIn(body, elements);
	return { ...containersIn(body, painted), texts: textsOnGround(body, elements, painted) };
}

const INTERACTIVE =
	"button, a[href], input, select, textarea, [role='button'], [role='tab'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], [role='menuitem']";
const MEDIA = "img, svg, canvas, video";
const SETTLE_MS = 700;
const MAX_ELEMENTS_PER_TILE = 4000;
const writtenByPath = new Map();

function measureInto(adapter, note, page, regions) {
	if (!page) return;
	writeMeasured(adapter, measuredPathOf(note), measureBoard(page, regions)).catch((failure) =>
		console.error("[widgetarium] the board's surfaces were not measured", failure),
	);
}

async function writeMeasured(adapter, path, measured) {
	const text = JSON.stringify(measured, null, "\t");
	if (writtenByPath.get(path) === text) return;
	writtenByPath.set(path, text);
	if (!(await adapter.exists(MEASURED_DIR))) await adapter.mkdir(MEASURED_DIR);
	await adapter.write(path, text);
}

function tilesIn(regions) {
	return Object.fromEntries(
		regions
			.flatMap((region) => [...region.querySelectorAll(".wg-tree-cell[data-cell]")])
			.map((cell) => [cell.dataset.cell, cell.querySelector(".wg-tile-body")])
			.filter(([, body]) => body)
			.map(([id, body]) => [id, measureTile(body)]),
	);
}

function containersIn(body, painted) {
	const fills = new Map();
	let depth = 0;
	for (const [element, paint] of painted) {
		const above = paintedAbove(element, body, painted);
		if (paint.kind === "container") depth = Math.max(depth, above.filter((one) => one.kind === "container").length + 1);
		if (above.length === 0 && (paint.kind === "container" || paint.kind === "mark"))
			fills.set(`${paint.kind} ${paint.color}`, { kind: paint.kind, color: paint.color });
	}
	return { depth, fills: [...fills.values()] };
}

function textsOnGround(body, elements, painted) {
	const colours = elements
		.filter((element) => hasOwnText(element) && !painted.has(element))
		.filter((element) => paintedAbove(element, body, painted).length === 0)
		.map((element) => getComputedStyle(element).color);
	return [...new Set(colours)];
}

function pageColourOf(page) {
	for (let at = page; at; at = at.parentElement) {
		const background = getComputedStyle(at).backgroundColor;
		if (!isClear(background)) return background;
	}
	return getComputedStyle(document.body).backgroundColor;
}

function presetsOf(page) {
	const probe = document.createElement("div");
	probe.style.position = "absolute";
	probe.style.visibility = "hidden";
	page.appendChild(probe);
	const read = (token) => {
		probe.style.backgroundColor = `var(${token})`;
		return getComputedStyle(probe).backgroundColor;
	};
	const presets = Object.fromEntries(Object.entries(PRESET_TOKENS).map(([name, token]) => [name, read(token)]));
	probe.remove();
	return presets;
}

function paintedIn(body, elements) {
	const painted = new Map();
	for (const element of elements) {
		const paint = paintOf(element);
		if (paint) painted.set(element, { ...paint, kind: paint.isMedia ? "media" : kindOf(element, body) });
	}
	return painted;
}

function paintedAbove(element, body, painted) {
	const found = [];
	for (let at = element.parentElement; at && at !== body; at = at.parentElement) {
		if (painted.has(at)) found.push(painted.get(at));
	}
	return found;
}

function paintOf(element) {
	const own = getComputedStyle(element);
	if (own.backgroundImage !== "none") return { isMedia: true };
	if (!isClear(own.backgroundColor)) return { color: own.backgroundColor };
	const before = getComputedStyle(element, "::before");
	if (before.content === "none" || isClear(before.backgroundColor)) return null;
	return { color: before.backgroundColor };
}

function kindOf(element, body) {
	const count = contentCount(element);
	const control = element.closest(INTERACTIVE);
	if (control && body.contains(control)) return count > 0 ? "control" : "mark";
	if (count >= 2) return "container";
	return count === 1 ? "label" : "mark";
}

function contentCount(element) {
	const texts = [element, ...element.querySelectorAll("*")].filter(hasOwnText).length;
	const media = [...element.querySelectorAll(MEDIA)].filter((one) => !one.parentElement?.closest("svg")).length;
	return texts + media;
}

function hasOwnText(element) {
	return [...element.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim() !== "");
}

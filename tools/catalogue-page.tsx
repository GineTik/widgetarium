import { createElement as h, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { Catalogue } from "../packages/core/src/catalogue.js";
import type { CatalogueHost } from "../packages/core/src/catalogue-preview.js";
import type { CatalogueMode } from "../packages/core/src/catalogue-install-press.js";
import type { RankEntry } from "../packages/core/src/catalogue-view.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { slotFit } from "../packages/core/src/fit.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import { PAGE_HOST, boom, filesAdapter, pageFiles, pageGlobal, reportsFailures, stackOf } from "./page-harness.ts";

interface AskedSlot {
	readonly parent: string;
	readonly name: string;
}

const MODES: readonly CatalogueMode[] = ["browse", "place", "fill", "text", "mount", "template"];

const isMode = (value: unknown): value is CatalogueMode => MODES.some((mode) => mode === value);

const isAskedSlot = (value: unknown): value is AskedSlot =>
	isObject(value) && typeof value["parent"] === "string" && typeof value["name"] === "string";

const FILES = pageFiles();
const askedMode = pageGlobal("__MODE__");
const MODE: CatalogueMode = isMode(askedMode) ? askedMode : "place";
const askedSlot = pageGlobal("__SLOT__");
const SLOT_RANKED_AGAINST_ITS_PARENT = isAskedSlot(askedSlot) ? askedSlot : null;

const adapter = filesAdapter(FILES);

reportsFailures();

function shotPathOf(at: string): string {
	const shotsAt = String(pageGlobal("__SHOTS_AT__"));
	const widgetsDir = String(pageGlobal("__WIDGETS_DIR__"));
	return `${shotsAt}${at.slice(widgetsDir.length)}`;
}

const HOST: CatalogueHost = { ...PAGE_HOST, resourcePathOf: shotPathOf };

function slotGives(registry: WidgetRegistry, slot: AskedSlot): Readonly<Record<string, unknown>> | null {
	const slots = registry.get(slot.parent)?.manifest["slots"];
	const declared = isObject(slots) ? slots[slot.name] : null;
	const gives = isObject(declared) ? declared["gives"] : null;
	return isObject(gives) ? gives : null;
}

function rankOf(registry: WidgetRegistry): RankEntry | undefined {
	if (MODE !== "fill" || !SLOT_RANKED_AGAINST_ITS_PARENT) return undefined;
	const gives = slotGives(registry, SLOT_RANKED_AGAINST_ITS_PARENT);
	if (!gives) return undefined;
	return (manifest) => slotFit(manifest, gives);
}

function Harness(): ReactElement {
	const [registry, setRegistry] = useState<WidgetRegistry | null>(null);

	useEffect(() => {
		const loading = new WidgetRegistry({ vault: { adapter } });
		loading
			.load()
			.then(() => {
				setRegistry(loading);
			})
			.catch((failure: unknown) => boom(`load: ${stackOf(failure)}`));
	}, []);

	if (!registry) return h("p", { className: "harness-wait" }, "Loading widgets…");

	return h(Catalogue, {
		registry,
		host: HOST,
		mode: MODE,
		rank: rankOf(registry),
		onPick: () => {},
	});
}

const hostNode = document.getElementById("host");
if (hostNode) render(h(Harness), hostNode);

const LATTICE_CELL_VAR = "--wg-cell";
const LATTICE_GAP_VAR = "--wg-gap";

function spanOn(stage: Element, px: number): number {
	const style = getComputedStyle(stage);
	const cell = Number.parseFloat(style.getPropertyValue(LATTICE_CELL_VAR));
	const gap = Number.parseFloat(style.getPropertyValue(LATTICE_GAP_VAR));
	return Math.round((px + gap) / (cell + gap));
}

function imagesOf(selector: string): HTMLImageElement[] {
	return [...document.querySelectorAll(selector)].filter((node) => node instanceof HTMLImageElement);
}

interface TileSeen {
	readonly name: string;
	readonly at: readonly number[];
	readonly span: string | null;
	readonly box: readonly number[] | null;
	readonly wants: readonly number[] | null;
}

interface OffGrid {
	readonly name: string;
	readonly declared: string | null;
	readonly drawn: string;
}

function textWidthIn(family: string | null): number {
	const span = document.createElement("span");
	span.textContent = "Handgloves 0123456789";
	span.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:32px;${family ? `font-family:${family}` : ""}`;
	document.body.appendChild(span);
	const width = span.getBoundingClientRect().width;
	span.remove();
	return width;
}

// TRADE-OFF: fontFamily answers the declared list, where "sans-serif" contains "serif", so the face is measured by width
function serifFace(): string | null {
	return textWidthIn(null) === textWidthIn('"Times New Roman", Times, serif') ? "Times" : null;
}

interface Fog {
	readonly ground: string;
	readonly ends: boolean;
	readonly said: string;
	readonly tall: string;
}

function fogOf(): Fog | null {
	const frame = document.querySelector(".wg-cat-frame");
	const stage = document.querySelector(".wg-cat-stage");
	if (!frame || !stage) return null;
	const painted = getComputedStyle(frame, "::after");
	const ground = getComputedStyle(stage).backgroundColor;
	return {
		ground,
		ends: painted.backgroundImage.includes(ground),
		said: painted.backgroundImage,
		tall: painted.height,
	};
}

function measureTiles(): { readonly over: TileSeen[]; readonly offGrid: OffGrid[] } {
	const over: TileSeen[] = [];
	const offGrid: OffGrid[] = [];
	for (const tile of document.querySelectorAll(".wg-cat-tile")) {
		const frame = tile.querySelector(".wg-cat-frame");
		const inner = frame?.firstElementChild;
		const name = tile.querySelector(".wg-cat-name")?.textContent ?? "";
		const box = tile.getBoundingClientRect();
		over.push({
			name,
			at: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)],
			span: tile.getAttribute("data-span"),
			box: frame ? [frame.clientWidth, frame.clientHeight] : null,
			wants: inner ? [inner.scrollWidth, inner.scrollHeight] : null,
		});
		if (!frame) throw new Error(`${name} draws no stage`);
		// TRADE-OFF: the card caps a long span, so only a whole number of cells is held, never the widget's own
		const wide = spanOn(frame, frame.clientWidth);
		const tall = spanOn(frame, frame.clientHeight);
		if (!(wide >= 1 && tall >= 1))
			offGrid.push({ name, declared: tile.getAttribute("data-span"), drawn: `${wide}x${tall}` });
	}
	return { over, offGrid };
}

function isRoundControl(node: Element): boolean {
	const box = node.getBoundingClientRect();
	const painted = getComputedStyle(node, "::before");
	return box.width === box.height && parseFloat(painted.borderRadius) >= box.width / 2;
}

function controlRadiusSaid(node: Element): string {
	const box = node.getBoundingClientRect();
	const painted = getComputedStyle(node, "::before");
	return `${Math.round(box.width)}x${Math.round(box.height)} ::before r${painted.borderRadius} on ${painted.background.split(" ")[0]}`;
}

function countDrawn(): void {
	const { over, offGrid } = measureTiles();
	const shots = imagesOf(".wg-cat-shot");
	const count = document.getElementById("count");
	if (!count) return;
	count.textContent = JSON.stringify({
		tiles: document.querySelectorAll(".wg-cat-tile").length,
		cells: document.querySelectorAll(".wg-cat-frame > .wg-cells > i").length,
		captions: document.querySelectorAll(".wg-cat-tile .wg-cat-name").length,
		badges: document.querySelectorAll(".wg-cat-tile .wg-cat-badge").length,
		feet: document.querySelectorAll(".wg-cat-tile > .wg-cat-foot").length,
		buttons: document.querySelectorAll(".wg-cat-foot .wg-cat-go").length,
		feetInsideAStage: document.querySelectorAll(".wg-cat-stage .wg-cat-foot").length,
		shown: document.querySelectorAll(".wg-cat-show").length,
		round: [...document.querySelectorAll(".wg-cat-go")].filter(isRoundControl).length,
		radius: [...document.querySelectorAll(".wg-cat-go")].slice(0, 1).map(controlRadiusSaid)[0],
		serif: serifFace(),
		lacks: document.querySelectorAll(".wg-cat-lack").length,
		divides: document.querySelectorAll(".wg-cat-divide").length,
		live: document.querySelectorAll(".wg-cat-frame").length,
		shotsAsked: shots.length,
		shotsLoaded: shots.filter((node) => node.naturalWidth).length,
		shotThemes: [...new Set(shots.map((node) => node.src.slice(node.src.lastIndexOf("shot-"))))],
		fogged: [...document.querySelectorAll(".wg-cat-frame")].filter(
			(node) => getComputedStyle(node, "::after").content !== "none",
		).length,
		fog: fogOf(),
		stands: document.querySelectorAll(".wg-cat-stand").length,
		contained: document.querySelectorAll(".wg-cat-stand.is-broken").length,
		over,
		offGrid,
	});
}

setTimeout(countDrawn, 1200);

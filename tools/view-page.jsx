import { createElement as h } from "react";
import { render } from "../src/engine/render.js";
import { WidgetSurface } from "../src/surface.js";
import { normalizeBoard } from "../src/model.js";
import { WidgetRegistry } from "../src/registry.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.mjs";

const FILES = JSON.parse(document.getElementById("wg-widgets").textContent);
const BOARD = JSON.parse(document.getElementById("wg-board").textContent);
const ROWS = JSON.parse(document.getElementById("wg-rows").textContent);

const adapter = createFileTree(FILES);
const host = createProbeHost(createRowSlot(ROWS));

const failures = [];
const warnings = [];
console.error = ((was) => (...parts) => {
	failures.push(parts.map((part) => String(part?.stack ?? part)).join(" "));
	was(...parts);
})(console.error);
console.warn = ((was) => (...parts) => {
	warnings.push(parts.map((part) => String(part)).join(" "));
	was(...parts);
})(console.warn);

const mount = document.querySelector(".wg-host");
const registry = new WidgetRegistry({ vault: { adapter } });
let board = normalizeBoard(BOARD);
// CONTEXT: a note is rewritten when its owner edits it — reading one must move nothing
let writes = 0;

function draw() {
	render(
		h(WidgetSurface, {
			board,
			registry,
			host,
			editing: Boolean(window.wgEditing),
			screen: true,
			initialWidth: 1280,
			onChange: (next) => {
				writes += 1;
				board = next;
				draw();
			},
			onToggleEditing: () => {},
			onWidth: () => {},
		}),
		mount,
	);
}

// CONTEXT: two boards render the same or they do not — the whole grid, not a field of it
function painted() {
	const html = document.querySelector(".wg-grid")?.innerHTML ?? "";
	let hash = 0;
	for (let at = 0; at < html.length; at += 1) hash = (hash * 131 + html.charCodeAt(at)) % 1000000007;
	return `${html.length}:${hash}`;
}

// CONTEXT: the view on screen is read off the painted root class, never off a setting
function drawn() {
	const seen = [];
	if (document.querySelector(".orbi-kanban")) seen.push("Kanban");
	if (document.querySelector(".orbi-archived-columns")) seen.push("Archived columns");
	return seen;
}

// CONTEXT: a sentence the tile cut off is not a message, so the width is measured, not eyeballed
function clipped(node) {
	return node ? node.scrollWidth > node.clientWidth + 1 : null;
}

function read() {
	return {
		drawn: drawn(),
		kanbans: document.querySelectorAll(".orbi-kanban").length,
		picker: document.querySelector(".orbi-view-tabs .ovt-pick") !== null,
		strip: [...document.querySelectorAll(".wg-tabs .wg-tabs-tab")].map((node) => node.textContent.trim()),
		filterGroups: [...document.querySelectorAll(".ofp-group-head")].map((node) => node.textContent.trim()),
		groupStrip: [...document.querySelectorAll(".ovg-strip .wg-tabs-tab")].map((node) => node.textContent.trim()),
		groupSelected: document.querySelector('.ovg-strip .wg-tabs-tab[aria-selected="true"]')?.textContent.trim() ?? null,
		kinds: [...document.querySelectorAll('.wg-set-pop [role="tab"]')].map((node) => node.textContent.trim()),
		popRows: [...document.querySelectorAll(".wg-set-pop .wg-set-row .wg-kit-row-label")].map((node) => node.textContent.trim()),
		popNote: document.querySelector(".wg-set-pop.is-open:not(.is-exiting) .wg-set-pop-note")?.textContent.trim() ?? null,
		popTitle: document.querySelector(".wg-set-pop .wg-set-pop-title")?.textContent.trim() ?? null,
		popHint: document.querySelector(".wg-set-pop .wg-set-pop-hint")?.textContent.trim() ?? null,
		popArea: document.querySelector(".wg-set-pop textarea")?.value ?? null,
		popError: document.querySelector(".wg-set-pop .wg-set-pop-error")?.textContent.trim() ?? null,
		applyOff: document.querySelector('.wg-set-pop button[disabled]')?.textContent.trim() ?? null,
		popFields: [...document.querySelectorAll(".wg-set-pop input")].map((node) => node.placeholder || node.value),
		tabLabel: document.querySelector(".orbi-view-tabs .ovt-pick .wg-kit-btn-label")?.textContent ?? null,
		stray: document.querySelector(".ovg-stray")?.textContent ?? null,
		probe: document.querySelector(".wg-probe-seen")?.textContent ?? null,
		deaf: document.querySelector(".ovt-deaf")?.textContent ?? null,
		deafClipped: clipped(document.querySelector(".ovt-deaf .wg-kit-btn-label") ?? document.querySelector(".ovt-deaf")),
		hints: [...document.querySelectorAll(".wg-set-window .wg-kit-side-group")]
			.filter((node) => ["Settings", "Selection"].includes(node.querySelector(".wg-kit-side-label")?.textContent.trim()))
			.map((node) => node.querySelector(".wg-kit-side-hint")?.textContent.trim() ?? null),
		items: [...document.querySelectorAll(".wg-kit-pop-item")].map((node) => node.textContent.trim()),
		tabItems: [...document.querySelectorAll(".orbi-view-tabs .wg-kit-pop-item")].map((node) => node.textContent.trim()),
		rows: [...document.querySelectorAll(".wg-set-panel .wg-set-row .wg-kit-row-label")].filter((node) => !node.closest(".wg-set-pop")).map((node) => node.textContent.trim()),
		popItems: [...document.querySelectorAll(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-pop-item")].map((node) => node.textContent.trim()),
		popBoxes: [...document.querySelectorAll(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-side-group .wg-kit-pop-item .wg-set-pop-name")].map(
			(node) => node.textContent.trim(),
		),
		popGroups: [...document.querySelectorAll(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-side-label")].map((node) => node.textContent.trim()),
		popDraft: document.querySelector(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-field-input")?.value ?? null,
		rowValues: [...document.querySelectorAll(".wg-set-panel .wg-set-row")].map(
			(node) => `${node.querySelector(".wg-kit-row-label")?.textContent.trim()} = ${node.querySelector(".wg-set-path")?.textContent.trim() ?? ""}`,
		),
		painted: painted(),
		writes,
		context: window.wgContext ? window.wgContext.all() : null,
		provider: window.wgContext ? { view: window.wgContext.providerOf("view"), views: window.wgContext.providerOf("views") } : null,
		tiles: board.tiles.map((tile) => ({ id: tile.id, widget: tile.widget, settings: tile.settings ?? null, props: tile.props ?? null, mounted: tile.mounted ?? null })),
		layouts: Object.fromEntries(Object.entries(board.layouts).map(([columns, places]) => [columns, places.map((place) => `${place.id} ${place.x},${place.y} ${place.w}x${place.h}`)])),
		failures,
		warnings,
	};
}

function report(payload) {
	document.getElementById("wg-measure").textContent = JSON.stringify(payload);
}

window.wgRead = read;
window.wgReport = report;

function press(step) {
	const root = step.within ? document.querySelector(step.within)?.closest(".wg-tile") : document;
	const nodes = [...(root?.querySelectorAll(step.click) ?? [])];
	const named = (one) => (step.said ? one.textContent.trim() === step.said : one.textContent.includes(step.saying));
	const node = step.said || step.saying ? nodes.find(named) : nodes[0];
	if (!node) return false;
	// CONTEXT: renaming is typing, and preact reads the value off the input event, not off the DOM
	if (typeof step.type === "string") {
		node.value = step.type;
		node.dispatchEvent(new window.Event("input", { bubbles: true }));
		return true;
	}
	node.click();
	return true;
}

function rest(run) {
	return new Promise((done) => {
		run();
		setTimeout(done, 300);
	});
}

async function walk() {
	draw();
	await rest(() => {});
	const seen = { arrival: read() };
	for (const step of window.wgSteps ?? []) {
		let hit = false;
		await rest(() => {
			hit = press(step);
		});
		seen[step.name] = { ...read(), pressed: hit };
	}
	report(seen);
}

registry.load().then(walk);

window.addEventListener("error", (event) => failures.push(String(event.message)));

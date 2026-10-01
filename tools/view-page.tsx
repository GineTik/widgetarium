import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import { leavesOf, swapBoxes } from "../packages/core/src/tree.js";
import { declaredName, WidgetRegistry } from "../packages/core/src/registry.js";
import { createFileTree, createProbeHost, createRowSlot } from "./vault-fixture.ts";
import {
	elementAt,
	elementsAt,
	isFileMap,
	isRecord,
	jsonIn,
	present,
	recordErrors,
	recordWarnings,
	rowsIn,
	textOf,
} from "./page-dom.ts";

const FILES = jsonIn("wg-widgets");
const BOARD = jsonIn("wg-board");
const ROWS = rowsIn(jsonIn("wg-rows"));

const adapter = createFileTree(isFileMap(FILES) ? FILES : {});
const host = createProbeHost(createRowSlot(ROWS));

const failures: string[] = [];
const warnings: string[] = [];
recordErrors(failures);
recordWarnings(warnings);

const mount = present(elementAt(".wg-host"), ".wg-host");
const registry = new WidgetRegistry({ vault: { adapter } });
let board: Board | null = null;
let writesSinceArrival = 0;

function draw(): void {
	render(
		h(WidgetSurface, {
			boardNode: mount,
			board: present(board, "the board"),
			registry,
			host,
			editing: Boolean(Reflect.get(window, "wgEditing")),
			screen: true,
			initialWidth: 1280,
			onChange: (next) => {
				writesSinceArrival += 1;
				board = next;
				draw();
			},
			onWidth: () => {},
		}),
		mount,
	);
}

function paintedHash(): string {
	const html = document.querySelector(".wg-tree-page")?.innerHTML ?? "";
	let hash = 0;
	for (let at = 0; at < html.length; at += 1) hash = (hash * 131 + html.charCodeAt(at)) % 1000000007;
	return `${html.length}:${hash}`;
}

const onScreen = (selector: string): HTMLElement[] => elementsAt(selector).filter((node) => !node.closest("[hidden]"));

function viewsOnScreen(): string[] {
	const seen: string[] = [];
	if (onScreen(".orbi-kanban").length > 0) seen.push("Kanban");
	if (onScreen(".orbi-archived-columns").length > 0) seen.push("Archived columns");
	return seen;
}

function isClipped(node: Element | null): boolean | null {
	return node ? node.scrollWidth > node.clientWidth + 1 : null;
}

const textsAt = (selector: string): (string | undefined)[] => elementsAt(selector).map((node) => textOf(node));

const valueOf = (node: Element | null): string | null =>
	node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? node.value : null;

interface ContextProbe {
	all(): unknown;
	providerOf(name: string): unknown;
}

function isContextProbe(value: unknown): value is ContextProbe {
	return isRecord(value) && typeof value["all"] === "function" && typeof value["providerOf"] === "function";
}

function read(): Readonly<Record<string, unknown>> {
	const shown = present(board, "the board");
	const context: unknown = Reflect.get(window, "wgContext");
	return {
		drawn: viewsOnScreen(),
		kanbans: onScreen(".orbi-kanban").length,
		mountedViews: document.querySelectorAll(".orbi-kanban, .orbi-archived-columns").length,
		cards: onScreen(".orbi-kanban .orbi-task-card-title").map((node) => textOf(node)),
		picker: document.querySelector(".orbi-view-tabs .ovt-pick") !== null,
		openedCard: textOf(document.querySelector(".orbi-task-dialog .otd-title")) ?? null,
		strip: textsAt(".wg-tabs .wg-tabs-tab"),
		filterGroups: textsAt(".ofp-group-head"),
		groupStrip: textsAt(".wg-tree-swap-strip .wg-tabs-tab"),
		groupSelected: textOf(document.querySelector('.wg-tree-swap-strip .wg-tabs-tab[aria-selected="true"]')) ?? null,
		kinds: elementsAt(".wg-set-pop .wg-set-sources .wg-kit-row-label").map((node) => textOf(node.firstChild)),
		popRows: textsAt(".wg-set-pop .wg-set-row .wg-kit-row-label"),
		popNote: textOf(document.querySelector(".wg-set-pop.is-open:not(.is-exiting) .wg-set-pop-note")) ?? null,
		popTitle: textOf(document.querySelector(".wg-set-pop .wg-set-pop-title")) ?? null,
		popHint: textOf(document.querySelector(".wg-set-pop .wg-set-pop-hint")) ?? null,
		popArea: valueOf(document.querySelector(".wg-set-pop textarea")),
		popError: textOf(document.querySelector(".wg-set-pop .wg-set-pop-error")) ?? null,
		applyOff: textOf(document.querySelector(".wg-set-pop button[disabled]")) ?? null,
		popFields: [...document.querySelectorAll(".wg-set-pop input")].map((node) =>
			node instanceof HTMLInputElement ? node.placeholder || node.value : undefined,
		),
		tabLabel: document.querySelector(".orbi-view-tabs .ovt-pick .wg-kit-btn-label")?.textContent ?? null,
		stray: document.querySelector(".ovg-stray")?.textContent ?? null,
		probe: document.querySelector(".wg-probe-seen")?.textContent ?? null,
		deaf: document.querySelector(".ovt-deaf")?.textContent ?? null,
		deafClipped: isClipped(
			document.querySelector(".ovt-deaf .wg-kit-btn-label") ?? document.querySelector(".ovt-deaf"),
		),
		hints: elementsAt(".wg-set-window .wg-kit-side-group")
			.filter((node) => ["Settings", "Selection"].includes(textOf(node.querySelector(".wg-kit-side-label")) ?? ""))
			.map((node) => textOf(node.querySelector(".wg-kit-side-hint")) ?? null),
		items: textsAt(".wg-kit-pop-item"),
		tabItems: textsAt(".orbi-view-tabs .wg-kit-pop-item"),
		rows: elementsAt(".wg-set-panel .wg-set-row .wg-kit-row-label")
			.filter((node) => !node.closest(".wg-set-pop"))
			.map((node) => textOf(node)),
		popItems: textsAt(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-pop-item"),
		popBoxes: textsAt(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-side-group .wg-kit-pop-item .wg-set-pop-name"),
		popGroups: textsAt(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-side-label"),
		popDraft: valueOf(document.querySelector(".wg-set-pop.is-open:not(.is-exiting) .wg-kit-field-input")),
		rowValues: elementsAt(".wg-set-panel .wg-set-row").map(
			(node) =>
				`${textOf(node.querySelector(".wg-kit-row-label"))} = ${textOf(node.querySelector(".wg-set-path")) ?? ""}`,
		),
		painted: paintedHash(),
		writes: writesSinceArrival,
		context: isContextProbe(context) ? context.all() : null,
		provider: isContextProbe(context) ? { view: context.providerOf("view"), views: context.providerOf("views") } : null,
		tiles: shown.tiles.map((tile) => ({
			id: tile.id,
			widget: tile.widget,
			settings: tile.settings ?? null,
			mounts: tile.mounts ?? null,
			props: tile.props ?? null,
			mounted: tile.mounted ?? null,
		})),
		layout: leavesOf(shown.layout).map((leaf) => `${leaf.id}@${leaf.path.join("/")}`),
		holds: swapBoxes(shown.layout).map(({ box }) => ({
			id: box.id ?? null,
			of: box.of.map((child) => ({ name: child.name ?? null, id: child.id ?? null, hidden: child.hidden === true })),
		})),
		addZones: document.querySelectorAll(".wg-tree-add").length,
		failures,
		warnings,
	};
}

function report(payload: unknown): void {
	present(document.getElementById("wg-measure"), "#wg-measure").textContent = JSON.stringify(payload);
}

Object.assign(window, { wgRead: read, wgReport: report });

interface PressStep {
	readonly name?: unknown;
	readonly within?: unknown;
	readonly click?: unknown;
	readonly said?: unknown;
	readonly saying?: unknown;
	readonly type?: unknown;
}

function stepsAsked(): PressStep[] {
	const asked: unknown = Reflect.get(window, "wgSteps");
	return Array.isArray(asked) ? asked.filter(isRecord) : [];
}

function scopeOf(step: PressStep): ParentNode | null | undefined {
	if (!step.within) return document;
	return document.querySelector(String(step.within))?.closest(".wg-tile");
}

function press(step: PressStep): boolean {
	const root = scopeOf(step);
	const nodes = root ? elementsAt(String(step.click), root) : [];
	const text = (one: HTMLElement): string => one.textContent ?? "";
	const isNamed = (one: HTMLElement): boolean =>
		step.said ? text(one).trim() === step.said : text(one).includes(String(step.saying));
	const node = step.said || step.saying ? nodes.find(isNamed) : nodes[0];
	if (!node) return false;
	if (typeof step.type === "string" && node.isContentEditable) {
		node.textContent = step.type;
		node.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
		return true;
	}
	if (typeof step.type === "string") {
		if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) node.value = step.type;
		node.dispatchEvent(new window.Event("input", { bubbles: true }));
		return true;
	}
	node.click();
	return true;
}

function rest(run: () => void): Promise<void> {
	return new Promise((done) => {
		run();
		setTimeout(done, 300);
	});
}

function nameDeclaredFor(id: string): string | null {
	const name = declaredName(registry, id);
	return typeof name === "string" ? name : null;
}

async function walk(): Promise<void> {
	board = normalizeBoard(BOARD, (id) => id, nameDeclaredFor);
	draw();
	await rest(() => {});
	const seen: Record<string, unknown> = { arrival: read() };
	for (const step of stepsAsked()) {
		let hit = false;
		await rest(() => {
			hit = press(step);
		});
		seen[String(step.name)] = { ...read(), pressed: hit };
	}
	report(seen);
}

registry.load().then(walk);

window.addEventListener("error", (event) => failures.push(String(event.message)));

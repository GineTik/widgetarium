import "./packs-registered.ts";
import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { Board } from "../packages/core/src/model.js";
import type { MergedEntry } from "../packages/core/src/catalogue-entries.ts";
import type { CataloguePort } from "../packages/core/src/engine/catalogue-port.ts";
import { INSTALL_JOBS } from "../packages/core/src/engine/install-jobs.ts";
import { CATALOGUE_REQUESTS } from "../packages/core/src/engine/catalogue-requests.ts";
import { placeWidget } from "../packages/core/src/surface/drop-receivers.ts";
import { TEMPLATES } from "../packages/core/src/templates.js";
import { createProbeHost, createRowSlot } from "./vault-fixture.ts";
import { boom, filesAdapter, pageFiles, pageGlobal, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

function entryOf(id: string, title: string, description: string, installed: boolean): MergedEntry {
	const manifest = { id, title, description, keywords: [] };
	return { definition: { manifest, installed }, offer: null, manifest, installed, update: null };
}

const ENTRIES = [
	entryOf(
		"@default/metric-total",
		"Metric total",
		"A running total over a window, the curve or bars behind it, and the day's own reading.",
		true,
	),
	entryOf(
		"@default/kanban-board",
		"Kanban board",
		"Draws tasks as cards in columns and moves them between columns by drag.",
		true,
	),
	entryOf("@default/streak", "Habit streak", "How many days in a row a habit held.", false),
	...Array.from({ length: 27 }, (_, at) =>
		entryOf(`@demo/probe-${at}`, `Probe ${at}`, "A card that only fills the list.", false),
	),
];

const port: CataloguePort = {
	can: true,
	entries: async () => ENTRIES,
	entryOf: (widget) => ENTRIES.find((entry) => entry.manifest["id"] === widget) ?? null,
	templates: () => TEMPLATES,
	install: async () => ({ ok: true }),
	uninstall: async () => ({ ok: true }),
	applyTemplate: async () => ({ ok: true }),
	place: placeWidget,
	openView: () => undefined,
	subscribe: () => () => undefined,
	jobs: INSTALL_JOBS,
	requests: CATALOGUE_REQUESTS,
	previewRegistry: null,
	previewHost: null,
};

const node = document.getElementById("host");
const registry = new WidgetRegistry({ vault: { adapter: filesAdapter(pageFiles()) } });
let board: Board = normalizeBoard(pageGlobal("__BOARD__"));

function draw(): void {
	if (!node) return;
	render(
		h(WidgetSurface, {
			board,
			boardNode: node,
			registry,
			host: { ...createProbeHost(createRowSlot([])), catalogue: port },
			editing: false,
			isReadOnly: true,
			screen: true,
			initialWidth: node.clientWidth,
			onChange: (next: Board) => {
				board = next;
				draw();
			},
		}),
		node,
	);
}

registry
	.load()
	.then(draw)
	.catch((failure: unknown) => boom(`load: ${stackOf(failure)}`));

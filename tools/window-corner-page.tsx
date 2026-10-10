import "./packs-registered.ts";
import { createElement as h } from "react";
import { render } from "../packages/core/src/engine/render.js";
import { WidgetSurface } from "../packages/core/src/surface.js";
import { WidgetRegistry } from "../packages/core/src/registry.js";
import { normalizeBoard } from "../packages/core/src/model.js";
import type { AppsPort, HostApp } from "../packages/core/src/engine/apps-port.ts";
import { cornerBoardOf } from "../apps/obsidian/src/corner-board.ts";
import type { CornerSide } from "../apps/obsidian/src/corner-board.ts";
import { createProbeHost, createRowSlot } from "./vault-fixture.ts";
import { boom, filesAdapter, pageFiles, pageGlobal, reportsFailures, stackOf } from "./page-harness.ts";

reportsFailures();

const APPS: readonly HostApp[] = [
	{ id: "Reading list", name: "Reading list", pages: 3, firstPage: "Reading now" },
	{ id: "CRM", name: "CRM", pages: 2, firstPage: "People" },
];

const asked: string[] = [];

const apps: AppsPort = {
	can: true,
	list: async () => (pageGlobal("__NO_APPS__") === true ? [] : APPS),
	open: async (id) => void asked.push(`open ${id}`),
	create: async () => void asked.push("create"),
	editInCanvas: async (id) => void asked.push(`edit ${id}`),
	toggleAssistant: async () => void asked.push("assistant"),
	subscribe: () => () => undefined,
};

Reflect.set(window, "__ASKED__", asked);

const registry = new WidgetRegistry({ vault: { adapter: filesAdapter(pageFiles()) } });
const host = { ...createProbeHost(createRowSlot([])), apps };

function drawCorner(side: CornerSide): void {
	const node = document.getElementById(side);
	if (!node) return;
	render(
		h(WidgetSurface, {
			board: normalizeBoard(cornerBoardOf(side, "Reading list", "macos")),
			boardNode: node,
			registry,
			host,
			editing: false,
			isReadOnly: true,
			onChange: () => undefined,
		}),
		node,
	);
}

registry
	.load()
	.then(() => (["left", "right"] as const).forEach(drawCorner))
	.catch((failure: unknown) => boom(`load: ${stackOf(failure)}`));

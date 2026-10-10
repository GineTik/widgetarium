import { MarkdownView } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { appScreenOfNote } from "./app-of-note.js";
import { WindowCorner } from "./window-corner.js";
import type WidgetariumPlugin from "./main.js";

interface DrawnCorners {
	readonly app: string;
	readonly node: HTMLElement;
}

const APP_WINDOW_CLASS = "wg-app-window";
const CORNERS_CLASS = "wg-window-corners";

export function keepAppWindows(plugin: WidgetariumPlugin): void {
	const drawn = new Map<HTMLElement, DrawnCorners>();
	const sync = (): void => void syncAppWindows(plugin, drawn);
	plugin.registerEvent(plugin.app.workspace.on("layout-change", sync));
	plugin.registerEvent(plugin.app.workspace.on("file-open", sync));
	plugin.register(() => [...drawn.keys()].forEach((container) => takeCornersOff(drawn, container)));
	void plugin.started.then(sync);
}

async function syncAppWindows(plugin: WidgetariumPlugin, drawn: Map<HTMLElement, DrawnCorners>): Promise<void> {
	const views = plugin.app.workspace
		.getLeavesOfType("markdown")
		.flatMap((leaf) => (leaf.view instanceof MarkdownView ? [leaf.view] : []));
	const shown = new Set(views.map((view) => view.containerEl));
	for (const container of drawn.keys()) if (!shown.has(container)) takeCornersOff(drawn, container);
	for (const view of views) {
		const screen = view.file ? await appScreenOfNote(plugin.app.vault.adapter, view.file.path) : null;
		if (!screen) takeCornersOff(drawn, view.containerEl);
		else if (drawn.get(view.containerEl)?.app !== screen.app) putCornersOn(plugin, drawn, view.containerEl, screen.app);
	}
}

function putCornersOn(
	plugin: WidgetariumPlugin,
	drawn: Map<HTMLElement, DrawnCorners>,
	container: HTMLElement,
	app: string,
): void {
	takeCornersOff(drawn, container);
	const node = container.createDiv({ cls: CORNERS_CLASS });
	const drawing = { app, registry: plugin.registry, host: plugin.host };
	render(
		[
			h(WindowCorner, { key: "left", side: "left", ...drawing }),
			h(WindowCorner, { key: "right", side: "right", ...drawing }),
		],
		node,
	);
	container.addClass(APP_WINDOW_CLASS);
	drawn.set(container, { app, node });
}

function takeCornersOff(drawn: Map<HTMLElement, DrawnCorners>, container: HTMLElement): void {
	const held = drawn.get(container);
	container.removeClass(APP_WINDOW_CLASS);
	if (!held) return;
	render(null, held.node);
	held.node.remove();
	drawn.delete(container);
}

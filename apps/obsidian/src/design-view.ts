import { ItemView, parseYaml } from "obsidian";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { findBlocks } from "@widgetarium/core/block-writer.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { designPathOf, readDesign, screenPathOf, statesOf, vaultBindingOf } from "@widgetarium/core/app-design.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { DesignCanvas } from "./design-canvas.js";
import type { DrawnScreen, DrawnState } from "./design-canvas-shapes.js";
import type WidgetariumPlugin from "./main.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";
const NO_BOARD = "{name} holds no widgetarium board";
const BOUND_TO_VAULT =
	"{name} reads the vault ({binding}): a design is drawn from sample rows only. Ask the agent to redraw it.";
const DESIGN_POLL_MS = 1500;
const NO_DESIGN = "{app} has no design yet, or it was removed.";

export class DesignView extends ItemView {
	private appName = "";
	private node: HTMLElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: WidgetariumPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return DESIGN_VIEW_TYPE;
	}

	getDisplayText(): string {
		return TITLE.replace("{app}", this.appName);
	}

	override getIcon(): string {
		return "layout-dashboard";
	}

	override getState(): Record<string, unknown> {
		return { app: this.appName };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.appName = isObject(state) && typeof state["app"] === "string" ? state["app"] : "";
		await super.setState(state, result);
		refreshHeader(this.leaf);
		await this.draw();
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-design-view");
		this.node = this.contentEl.createDiv({ cls: "wg-mount wg-design-mount" });
		shieldFromEditor(this.node);
		await this.plugin.started;
		const watched = new ResizeObserver(() => void this.draw());
		watched.observe(this.contentEl);
		this.register(() => watched.disconnect());
		this.registerInterval(window.setInterval(() => void this.redrawWhenChanged(), DESIGN_POLL_MS));
		await this.draw();
	}

	private seen = "";

	private async redrawWhenChanged(): Promise<void> {
		if (!this.appName) return;
		const stat = await this.plugin.app.vault.adapter.stat(designPathOf(this.appName)).catch(() => null);
		const now = String(stat?.mtime ?? "");
		if (this.seen !== "" && now !== this.seen) await this.draw();
		this.seen = now;
	}

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}

	private async draw(): Promise<void> {
		const node = this.node;
		const size = { width: this.contentEl.clientWidth, height: this.contentEl.clientHeight };
		if (!node || !this.appName || size.width === 0 || size.height === 0) return;
		const screens = await screensOf(this.plugin, this.appName);
		render(
			h(DesignCanvas, { app: this.appName, screens, size, registry: this.plugin.registry, host: this.plugin.host }),
			node,
		);
	}
}

export function registerDesignView(plugin: WidgetariumPlugin): void {
	plugin.registerView(DESIGN_VIEW_TYPE, (leaf) => new DesignView(leaf, plugin));
}

export async function openDesign(obsidian: App, app: string): Promise<void> {
	const open = obsidian.workspace.getLeavesOfType(DESIGN_VIEW_TYPE).find((held) => held.view.getState()["app"] === app);
	const leaf = open ?? obsidian.workspace.getLeaf("tab");
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { app } });
	await obsidian.workspace.revealLeaf(leaf);
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}

async function screensOf(plugin: WidgetariumPlugin, app: string): Promise<DrawnScreen[]> {
	const adapter = plugin.app.vault.adapter;
	const text = await adapter.read(designPathOf(app)).catch(() => null);
	if (text === null)
		return [{ name: app, states: [{ name: app, board: null, refusal: NO_DESIGN.replace("{app}", app) }] }];
	const read = readDesign(text);
	if (read.refusal !== undefined) return [{ name: app, states: [{ name: app, board: null, refusal: read.refusal }] }];
	return Promise.all(
		read.design.screens.map(async (screen) => ({
			name: screen.name,
			states: await Promise.all(statesOf(screen).map((state) => stateOf(plugin, app, state))),
		})),
	);
}

async function stateOf(
	plugin: WidgetariumPlugin,
	app: string,
	state: { name: string; file: string },
): Promise<DrawnState> {
	const text = await plugin.app.vault.adapter.read(screenPathOf(app, state.file)).catch(() => "");
	const board = boardIn(text);
	if (!board) return { name: state.name, board, refusal: NO_BOARD.replace("{name}", state.file) };
	const binding = vaultBindingOf(board);
	if (binding)
		return {
			name: state.name,
			board: null,
			refusal: BOUND_TO_VAULT.replace("{name}", state.file).replace("{binding}", binding),
		};
	return { name: state.name, board };
}

function boardIn(text: string): Board | null {
	const lines = text.split("\n");
	const [block] = findBlocks(lines);
	if (!block) return null;
	try {
		return normalizeBoard(parseYaml(lines.slice(block.start + 1, block.end).join("\n")));
	} catch {
		return null;
	}
}

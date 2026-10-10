import { ItemView } from "obsidian";
import type { App, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import type { DesignPort } from "@widgetarium/core/engine/design-port.js";
import { isObject } from "@widgetarium/core/engine/is-object.js";
import { DESIGN_OPENED_ON, DesignStage } from "widgetarium/studio";
import type { DesignViewState } from "widgetarium/studio";
import { obsidianDesignPort } from "./design-port-obsidian.js";
import type WidgetariumPlugin from "./main.js";

export const DESIGN_VIEW_TYPE = "widgetarium-design";

const TITLE = "Design · {app}";

export class DesignView extends ItemView {
	private appName = "";
	private fromNote = "";
	private view: DesignViewState = DESIGN_OPENED_ON;
	private node: HTMLElement | null = null;
	private readonly port: DesignPort;
	private readonly onView = (view: DesignViewState): void => {
		this.view = view;
		this.app.workspace.requestSaveLayout();
		this.draw();
	};
	private readonly ownsPaste = (): boolean => this.app.workspace.getActiveViewOfType(DesignView) === this;
	private readonly fieldOf = (): HTMLElement | null =>
		this.node?.querySelector<HTMLElement>(".wg-design-field") ?? null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: WidgetariumPlugin,
	) {
		super(leaf);
		this.port = obsidianDesignPort(plugin, { leafOf: () => this.leaf, fromNote: () => this.fromNote });
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
		const { page, isLayersOpen, mode } = this.view;
		return { app: this.appName, page, fromNote: this.fromNote, layers: isLayersOpen, mode };
	}

	override async setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.appName = textIn(state, "app");
		this.fromNote = textIn(state, "fromNote");
		this.view = {
			page: textIn(state, "page"),
			isLayersOpen: isObject(state) && state["layers"] === true,
			mode: isObject(state) && state["mode"] === "pointer" ? "pointer" : "hand",
		};
		await super.setState(state, result);
		refreshHeader(this.leaf);
		this.draw();
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-design-view");
		this.node = this.contentEl.createDiv({ cls: "wg-mount wg-design-mount wg-portal" });
		shieldFromEditor(this.node);
		await this.plugin.started;
		const watched = new ResizeObserver(() => this.draw());
		watched.observe(this.contentEl);
		this.register(() => watched.disconnect());
		this.draw();
	}

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}

	private draw(): void {
		const node = this.node;
		const size = { width: this.contentEl.clientWidth, height: this.contentEl.clientHeight };
		if (!node || !this.appName || size.width === 0 || size.height === 0) return;
		const { port, view, onView, fieldOf, ownsPaste } = this;
		render(
			h(DesignStage, { key: this.appName, port, app: this.appName, view, onView, size, fieldOf, ownsPaste }),
			node,
		);
	}
}

export function registerDesignView(plugin: WidgetariumPlugin): void {
	plugin.registerView(DESIGN_VIEW_TYPE, (leaf) => new DesignView(leaf, plugin));
}

export async function openDesignInLeaf(
	leaf: WorkspaceLeaf,
	app: string,
	page: string,
	fromNote: string,
): Promise<void> {
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { app, page, fromNote } });
}

export async function openDesign(obsidian: App, app: string, page?: string): Promise<void> {
	const open = obsidian.workspace.getLeavesOfType(DESIGN_VIEW_TYPE).find((held) => held.view.getState()["app"] === app);
	const leaf = open ?? obsidian.workspace.getLeaf("tab");
	const kept = open?.view.getState() ?? {};
	await leaf.setViewState({ type: DESIGN_VIEW_TYPE, active: true, state: { ...kept, app, ...(page ? { page } : {}) } });
	await obsidian.workspace.revealLeaf(leaf);
}

function textIn(state: unknown, key: string): string {
	const value = isObject(state) ? state[key] : undefined;
	return typeof value === "string" ? value : "";
}

function refreshHeader(leaf: unknown): void {
	if (isObject(leaf) && typeof leaf["updateHeader"] === "function") Reflect.apply(leaf["updateHeader"], leaf, []);
}

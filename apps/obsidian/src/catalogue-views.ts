import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { CATALOGUE_REQUESTS } from "@widgetarium/core/engine/catalogue-requests.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { CatalogueBoard, studioFrameOf } from "@widgetarium/studio";
import type { CatalogueBoardName } from "@widgetarium/studio";
import type WidgetariumPlugin from "./main.js";

export const CATALOGUE_VIEW_TYPE = "widgetarium-catalogue";
export const DOCS_VIEW_TYPE = "widgetarium-docs";

interface BoardViewSpec {
	readonly type: string;
	readonly title: string;
	readonly icon: string;
	readonly board: CatalogueBoardName;
}

const CATALOGUE_SPEC: BoardViewSpec = {
	type: CATALOGUE_VIEW_TYPE,
	title: "Widget catalogue",
	icon: "layout-grid",
	board: "catalogue",
};

const DOCS_SPEC: BoardViewSpec = {
	type: DOCS_VIEW_TYPE,
	title: "Widgetarium docs",
	icon: "book-open",
	board: "docs",
};

let sidebarAsk: number | null = null;

export abstract class BoardView extends ItemView {
	protected abstract readonly spec: BoardViewSpec;
	private node: HTMLElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: WidgetariumPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return this.spec.type;
	}

	getDisplayText(): string {
		return this.spec.title;
	}

	override getIcon(): string {
		return this.spec.icon;
	}

	override async onOpen(): Promise<void> {
		this.contentEl.addClass("wg-sidebar-board");
		this.node = this.contentEl.createDiv({ cls: "wg-mount" });
		shieldFromEditor(this.node);
		await this.plugin.started;
		this.draw();
	}

	draw(): void {
		const node = this.node;
		if (!node) return;
		render(
			h(CatalogueBoard, {
				name: this.spec.board,
				port: this.plugin.cataloguePort,
				host: this.plugin.host,
				boardNode: node,
			}),
			node,
		);
	}

	override async onClose(): Promise<void> {
		if (this.spec.type === CATALOGUE_VIEW_TYPE && sidebarAsk !== null) CATALOGUE_REQUESTS.dismiss(sidebarAsk);
		if (this.node) render(null, this.node);
		this.node = null;
	}
}

export function registerBoardViews(plugin: WidgetariumPlugin): void {
	plugin.registerView(CATALOGUE_VIEW_TYPE, (leaf) => new CatalogueView(leaf, plugin));
	plugin.registerView(DOCS_VIEW_TYPE, (leaf) => new DocsView(leaf, plugin));
	plugin.register(
		CATALOGUE_REQUESTS.onAsked((request) => {
			if (studioFrameOf(request) !== null) return;
			sidebarAsk = request.id;
			void plugin.showCatalogue();
		}),
	);
}

export async function revealBoardView(plugin: WidgetariumPlugin, type: string): Promise<void> {
	const { workspace } = plugin.app;
	const held = workspace.getLeavesOfType(type)[0];
	const leaf = held ?? workspace.getRightLeaf(false);
	if (!leaf) return;
	if (!held) await leaf.setViewState({ type, active: true });
	await workspace.revealLeaf(leaf);
}

export function redrawBoardViews(plugin: WidgetariumPlugin): void {
	for (const type of [CATALOGUE_VIEW_TYPE, DOCS_VIEW_TYPE]) {
		for (const leaf of plugin.app.workspace.getLeavesOfType(type)) {
			if (leaf.view instanceof BoardView) leaf.view.draw();
		}
	}
}

class CatalogueView extends BoardView {
	protected get spec(): BoardViewSpec {
		return CATALOGUE_SPEC;
	}
}

class DocsView extends BoardView {
	protected get spec(): BoardViewSpec {
		return DOCS_SPEC;
	}
}

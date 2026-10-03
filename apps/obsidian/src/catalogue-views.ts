import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { WidgetSurface } from "@widgetarium/core/surface.js";
import { CATALOGUE_REQUESTS } from "@widgetarium/core/engine/catalogue-requests.js";
import { shieldFromEditor } from "@widgetarium/core/editor-shield.js";
import { normalizeBoard } from "@widgetarium/core/model.js";
import type { Board } from "@widgetarium/core/model.js";
import { CATALOGUE_BOARD, DOCS_BOARD } from "./catalogue-boards.js";
import type WidgetariumPlugin from "./main.js";

export const CATALOGUE_VIEW_TYPE = "widgetarium-catalogue";
export const DOCS_VIEW_TYPE = "widgetarium-docs";

interface BoardViewSpec {
	readonly type: string;
	readonly title: string;
	readonly icon: string;
	readonly board: unknown;
}

const CATALOGUE_SPEC: BoardViewSpec = {
	type: CATALOGUE_VIEW_TYPE,
	title: "Widget catalogue",
	icon: "layout-grid",
	board: CATALOGUE_BOARD,
};

const DOCS_SPEC: BoardViewSpec = {
	type: DOCS_VIEW_TYPE,
	title: "Widgetarium docs",
	icon: "book-open",
	board: DOCS_BOARD,
};

export abstract class BoardView extends ItemView {
	protected abstract readonly spec: BoardViewSpec;
	private node: HTMLElement | null = null;
	private board: Board | null = null;
	private width = 0;

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
		this.board = normalizeBoard(this.spec.board);
		this.draw();
	}

	draw(): void {
		const node = this.node;
		if (!node || !this.board) return;
		render(
			h(WidgetSurface, {
				board: this.board,
				boardNode: node,
				registry: this.plugin.registry,
				host: this.plugin.host,
				editing: false,
				isReadOnly: true,
				screen: true,
				initialWidth: this.width,
				onWidth: (width) => {
					this.width = width;
				},
				onChange: (next: Board) => {
					this.board = next;
					this.draw();
				},
			}),
			node,
		);
	}

	override async onClose(): Promise<void> {
		if (this.spec.type === CATALOGUE_VIEW_TYPE) CATALOGUE_REQUESTS.answer(null);
		if (this.node) render(null, this.node);
		this.node = null;
	}
}

export function registerBoardViews(plugin: WidgetariumPlugin): void {
	plugin.registerView(CATALOGUE_VIEW_TYPE, (leaf) => new CatalogueView(leaf, plugin));
	plugin.registerView(DOCS_VIEW_TYPE, (leaf) => new DocsView(leaf, plugin));
	plugin.register(CATALOGUE_REQUESTS.onAsked(() => void plugin.showCatalogue()));
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

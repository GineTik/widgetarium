import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { AssistantChat } from "widgetarium/studio";
import type { ObsidianAssistantPort } from "./assistant-port-obsidian.js";

export const AI_VIEW_TYPE = "widgetarium-ai";
export const AI_VIEW_TITLE = "Widgetarium AI";
export const AI_VIEW_ICON = "sparkles";

export class AssistantView extends ItemView {
	private node: HTMLElement | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly port: ObsidianAssistantPort,
	) {
		super(leaf);
	}

	getViewType(): string {
		return AI_VIEW_TYPE;
	}

	getDisplayText(): string {
		return AI_VIEW_TITLE;
	}

	override getIcon(): string {
		return AI_VIEW_ICON;
	}

	override async onOpen(): Promise<void> {
		const node = this.contentEl.createDiv({ cls: "wg-root wg-ai-host" });
		this.node = node;
		const setup = await this.port.setup().catch(() => undefined);
		if (this.node === node) render(h(AssistantChat, { port: this.port, setup }), node);
	}

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}
}

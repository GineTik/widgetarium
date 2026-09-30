import { ItemView } from "obsidian";
import type { WorkspaceLeaf } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { AiChat } from "./chat.js";
import type { Assistant } from "./assistant.js";

export const AI_VIEW_TYPE = "widgetarium-ai";
export const AI_VIEW_TITLE = "Widgetarium AI";
export const AI_VIEW_ICON = "sparkles";

export class AssistantView extends ItemView {
	private readonly assistant: Assistant;
	private node: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, assistant: Assistant) {
		super(leaf);
		this.assistant = assistant;
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
		this.node = this.contentEl.createDiv({ cls: "wg-root wg-ai-host" });
		await this.draw();
	}

	async draw(): Promise<void> {
		if (!this.node) return;
		const ai = await this.assistant.state();
		render(
			h(AiChat, {
				session: this.assistant.session,
				ai,
				onChoose: async (id: string) => {
					await this.assistant.settings.choose(id);
					await this.draw();
				},
				onOpenProviders: () => this.assistant.openProviders(),
			}),
			this.node,
		);
	}

	override async onClose(): Promise<void> {
		if (this.node) render(null, this.node);
		this.node = null;
	}
}

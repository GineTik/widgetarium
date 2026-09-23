import { ItemView } from "obsidian";
import { createElement as h } from "react";
import { render } from "@widgetarium/core/engine/render.js";
import { AiChat } from "./chat.js";

export const AI_VIEW_TYPE = "widgetarium-ai";
export const AI_VIEW_TITLE = "Widgetarium AI";
export const AI_VIEW_ICON = "sparkles";

export class AssistantView extends ItemView {
	constructor(leaf, assistant) {
		super(leaf);
		this.assistant = assistant;
	}

	getViewType() {
		return AI_VIEW_TYPE;
	}

	getDisplayText() {
		return AI_VIEW_TITLE;
	}

	getIcon() {
		return AI_VIEW_ICON;
	}

	async onOpen() {
		this.node = this.contentEl.createDiv({ cls: "wg-root wg-ai-host" });
		await this.draw();
	}

	async draw() {
		if (!this.node) return;
		const ai = await this.assistant.state();
		render(
			h(AiChat, {
				session: this.assistant.session,
				ai,
				onChoose: async (id) => {
					await this.assistant.settings.choose(id);
					await this.draw();
				},
				onOpenProviders: () => this.assistant.openProviders(),
			}),
			this.node,
		);
	}

	async onClose() {
		if (this.node) render(null, this.node);
		this.node = null;
	}
}

import { parse, stringify } from "yaml";

export interface RenderCall {
	readonly app: unknown;
	readonly markdown: unknown;
	readonly el: HTMLElement;
	readonly sourcePath: unknown;
	readonly component: unknown;
}

export class TAbstractFile {}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice {
	message: unknown;
	constructor(message: unknown) {
		this.message = message;
	}
}
export class Plugin {
	_data: unknown = null;
	async loadData(): Promise<unknown> {
		return this._data ?? null;
	}
	async saveData(data: unknown): Promise<void> {
		this._data = data;
	}
	register(): void {}
	registerEvent(): void {}
}
export class Modal {}
export class ItemView {
	leaf: unknown;
	constructor(leaf: unknown) {
		this.leaf = leaf;
	}
}
export class MarkdownView extends ItemView {}
export class PluginSettingTab {
	app: unknown;
	plugin: unknown;
	constructor(app: unknown, plugin: unknown) {
		this.app = app;
		this.plugin = plugin;
	}
}
export class Setting {}
export class MarkdownRenderChild {
	containerEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
}
export const Platform = { isDesktopApp: true, isMobileApp: false, isMobile: false };

const FENCE = "```";
const FENCE_LANGUAGE_LINE = /^[a-z-]*\n/;

export const MarkdownRenderer = {
	calls: new Array<RenderCall>(),
	async render(
		app: unknown,
		markdown: unknown,
		el: HTMLElement,
		sourcePath: unknown,
		component: unknown,
	): Promise<void> {
		MarkdownRenderer.calls.push({ app, markdown, el, sourcePath, component });
		const text = String(markdown ?? "");
		if (!isInDocument(el) || !text.includes(FENCE)) {
			el.textContent = (el.textContent ?? "") + text;
			return;
		}
		renderFenced(text, el);
	},
};
export const setIcon = (parent: HTMLElement, iconId: string): void => {
	parent.dataset["icon"] = iconId;
};
export const requestUrl = (): never => {
	throw new Error("requestUrl is not stubbed");
};
export const getAllTags = (): string[] => [];
export const parseYaml = (text: string): unknown => parse(text);
export const stringifyYaml = (value: unknown): string => stringify(value);

function isInDocument(el: HTMLElement): boolean {
	const held: Document | null | undefined = el.ownerDocument;
	return held !== null && held !== undefined;
}

function renderFenced(text: string, el: HTMLElement): void {
	text.split(FENCE).forEach((part, at) => {
		const fenced = at % 2 === 1;
		const block = el.ownerDocument.createElement(fenced ? "pre" : "p");
		if (!fenced) block.textContent = part;
		else block.appendChild(el.ownerDocument.createElement("code")).textContent = part.replace(FENCE_LANGUAGE_LINE, "");
		if (fenced) block.appendChild(el.ownerDocument.createElement("button")).className = "copy-code-button";
		el.appendChild(block);
	});
}

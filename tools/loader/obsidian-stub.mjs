import { parse, stringify } from "yaml";

export class TAbstractFile {}
export class TFile extends TAbstractFile {}
export class TFolder extends TAbstractFile {}
export class Notice {
	constructor(message) {
		this.message = message;
	}
}
export class Plugin {
	async loadData() {
		return this._data ?? null;
	}
	async saveData(data) {
		this._data = data;
	}
	register() {}
	registerEvent() {}
}
export class Modal {}
export class ItemView {
	constructor(leaf) {
		this.leaf = leaf;
	}
}
export class PluginSettingTab {
	constructor(app, plugin) {
		this.app = app;
		this.plugin = plugin;
	}
}
export class Setting {}
export class MarkdownRenderChild {
	constructor(containerEl) {
		this.containerEl = containerEl;
	}
}
export const Platform = { isDesktopApp: true, isMobileApp: false, isMobile: false };

const FENCE = "```";

function renderFenced(text, el) {
	text.split(FENCE).forEach((part, at) => {
		const fenced = at % 2 === 1;
		const block = el.ownerDocument.createElement(fenced ? "pre" : "p");
		if (!fenced) block.textContent = part;
		else block.appendChild(el.ownerDocument.createElement("code")).textContent = part.replace(/^[a-z-]*\n/, "");
		if (fenced) block.appendChild(el.ownerDocument.createElement("button")).className = "copy-code-button";
		el.appendChild(block);
	});
}

export const MarkdownRenderer = {
	calls: [],
	async render(app, markdown, el, sourcePath, component) {
		MarkdownRenderer.calls.push({ app, markdown, el, sourcePath, component });
		const text = String(markdown ?? "");
		if (!el.ownerDocument || !text.includes(FENCE)) {
			el.textContent = (el.textContent ?? "") + text;
			return;
		}
		renderFenced(text, el);
	},
};
export const setIcon = (parent, iconId) => {
	parent.dataset.icon = iconId;
};
export const requestUrl = () => {
	throw new Error("requestUrl is not stubbed");
};
export const parseYaml = (text) => parse(text);
export const stringifyYaml = (value) => stringify(value);

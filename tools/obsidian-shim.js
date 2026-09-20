// CONTEXT: a photograph mounts the real modules, and they import Obsidian's names — this is the
// smallest stand-in that lets them load, never a reimplementation of anything they call
export class TFile {}
export class TFolder {}
export class Notice {}
export class MarkdownRenderChild {
	constructor(containerEl) {
		this.containerEl = containerEl;
	}
	onunload() {}
}
export const MarkdownRenderer = { render: async () => {} };
export const Platform = { isDesktopApp: true, isMobileApp: false, isMobile: false };
export const setIcon = () => {};
export const requestUrl = async () => ({ status: 0, text: "", json: null });

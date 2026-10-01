export class TFile {}
export class TFolder {}
export class Notice {}
export class MarkdownRenderChild {
	readonly containerEl: HTMLElement;
	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}
	onunload(): void {}
}
export const MarkdownRenderer = { render: async (): Promise<void> => {} };
export const Platform = { isDesktopApp: true, isMobileApp: false, isMobile: false };
export const setIcon = (): void => {};
export const requestUrl = async () => ({ status: 0, text: "", json: null });

import type { ProjectApp } from "@widgetarium/core/project/index.js";

export interface AppHeadTag {
	readonly tag: string;
	readonly attrs?: Readonly<Record<string, string>>;
	readonly children?: string;
	readonly injectTo: "head";
}

// TRADE-OFF: assumes vite's default publicDir; reading the resolved config would cost a stateful hook.
const PUBLIC_FOLDER = "public/";
const ICON_TYPES: Readonly<Record<string, string>> = {
	svg: "image/svg+xml",
	png: "image/png",
	ico: "image/x-icon",
	webp: "image/webp",
};
const HTML_ESCAPES: Readonly<Record<string, string>> = { "&": "&amp;", "<": "&lt;", ">": "&gt;" };

export function publicIconHrefOf(icon: string): string | null {
	return icon.startsWith(PUBLIC_FOLDER) ? `/${icon.slice(PUBLIC_FOLDER.length)}` : null;
}

export function appHeadTagsOf(app: ProjectApp): AppHeadTag[] {
	return [
		{ tag: "title", children: escapeText(app.name), injectTo: "head" },
		{ tag: "meta", attrs: { name: "application-name", content: app.name }, injectTo: "head" },
		{ tag: "link", attrs: iconAttrsOf(app.icon), injectTo: "head" },
	];
}

function iconAttrsOf(icon: string): Record<string, string> {
	const type = ICON_TYPES[icon.slice(icon.lastIndexOf(".") + 1).toLowerCase()];
	const href = publicIconHrefOf(icon) ?? `/${icon}`;
	return type === undefined ? { rel: "icon", href } : { rel: "icon", type, href };
}

function escapeText(text: string): string {
	return text.replace(/[&<>]/g, (character) => HTML_ESCAPES[character] ?? character);
}

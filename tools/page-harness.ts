import type { ViewHost } from "../packages/core/src/gateway/host.js";
import { NO_HOST } from "../packages/core/src/engine/host-none.js";
import { isObject } from "../packages/core/src/engine/is-object.js";
import type { FolderListing } from "../packages/core/src/engine/widget-build.js";
import type { RegistryAdapter } from "../packages/core/src/registry-reading.js";

export type PageFiles = Readonly<Record<string, string>>;

export function pageGlobal(name: string): unknown {
	const value: unknown = Reflect.get(window, name);
	return value;
}

const isFileMap = (value: unknown): value is PageFiles =>
	isObject(value) && Object.values(value).every((text) => typeof text === "string");

export function pageFiles(): PageFiles {
	const files = pageGlobal("__FILES__");
	return isFileMap(files) ? files : {};
}

export function filesAdapter(files: PageFiles): RegistryAdapter {
	return {
		async exists(path: string): Promise<boolean> {
			return Object.hasOwn(files, path) || Object.keys(files).some((key) => key.startsWith(`${path}/`));
		},
		async list(path: string): Promise<FolderListing> {
			const found: string[] = [];
			const folders = new Set<string>();
			for (const key of Object.keys(files)) {
				if (!key.startsWith(`${path}/`)) continue;
				const rest = key.slice(path.length + 1);
				const cut = rest.indexOf("/");
				if (cut === -1) found.push(key);
				else folders.add(`${path}/${rest.slice(0, cut)}`);
			}
			return { files: found, folders: [...folders] };
		},
		async read(path: string): Promise<string> {
			const text = files[path];
			if (text === undefined) throw new Error(`${path} is not among the page's files`);
			return text;
		},
	};
}

export const PAGE_HOST: ViewHost = {
	...NO_HOST,
	platform: "obsidian",
	can: { catalogue: false, fullscreen: false, subscribe: false, network: false, renderMarkdown: false },
};

export function boom(what: string): void {
	const said = document.getElementById("boom");
	if (said) said.textContent += `${what}\n`;
}

export function reportsFailures(): void {
	window.addEventListener("error", (event) => boom(`error: ${event.message}`));
	window.addEventListener("unhandledrejection", (event) => boom(`rejected: ${String(event.reason)}`));
}

export function stackOf(failure: unknown): string {
	return failure instanceof Error ? String(failure.stack) : String(failure);
}

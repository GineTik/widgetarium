import { propConfig } from "../model.js";
import { bindingOf } from "../gateway/props.js";

export const FOLDERS_SHOWN = 12;

export function boundPath(spec, config) {
	return config.path || "";
}

export function vaultPathsOf(manifest, tile) {
	const held = Object.entries(manifest?.props ?? {}).map(([name, spec]) =>
		folderRead(spec, propConfig(tile, name, spec)),
	);
	return [...new Set(held)].filter(Boolean).sort();
}

export function foldersOf(host) {
	const files = host?.app?.vault?.getAllLoadedFiles?.() ?? [];
	return files
		.filter((file) => Array.isArray(file?.children) && typeof file.path === "string" && file.path !== "/")
		.map((file) => file.path)
		.sort();
}

export function offeredPaths(host, spec) {
	return spec.kind === "value" ? notesOf(host) : foldersOf(host);
}

function folderRead(spec, config) {
	if (bindingOf(spec, config).binding === "stat") return boundPath(spec, config);
	if (spec.kind === "value" || spec.source) return "";
	if (bindingOf(spec, config).binding !== "vault") return "";
	return boundPath(spec, config);
}

function notesOf(host) {
	const files = host?.app?.vault?.getAllLoadedFiles?.() ?? [];
	return files
		.filter((file) => !Array.isArray(file?.children) && typeof file.path === "string")
		.map((file) => file.path)
		.sort();
}

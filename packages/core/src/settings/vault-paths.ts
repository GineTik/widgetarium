import { propConfig } from "../model.js";
import type { Tile, TileProp } from "../model.js";
import { bindingOf } from "../gateway/props.js";
import type { DeclaredProp } from "../gateway/props.js";
import type { PropAka } from "../held-records.js";
import { isObject } from "../engine/is-object.js";
import { textIn } from "../engine/held-text.js";

export const FOLDERS_SHOWN = 12;

export interface VaultFilesHost {
	readonly app?: { readonly vault?: { readonly getAllLoadedFiles?: () => readonly unknown[] } | null } | null;
}

export interface PathsManifest {
	readonly props?: Readonly<Record<string, DeclaredProp & PropAka>> | null | undefined;
}

interface LoadedFile {
	readonly path: string;
	readonly children?: unknown;
}

export function boundPath(config: TileProp): string {
	return textIn(config.path);
}

export function vaultPathsOf(manifest: PathsManifest | null | undefined, tile: Pick<Tile, "props">): string[] {
	const held = Object.entries(manifest?.props ?? {}).map(([name, spec]) =>
		folderToRead(spec, propConfig(tile, name, spec)),
	);
	return [...new Set(held)].filter(Boolean).sort();
}

export function foldersOf(host: VaultFilesHost | null | undefined): string[] {
	return loadedFilesOf(host)
		.filter((file) => Array.isArray(file.children) && file.path !== "/")
		.map((file) => file.path)
		.sort();
}

export function offeredPaths(host: VaultFilesHost | null | undefined, spec: DeclaredProp): string[] {
	return spec.kind === "value" ? notesOf(host) : foldersOf(host);
}

function folderToRead(spec: DeclaredProp, config: TileProp): string {
	if (bindingOf(spec, config).binding === "stat") return boundPath(config);
	if (spec.kind === "value" || spec.source) return "";
	if (bindingOf(spec, config).binding !== "vault") return "";
	return boundPath(config);
}

function notesOf(host: VaultFilesHost | null | undefined): string[] {
	return loadedFilesOf(host)
		.filter((file) => !Array.isArray(file.children))
		.map((file) => file.path)
		.sort();
}

function loadedFilesOf(host: VaultFilesHost | null | undefined): LoadedFile[] {
	return (host?.app?.vault?.getAllLoadedFiles?.() ?? []).filter(isLoadedFile);
}

function isLoadedFile(file: unknown): file is LoadedFile {
	return isObject(file) && typeof file["path"] === "string";
}

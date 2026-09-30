import { folderFor, rawUrl, readRepository } from "./github.js";
import { isInstalled } from "./catalogue-index.js";
import type { Fields } from "./catalogue-index.js";
import { WIDGETS_DIR } from "../paths.js";
import { isObject } from "./is-object.js";

export type Theme = "light" | "dark";

export interface ShotEntry {
	readonly manifest?: Fields | null;
	readonly installed?: unknown;
	readonly from?: { readonly folder?: string | null } | null;
}

export interface ShotHost {
	readonly resourcePathOf?: ((path: string) => string | null) | null;
}

export interface DeclaredShot {
	readonly [field: string]: unknown;
	readonly of: string;
}

export const SHOT_FILES: Readonly<Record<Theme, string>> = { light: "shot-light.png", dark: "shot-dark.png" };
// TODO: enforce at the reader too — an <img> cannot be capped, so a repository shot needs a HEAD read first
export const SHOT_BYTE_CAP = 300 * 1024;

const ONE_SAFE_SEGMENT = /^[A-Za-z0-9_.@-]+$/;

// TODO: the installer writes text only, so an installed widget has no shot beside it until a binary door exists
export function shotUrl(
	entry: ShotEntry | null | undefined,
	theme: unknown,
	host: ShotHost | null | undefined,
): string | null {
	const manifest = entry?.manifest ?? {};
	if (!declaredShot(manifest)) return null;

	const name = shotNameFor(theme);
	const resourcePathOf = host?.resourcePathOf;
	const atFolder = (folder: string | null | undefined): string | null =>
		folder && resourcePathOf ? resourcePathOf(`${folder}/${name}`) : null;

	if (isInstalled(entry)) return atFolder(folderFor(WIDGETS_DIR, manifest["id"]));
	if (entry?.from?.folder) return atFolder(entry.from.folder);
	return shotUrlInRepository(manifest, name);
}

export function themeNow(): Theme {
	return globalThis.document?.body?.classList?.contains("theme-dark") ? "dark" : "light";
}

export function shotNameFor(theme: unknown): string {
	return SHOT_FILES[theme === "dark" ? "dark" : "light"];
}

export function declaredShot(manifest: Fields | null | undefined): DeclaredShot | null {
	const preview = manifest?.["preview"];
	const shot = isObject(preview) ? preview["shot"] : null;
	return isDeclaredShot(shot) ? shot : null;
}

function isDeclaredShot(shot: unknown): shot is DeclaredShot {
	return isObject(shot) && typeof shot["of"] === "string";
}

// TRADE-OFF: an offer that never named its commit cannot be addressed, so its card draws live instead
function shotUrlInRepository(manifest: Fields, name: string): string | null {
	const repository = readRepository(manifest["repository"]);
	const commit = manifest["commit"];
	if (!repository || !commit) return null;
	const under = manifest["path"] ?? folderFor("", manifest["id"])?.slice(1);
	if (!under || !staysInsideTheRepositoryItNamed(under)) return null;
	if (!staysInsideTheRepositoryItNamed(commit)) return null;
	return rawUrl(repository, String(commit), `${String(under)}/${name}`);
}

function staysInsideTheRepositoryItNamed(walked: unknown): boolean {
	return String(walked ?? "")
		.split("/")
		.every((segment) => ONE_SAFE_SEGMENT.test(segment));
}

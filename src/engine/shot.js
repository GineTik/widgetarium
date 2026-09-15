import { folderFor, rawUrl, readRepository } from "./github.js";
import { isInstalled } from "./catalogue-index.js";
import { WIDGETS_DIR } from "../paths.js";

export const SHOT_FILES = { light: "shot-light.png", dark: "shot-dark.png" };
// TODO: enforce at the reader too — an <img> cannot be capped, so a repository shot needs a HEAD read first
export const SHOT_BYTE_CAP = 300 * 1024;

const ONE_SAFE_SEGMENT = /^[A-Za-z0-9_.@-]+$/;

// TODO: the installer writes text only, so an installed widget has no shot beside it until a binary door exists
export function shotUrl(entry, theme, host) {
	const manifest = entry?.manifest ?? {};
	if (!declaredShot(manifest)) return null;

	const name = shotNameFor(theme);
	const resourcePathOf = host?.resourcePathOf;
	const atFolder = (folder) => (folder && resourcePathOf ? resourcePathOf(`${folder}/${name}`) : null);

	if (isInstalled(entry)) return atFolder(folderFor(WIDGETS_DIR, manifest.id));
	if (entry?.from?.folder) return atFolder(entry.from.folder);
	return shotUrlInRepository(manifest, name);
}

export function themeNow() {
	return globalThis.document?.body?.classList?.contains("theme-dark") ? "dark" : "light";
}

export function shotNameFor(theme) {
	return SHOT_FILES[theme === "dark" ? "dark" : "light"];
}

export function declaredShot(manifest) {
	return typeof manifest?.preview?.shot?.of === "string" ? manifest.preview.shot : null;
}

// TRADE-OFF: an offer that never named its commit cannot be addressed, so its card draws live instead
function shotUrlInRepository(manifest, name) {
	const repository = readRepository(manifest.repository);
	if (!repository || !manifest.commit) return null;
	const under = manifest.path ?? folderFor("", manifest.id)?.slice(1);
	if (!under || !staysInsideTheRepositoryItNamed(under)) return null;
	if (!staysInsideTheRepositoryItNamed(manifest.commit)) return null;
	return rawUrl(repository, manifest.commit, `${under}/${name}`);
}

function staysInsideTheRepositoryItNamed(walked) {
	return String(walked ?? "")
		.split("/")
		.every((segment) => ONE_SAFE_SEGMENT.test(segment));
}

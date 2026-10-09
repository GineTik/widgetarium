import type { FolderListing } from "../engine/widget-build.js";
import { baseNameOf, type ProjectFiles } from "./project-files.js";

export interface WalkedFolder {
	readonly path: string;
	readonly listing: FolderListing;
}

const NEVER_WALKED: readonly string[] = ["node_modules", "build", "dist"];

export async function walkProject(
	files: ProjectFiles,
	root: string,
	isClosed: (folder: WalkedFolder) => boolean = () => false,
): Promise<WalkedFolder[]> {
	const folder: WalkedFolder = { path: root, listing: await files.list(root) };
	if (isClosed(folder)) return [folder];
	const inner = await Promise.all(
		folder.listing.folders.filter(isWalked).map(async (path) => walkProject(files, path, isClosed)),
	);
	return [folder, ...inner.flat()];
}

export async function filesUnder(files: ProjectFiles, root: string): Promise<string[]> {
	const folders = await walkProject(files, root);
	return folders.flatMap((folder) => folder.listing.files).sort();
}

export function namesIn(folder: WalkedFolder): string[] {
	return folder.listing.files.map(baseNameOf);
}

function isWalked(path: string): boolean {
	const name = baseNameOf(path);
	return !name.startsWith(".") && !NEVER_WALKED.includes(name);
}

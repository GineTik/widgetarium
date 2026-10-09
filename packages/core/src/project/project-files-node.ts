import type { FolderListing } from "../engine/widget-build.js";
import { EMPTY_LISTING, joinProjectPath, type ProjectFiles } from "./project-files.js";

export interface NodeEntryKind {
	isFile(): boolean;
	isDirectory(): boolean;
}

export interface NodeDirent extends NodeEntryKind {
	readonly name: string;
	isSymbolicLink(): boolean;
}

export interface NodeFileSystem {
	readFile(path: string, encoding: "utf8"): Promise<string>;
	readdir(path: string, options: { withFileTypes: true }): Promise<NodeDirent[]>;
	stat(path: string): Promise<NodeEntryKind>;
	realpath(path: string): Promise<string>;
}

type EntryKind = "file" | "folder" | "other";

const MISSING_CODES: readonly string[] = ["ENOENT", "ENOTDIR", "EISDIR", "ELOOP"];

export function nodeProjectFiles(root: string, fileSystem: NodeFileSystem): ProjectFiles {
	const absolute = (at: string): string => joinProjectPath(root, at);
	return {
		list: async (folder) => listFolder(fileSystem, absolute(folder), folder),
		read: async (at) => fileSystem.readFile(absolute(at), "utf8").catch(nullWhenMissing),
		exists: async (at) => fileSystem.stat(absolute(at)).then(() => true, falseWhenMissing),
	};
}

async function listFolder(fileSystem: NodeFileSystem, absoluteFolder: string, folder: string): Promise<FolderListing> {
	const entries = await fileSystem.readdir(absoluteFolder, { withFileTypes: true }).catch(nullWhenMissing);
	if (entries === null) return EMPTY_LISTING;
	const kinds = await Promise.all(
		entries.map(async (entry) =>
			entry.isSymbolicLink()
				? linkedKindOf(fileSystem, absoluteFolder, joinProjectPath(absoluteFolder, entry.name))
				: kindOf(entry),
		),
	);
	const named = (wanted: EntryKind): string[] =>
		entries.filter((_entry, index) => kinds[index] === wanted).map((entry) => joinProjectPath(folder, entry.name));
	return { files: named("file").sort(), folders: named("folder").sort() };
}

async function linkedKindOf(fileSystem: NodeFileSystem, absoluteFolder: string, link: string): Promise<EntryKind> {
	const target = await fileSystem.stat(link).catch(nullWhenMissing);
	if (target === null) return "other";
	if (target.isDirectory() && (await isLinkToAncestor(fileSystem, absoluteFolder, link))) return "other";
	return kindOf(target);
}

async function isLinkToAncestor(fileSystem: NodeFileSystem, absoluteFolder: string, link: string): Promise<boolean> {
	const [holder, target] = await Promise.all([fileSystem.realpath(absoluteFolder), fileSystem.realpath(link)]);
	return holder === target || holder.startsWith(`${target}/`);
}

function kindOf(entry: NodeEntryKind): EntryKind {
	if (entry.isFile()) return "file";
	if (entry.isDirectory()) return "folder";
	return "other";
}

function nullWhenMissing(error: unknown): null {
	if (isMissing(error)) return null;
	throw error;
}

function falseWhenMissing(error: unknown): false {
	if (isMissing(error)) return false;
	throw error;
}

function isMissing(error: unknown): boolean {
	return error instanceof Error && MISSING_CODES.includes(String(Reflect.get(error, "code")));
}

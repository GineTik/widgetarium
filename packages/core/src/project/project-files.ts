import type { FolderListing } from "../engine/widget-build.js";

export interface ProjectFiles {
	list(folder: string): Promise<FolderListing>;
	read(path: string): Promise<string | null>;
	exists(path: string): Promise<boolean>;
}

export const PROJECT_ROOT = "";
export const EMPTY_LISTING: FolderListing = { files: [], folders: [] };
export const TYPESCRIPT_MODULE = /\.tsx?$/;

const GENERATED_OR_TEST_MODULE = /\.d\.ts$|\.test\.tsx?$/;
const UNSAFE_SEGMENTS: readonly string[] = ["", ".", ".."];

export function joinProjectPath(folder: string, name: string): string {
	if (folder === PROJECT_ROOT) return name;
	if (name === PROJECT_ROOT) return folder;
	return `${folder}/${name}`;
}

export function isAuthoredModule(path: string): boolean {
	return TYPESCRIPT_MODULE.test(path) && !GENERATED_OR_TEST_MODULE.test(path);
}

export function isProjectRelative(path: string): boolean {
	return !path.includes("\\") && path.split("/").every((segment) => !UNSAFE_SEGMENTS.includes(segment));
}

export function baseNameOf(path: string): string {
	return path.slice(path.lastIndexOf("/") + 1);
}

export function relativePathOf(root: string, path: string): string {
	if (root === PROJECT_ROOT) return path;
	if (path === root) return PROJECT_ROOT;
	return path.slice(root.length + 1);
}

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const CATALOGUE_SCOPE = "registry/@catalogue";
const LEFT_OUT = new Set(["build", "shots"]);
const LAID = /\.(tsx?|css|json)$/;

export function catalogueWidgetFiles(): Record<string, string> {
	return Object.fromEntries(
		filesUnder(CATALOGUE_SCOPE).map((path) => [relative(CATALOGUE_SCOPE, path), readFileSync(path, "utf8")]),
	);
}

export function catalogueWidgetPaths(): string[] {
	return filesUnder(CATALOGUE_SCOPE);
}

function filesUnder(folder: string): string[] {
	return readdirSync(folder).flatMap((name) => {
		if (name.startsWith(".")) return [];
		const path = join(folder, name);
		if (statSync(path).isDirectory()) return LEFT_OUT.has(name) ? [] : filesUnder(path);
		return LAID.test(name) ? [path] : [];
	});
}

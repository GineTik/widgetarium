import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REGISTRY = "registry";
export const SYSTEM_SCOPES = ["@catalogue"] as const;
const LEFT_OUT = new Set(["build", "shots"]);
const LAID = /\.(tsx?|css|json)$/;

export function systemWidgetFiles(): Record<string, string> {
	return Object.fromEntries(systemWidgetPaths().map((path) => [relative(REGISTRY, path), readFileSync(path, "utf8")]));
}

export function systemWidgetPaths(): string[] {
	return SYSTEM_SCOPES.flatMap((scope) => filesUnder(join(REGISTRY, scope)));
}

function filesUnder(folder: string): string[] {
	return readdirSync(folder).flatMap((name) => {
		if (name.startsWith(".")) return [];
		const path = join(folder, name);
		if (statSync(path).isDirectory()) return LEFT_OUT.has(name) ? [] : filesUnder(path);
		return LAID.test(name) ? [path] : [];
	});
}

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse, type ParserPlugin } from "@babel/parser";
import type { Comment, File } from "@babel/types";
import { SKIPPED_PATHS } from "./limits.mts";

export interface ParsedSource {
	readonly lines: readonly string[];
	readonly ast: File;
	readonly comments: readonly Comment[];
	readonly isWidgetEntry: boolean;
}

export interface UnparsedSource {
	readonly failure: string;
}

const LINTABLE = /\.(js|jsx|ts|tsx|mjs|mts)$/;
const WITHOUT_JSX = /\.m?ts$/;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "generated", "dist"]);

export function collectFiles(roots: readonly string[], cwd: string): string[] {
	const found: string[] = [];
	for (const root of roots) {
		const absolute = join(cwd, root);
		if (!exists(absolute)) continue;
		if (statSync(absolute).isFile()) {
			found.push(absolute);
			continue;
		}
		walkDirectory(absolute, found);
	}
	return found
		.map((path) => relative(cwd, path).split(sep).join("/"))
		.filter(isLintable)
		.sort();
}

export function readSource(path: string, cwd: string): ParsedSource | UnparsedSource {
	const text = readFileSync(join(cwd, path), "utf8");
	const parsed = parseText(text, path);
	if (typeof parsed === "string") return { failure: parsed };
	return {
		lines: text.split("\n"),
		ast: parsed,
		comments: parsed.comments ?? [],
		isWidgetEntry: /^widgets\/.+\/widget\.tsx$/.test(path),
	};
}

function walkDirectory(directory: string, found: string[]): void {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
			walkDirectory(path, found);
			continue;
		}
		found.push(path);
	}
}

function exists(path: string): boolean {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
}

function isLintable(path: string): boolean {
	if (!LINTABLE.test(path)) return false;
	return !SKIPPED_PATHS.includes(path);
}

function parseText(text: string, path: string): File | string {
	const plugins: ParserPlugin[] = ["typescript"];
	if (!WITHOUT_JSX.test(path)) plugins.push("jsx");
	try {
		return parse(text, { sourceType: "module", errorRecovery: false, ranges: false, plugins });
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

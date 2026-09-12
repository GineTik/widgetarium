import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "@babel/parser";
import { SKIPPED_PATHS } from "./limits.mjs";

const LINTABLE = /\.(js|jsx|ts|tsx|mjs)$/;
const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "generated", "dist"]);

export function collectFiles(roots, cwd) {
	const found = [];
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

export function readSource(path, cwd) {
	const text = readFileSync(join(cwd, path), "utf8");
	const parsed = parseText(text, path);
	return {
		lines: text.split("\n"),
		ast: parsed.ast,
		comments: parsed.ast?.comments ?? [],
		failure: parsed.failure,
		isWidgetEntry: /^widgets\/.+\/widget\.tsx$/.test(path),
	};
}

function walkDirectory(directory, found) {
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

function exists(path) {
	try {
		statSync(path);
		return true;
	} catch {
		return false;
	}
}

function isLintable(path) {
	if (!LINTABLE.test(path)) return false;
	return !SKIPPED_PATHS.includes(path);
}

function parseText(text, path) {
	const plugins = ["typescript"];
	if (!path.endsWith(".ts")) plugins.push("jsx");
	try {
		return { ast: parse(text, { sourceType: "module", errorRecovery: false, ranges: false, plugins }) };
	} catch (error) {
		return { ast: null, failure: error.message };
	}
}

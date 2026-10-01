import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export function collectFiles(from: string, prefix: string, kept: RegExp): Record<string, string> {
	const into: Record<string, string> = {};
	const walk = (at: string, key: string): void => {
		for (const entry of readdirSync(at)) {
			const full = path.join(at, entry);
			const named = `${key}/${entry}`;
			if (statSync(full).isDirectory()) walk(full, named);
			else if (kept.test(entry)) into[named] = readFileSync(full, "utf8");
		}
	};
	walk(from, prefix);
	return into;
}

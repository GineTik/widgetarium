import fs from "node:fs";
import path from "node:path";

interface ForeignLine {
	readonly file: string;
	readonly line: number;
	readonly text: string;
}

const CYRILLIC = /[\u0400-\u04FF\u0500-\u052F]/;
const ROOTS = process.argv.slice(2);
const SKIP = new Set(["node_modules", ".git", "main.js"]);
const EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".mts", ".ts", ".tsx", ".css", ".json"]);
const SHOWN_AT_MOST = 40;

const found = ROOTS.flatMap((root) => walk(root, []));

if (found.length === 0) {
	console.log(`language gate: clean (${ROOTS.join(", ")})`);
	process.exit(0);
}

console.error(`language gate: BLOCKED — ${found.length} line(s) contain non-English text\n`);
for (const hit of found.slice(0, SHOWN_AT_MOST)) {
	console.error(`  ${hit.file}:${hit.line}  ${hit.text.slice(0, 100)}`);
}
if (found.length > SHOWN_AT_MOST) console.error(`  … and ${found.length - SHOWN_AT_MOST} more`);
console.error("\nEnglish only — in code, comments, UI strings and manifests.");
process.exit(1);

function walk(root: string, found: ForeignLine[]): ForeignLine[] {
	if (!fs.existsSync(root)) return found;
	if (fs.statSync(root).isFile()) return foreignLinesIn(root, found);
	for (const entry of fs.readdirSync(root)) {
		if (SKIP.has(entry)) continue;
		walk(path.join(root, entry), found);
	}
	return found;
}

function foreignLinesIn(file: string, found: ForeignLine[]): ForeignLine[] {
	if (!EXTENSIONS.has(path.extname(file))) return found;
	const lines = fs.readFileSync(file, "utf8").split("\n");
	lines.forEach((line, index) => {
		if (CYRILLIC.test(line)) found.push({ file, line: index + 1, text: line.trim() });
	});
	return found;
}

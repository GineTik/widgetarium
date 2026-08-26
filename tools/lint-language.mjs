import fs from "node:fs";
import path from "node:path";

const CYRILLIC = /[\u0400-\u04FF\u0500-\u052F]/;
const ROOTS = process.argv.slice(2);
const SKIP = new Set(["node_modules", ".git", "main.js"]);
const EXTENSIONS = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx", ".css", ".json"]);

function walk(root, found) {
	if (!fs.existsSync(root)) return found;
	const stat = fs.statSync(root);

	if (stat.isFile()) {
		if (!EXTENSIONS.has(path.extname(root))) return found;
		const lines = fs.readFileSync(root, "utf8").split("\n");
		lines.forEach((line, index) => {
			if (CYRILLIC.test(line)) found.push({ file: root, line: index + 1, text: line.trim() });
		});
		return found;
	}

	for (const entry of fs.readdirSync(root)) {
		if (SKIP.has(entry)) continue;
		walk(path.join(root, entry), found);
	}
	return found;
}

const found = ROOTS.flatMap((root) => walk(root, []));

if (found.length === 0) {
	console.log(`language gate: clean (${ROOTS.join(", ")})`);
	process.exit(0);
}

console.error(`language gate: BLOCKED — ${found.length} line(s) contain non-English text\n`);
for (const hit of found.slice(0, 40)) {
	console.error(`  ${hit.file}:${hit.line}  ${hit.text.slice(0, 100)}`);
}
if (found.length > 40) console.error(`  … and ${found.length - 40} more`);
console.error("\nEnglish only — in code, comments, UI strings and manifests.");
process.exit(1);

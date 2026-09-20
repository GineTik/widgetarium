import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const PACKAGE = "lucide-static@1.47.0";
const VIEW_BOX = "0 0 24 24";

const TABLE_FILE = path.join(process.cwd(), "src", "icon-table.js");
const NOTICE_DIR = path.join(process.cwd(), "assets", "icons");

const NOTICE = `The icon drawings in src/icon-table.js are Lucide
(https://github.com/lucide-icons/lucide), licensed under the ISC License, a copy
of which sits beside this file.

The whole set is taken, at the version named in tools/fetch-icons.mjs. What each
icon is named, and the words it also answers to, come from the same package.

Regenerate with: node tools/fetch-icons.mjs

Each body is the inside of an SVG drawn on viewBox="${VIEW_BOX}", stroked with
currentColor and carrying no fill of its own.
`;

const installDir = mkdtempSync(path.join(tmpdir(), "wg-icons-"));
writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "wg-icons", private: true }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], { cwd: installDir, stdio: "inherit" });

const packageDir = path.join(installDir, "node_modules", "lucide-static");
const read = (name) => readFileSync(path.join(packageDir, name), "utf8");
const nodes = JSON.parse(read("icon-nodes.json"));
const tags = JSON.parse(read("tags.json"));

const attributes = (held) =>
	Object.entries(held)
		.map(([name, value]) => ` ${name}="${value}"`)
		.join("");

const bodyOf = (elements) => elements.map(([tag, held]) => `<${tag}${attributes(held)}/>`).join("");

const table = {};
const spoken = {};
for (const name of Object.keys(nodes).sort()) {
	table[name] = bodyOf(nodes[name]);
	const said = (tags[name] ?? []).join(" ");
	if (said) spoken[name] = said;
}

const lines = (held) =>
	Object.entries(held)
		.map(([name, value]) => `\t${JSON.stringify(name)}: ${JSON.stringify(value)},`)
		.join("\n");

writeFileSync(
	TABLE_FILE,
	`export const ICON_VIEW_BOX = ${JSON.stringify(VIEW_BOX)};\n\nexport const ICON_TABLE = {\n${lines(table)}\n};\n\nexport const ICON_WORDS = {\n${lines(spoken)}\n};\n`,
);

mkdirSync(NOTICE_DIR, { recursive: true });
writeFileSync(path.join(NOTICE_DIR, "NOTICE"), NOTICE);
writeFileSync(path.join(NOTICE_DIR, "LICENSE"), read("LICENSE"));

console.log(`${Object.keys(table).length} icons -> src/icon-table.js`);

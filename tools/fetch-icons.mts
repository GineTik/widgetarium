import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

type IconElement = readonly [tag: string, attributes: Readonly<Record<string, unknown>>];

const PACKAGE = "lucide-static@1.47.0";
const VIEW_BOX = "0 0 24 24";

const TABLE_FILE = path.join(process.cwd(), "packages", "kit", "src", "icons", "icon-table.ts");
const NOTICE_DIR = path.join(process.cwd(), "packages", "kit", "assets", "icons");

const NOTICE = `The icon drawings in packages/kit/src/icons/icon-table.ts are Lucide
(https://github.com/lucide-icons/lucide), licensed under the ISC License, a copy
of which sits beside this file.

The whole set is taken, at the version named in tools/fetch-icons.mts. What each
icon is named, and the words it also answers to, come from the same package.

Regenerate with: node tools/fetch-icons.mts

Each body is the inside of an SVG drawn on viewBox="${VIEW_BOX}", stroked with
currentColor and carrying no fill of its own.
`;

const installDir = mkdtempSync(path.join(tmpdir(), "wg-icons-"));
writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "wg-icons", private: true }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], { cwd: installDir, stdio: "inherit" });

const packageDir = path.join(installDir, "node_modules", "lucide-static");
const read = (name: string): string => readFileSync(path.join(packageDir, name), "utf8");
const nodes = recordOf(JSON.parse(read("icon-nodes.json")), "icon-nodes.json");
const tags = recordOf(JSON.parse(read("tags.json")), "tags.json");

const table: Record<string, string> = {};
const spoken: Record<string, string> = {};
for (const name of Object.keys(nodes).sort()) {
	table[name] = bodyOf(elementsOf(nodes[name], name));
	const said = wordsOf(tags[name]).join(" ");
	if (said) spoken[name] = said;
}

writeFileSync(
	TABLE_FILE,
	`export const ICON_VIEW_BOX = ${JSON.stringify(VIEW_BOX)};\n\nexport const ICON_TABLE = {\n${lines(table)}\n};\n\nexport const ICON_WORDS = {\n${lines(spoken)}\n};\n`,
);

mkdirSync(NOTICE_DIR, { recursive: true });
writeFileSync(path.join(NOTICE_DIR, "NOTICE"), NOTICE);
writeFileSync(path.join(NOTICE_DIR, "LICENSE"), read("LICENSE"));

console.log(`${Object.keys(table).length} icons -> packages/kit/src/icons/icon-table.ts`);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown, file: string): Readonly<Record<string, unknown>> {
	if (!isRecord(value)) throw new Error(`${PACKAGE} ${file} is not an object`);
	return value;
}

function elementsOf(value: unknown, name: string): IconElement[] {
	if (!Array.isArray(value)) throw new Error(`${name} holds no element list`);
	return value.map((element: unknown): IconElement => {
		if (!Array.isArray(element)) throw new Error(`${name} holds an element that is not a pair`);
		const [tag, held]: unknown[] = element;
		if (typeof tag !== "string" || !isRecord(held)) throw new Error(`${name} holds an element without a tag`);
		return [tag, held];
	});
}

function wordsOf(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((word: unknown) => String(word));
}

function attributes(held: Readonly<Record<string, unknown>>): string {
	return Object.entries(held)
		.map(([name, value]) => ` ${name}="${String(value)}"`)
		.join("");
}

function bodyOf(elements: readonly IconElement[]): string {
	return elements.map(([tag, held]) => `<${tag}${attributes(held)}/>`).join("");
}

function lines(held: Readonly<Record<string, string>>): string {
	return Object.entries(held)
		.map(([name, value]) => `\t${JSON.stringify(name)}: ${JSON.stringify(value)},`)
		.join("\n");
}
